import {createDocument} from "@zavx0z/dom"
import {createRoot as createComponentRoot, provideContext, component, type ComponentValue} from "@zavx0z/component"
import {defineCompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {createSpaceElementFactories, readSpaceTree} from "@zavx0z/space"
import {loadDocumentDefaultFont} from "@zavx0z/engine/default-font"
import type {TrueTypeFont} from "@zavx0z/engine"
import {createAttachedRoot, type Root as Presentation, type RootRuntimeFactory} from "./src/attach.ts"
import {createRootEnvironment, rootContext} from "./src/root-context.ts"
import {claimBrowserPresentationHost} from "./src/presentation-host.ts"
import {createApplicationStyleSheets} from "./src/application-stylesheets.ts"

export interface RootOptions {
  /** Положительное конечное число. По умолчанию используется devicePixelRatio окна. */
  readonly pixelRatio?: number
  /** Получает ошибки root.render, загрузки ресурсов и запуска GPU. По умолчанию console.error. */
  readonly onUncaughtError?: (error: Error) => void
}

/** Один корень приложения. Получение кадров и диагностика доступны через browser/diagnostics. */
export interface Root {
  /** Обновляет существующее дерево; null очищает содержимое, сохраняя возможность render. */
  render(app: JsxSourceElement | ComponentValue | null): void
  /**
  Освобождает приложение. Незавершённая GPU-подготовка удерживает Canvas до cleanup.
  Повторный вызов безопасен; render после unmount запрещён.
  */
  unmount(): void
}

export interface RootInspection {
  readonly document: ReturnType<typeof createDocument>
  whenReady(): Promise<Presentation>
}

const inspections = new WeakMap<Root, RootInspection>()
const empty = defineCompiledTemplate({
  displayName: "EmptyBrowserRoot",
  bindingCount: 0,
  mount() { return {nodes: [], bindings: []} },
  render() {},
})

/**
Подключает приложение к одному native Canvas.

Содержимое задаётся через root.render(<App />). App объявляет Space, ViewPoint
и stylesheet links; JSX требует Template compiler. render не ожидает первый кадр.

@throws TypeError При неверном Canvas или pixelRatio.
@throws Error Если native страница уже имеет подключённое приложение.
@example
```tsx
const root = createRoot(canvas)
root.render(<App />)
```
*/
export function createRoot(canvas: HTMLCanvasElement, options: RootOptions = {}): Root {
  return createRootWithSeams(canvas, options, {
    loadFont: () => loadDocumentDefaultFont(canvas.ownerDocument),
    createRuntime: async (input, claim) => {
      const {createDocumentSpaceRuntime} = await import("./src/space-runtime.ts")
      return createDocumentSpaceRuntime(input, claim)
    },
    createStyleSheets: createApplicationStyleSheets,
  })
}

/** Internal seams used by lifecycle tests; not exported from the package entry. */
export function createRootWithSeams(
  canvas: HTMLCanvasElement,
  options: RootOptions,
  seams: {
    loadFont(): Promise<TrueTypeFont>
    createRuntime: RootRuntimeFactory
    createStyleSheets: typeof createApplicationStyleSheets
  },
): Root {
  if (!canvas || typeof canvas.getContext !== "function" || typeof canvas.getBoundingClientRect !== "function") {
    throw new TypeError("createRoot expects a native Canvas")
  }
  if (options.pixelRatio !== undefined && (!Number.isFinite(options.pixelRatio) || options.pixelRatio <= 0)) {
    throw new TypeError("pixelRatio must be positive and finite")
  }
  const rect = canvas.getBoundingClientRect()
  const claim = claimBrowserPresentationHost(canvas)
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const html = document.createElement("html")
  const body = document.createElement("body")
  html.append(document.createElement("head"), body)
  document.append(html)
  const environment = createRootEnvironment(document, {
    width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)),
    left: rect.left ?? 0, top: rect.top ?? 0,
    dpr: options.pixelRatio ?? canvas.ownerDocument?.defaultView?.devicePixelRatio ?? 1,
  }, "demand")
  const componentRoot = createComponentRoot(body)
  let active = true
  let updating = false
  let scheduled = false
  let driving = false
  let preparingPresentation = false
  let pending = false
  let next: JsxSourceElement | ComponentValue | null = null
  let presentation: Presentation | null = null
  let font: TrueTypeFont | null = null
  let revision = 0
  const waiters = new Set<{resolve(value: Presentation): void; reject(error: Error): void}>()
  const newReady = () => {
    const promise = new Promise<Presentation>((resolve, reject) => { waiters.add({resolve, reject}) })
    void promise.catch(() => {})
    return promise
  }
  let ready = newReady()
  const resolveReady = (value: Presentation) => {
    for (const waiter of waiters) waiter.resolve(value)
    waiters.clear()
  }
  const rejectReady = (error: Error) => {
    for (const waiter of waiters) waiter.reject(error)
    waiters.clear()
  }
  const reported = new WeakSet<Error>()
  const report = (error: Error) => {
    if (!active || reported.has(error)) return
    reported.add(error)
    if (options.onUncaughtError) options.onUncaughtError(error)
    else console.error(error)
  }
  const styles = seams.createStyleSheets(canvas, document, report)

  const drive = async () => {
    scheduled = false
    if (!active || driving) return
    driving = true
    try {
      while (active && pending) {
        pending = false
        const currentRevision = revision
        updating = true
        try {
          componentRoot.render(provideContext(rootContext, environment,
            next === null ? component(empty, {}) : next as ComponentValue))
          componentRoot.flush()
        } finally { updating = false }
        if (next === null) {
          presentation?.unmount()
          presentation = null
          environment.connect(() => {})
          rejectReady(new Error("The Browser root has no rendered application"))
          continue
        }
        const tree = readSpaceTree(document)
        environment.setFrameloop(tree.space.frameloop)
        styles.refresh()
        await styles.whenReady()
        if (!active) return
        font ??= await seams.loadFont()
        if (!active) return
        if (currentRevision !== revision) continue
        if (presentation && (presentation.space !== tree.space || presentation.viewPoint !== tree.viewPoint)) {
          presentation.unmount()
          presentation = null
        }
        if (!presentation) {
          preparingPresentation = true
          try {
            presentation = await createAttachedRoot({
              canvas,
              app: next,
              font,
              ...(options.pixelRatio === undefined ? {} : {pixelRatio: options.pixelRatio}),
            },
              document, componentRoot, environment, {release() {}}, seams.createRuntime, undefined,
              {active: () => active, updating: () => updating})
          } finally { preparingPresentation = false }
          if (!active) {
            presentation.unmount()
            presentation = null
            return
          }
        } else {
          presentation.render()
        }
        if (currentRevision === revision) {
          const current = presentation
          resolveReady(Object.freeze({
            ...current,
            get presentedFrame() { return current.presentedFrame },
            get disposed() { return current.disposed },
            unmount: root.unmount,
          }))
        }
      }
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      rejectReady(normalized)
      report(normalized)
    } finally {
      driving = false
      if (!active) claim.release()
      if (active && pending) schedule()
    }
  }
  const schedule = () => {
    if (scheduled || driving || !active) return
    scheduled = true
    queueMicrotask(() => { void drive() })
  }
  const root: Root = Object.freeze({
    render(app: JsxSourceElement | ComponentValue | null) {
      if (!active) throw new Error("Cannot update an unmounted root")
      next = app
      pending = true
      revision++
      ready = newReady()
      schedule()
    },
    unmount() {
      if (!active) return
      active = false
      pending = false
      rejectReady(new Error("Browser root was unmounted"))
      try { styles.dispose() } finally {
        updating = true
        try { componentRoot.unmount() } finally {
          updating = false
          try { presentation?.unmount() } finally {
            presentation = null
            environment.dispose()
            if (!preparingPresentation) claim.release()
          }
        }
      }
    },
  })
  inspections.set(root, {document, whenReady: () => {
    if (!active) return Promise.reject(new Error("Browser root was unmounted"))
    return ready
  }})
  return root
}

/** Internal lookup used by the separate diagnostics entry. */
export function inspectBrowserRoot(root: Root): RootInspection {
  const inspection = inspections.get(root)
  if (!inspection) throw new TypeError("Expected a Browser root")
  return inspection
}
