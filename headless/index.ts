import {createGPUInstance, globalConstructors} from "bun-webgpu"
import {createDocument, type Element} from "@zavx0z/dom"
import {component, createRoot, normalizeChildren, type ComponentValue} from "@zavx0z/component"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentRenderer} from "@renderer/html"
import {Space, ViewPoint, TrueTypeFont} from "@zavx0z/engine"
import {Renderer, RendererWebGpuBackend, RendererWebGpuScreenOverlay} from "@zavx0z/webgpu"
import {NativeGpuCanvas, type CapturedFrame} from "./native-canvas.ts"
import {installShaderCompilationDiagnostics} from "./shader-diagnostics.ts"
import {registerHeadlessCompiler, repositoryRoot} from "./compiler.ts"
import type {HeadlessOptions} from "./contract/input.ts"
import type {Headless} from "./contract/output.ts"

export type {HeadlessOptions} from "./contract/input.ts"
export type {Headless} from "./contract/output.ts"

let gpuOperations: Promise<unknown> = Promise.resolve()
function exclusive<Result>(operation: () => Promise<Result>): Promise<Result> {
  const current = gpuOperations.then(operation, operation)
  gpuOperations = current.then(() => undefined, () => undefined)
  return current
}

/**
Создаёт один нативный host для компонентов любых пакетов выбранного проекта.

Test host заранее подключает `@immersive/headless/preload`, чтобы статические
TSX-импорты и JSX сценария компилировались Template. `createHeadless` идемпотентно
регистрирует тот же compiler и создаёт отдельный host. GPU-операции разных host выполняются последовательно;
глобальные WebGPU-объекты восстанавливаются после каждой операции.

@param options - Размер native Canvas и источники ресурсов окружения.
@returns Host с живым DOM, отдельным получением PNG и явным dispose.

@example
```tsx
import {Typography} from "@zavx0z/ui/typography"

const headless = createHeadless()
const element = await headless.render(
  <Typography
    text="Пример"
  />,
)
await Bun.write("typography.png", await headless.screenshot(element))
await headless.dispose()
```
*/
export function createHeadless(options: HeadlessOptions = {}): Headless {
  registerHeadlessCompiler(options.projectRoot ?? repositoryRoot(import.meta.dir))
  const width = options.width ?? 1024
  const height = options.height ?? 768
  const canvas = new NativeGpuCanvas(width, height)
  const document = createDocument()
  const host = document.createElement("div")
  document.append(host)
  const componentRoot = createRoot(host)
  const renderer = new Renderer()
  let gpu: ReturnType<typeof createGPUInstance> | undefined
  let backend: RendererWebGpuBackend | undefined
  let layout: ReturnType<typeof createDocumentRenderer> | undefined
  let ready = false
  let disposed = false
  const space = new Space()
  const viewPoint = new ViewPoint({viewport: {left: 0, top: 0, width, height}, position: {x: 0, y: -600, z: 0}})
  let overlay: RendererWebGpuScreenOverlay | undefined

  async function withGpu<Result>(operation: () => Promise<Result>): Promise<Result> {
    if (disposed) throw new Error("Headless уже освобождён")
    if (gpu === undefined) {
      gpu = createGPUInstance()
      const requestAdapter = gpu.requestAdapter.bind(gpu)
      gpu.requestAdapter = async adapterOptions => {
        const adapter = await requestAdapter(adapterOptions)
        if (adapter === null) return null
        const requestDevice = adapter.requestDevice.bind(adapter)
        adapter.requestDevice = async descriptor => {
          const device = await requestDevice(descriptor)
          installShaderCompilationDiagnostics(device)
          return device
        }
        return adapter
      }
    }
    const globals = {...globalConstructors, navigator: {gpu}}
    const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
    try {
      for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, {value, writable: true, configurable: true})
      }
      return await operation()
    } finally {
      for (const [key, descriptor] of previous) {
        if (descriptor === undefined) Reflect.deleteProperty(globalThis, key)
        else Object.defineProperty(globalThis, key, descriptor)
      }
    }
  }

  async function initialize(): Promise<void> {
    if (ready) return
    const fontSource = options.fontSource ?? new URL(import.meta.resolve("@zavx0z/engine/fonts/inter-regular.ttf"))
    const sources = options.styleSheetSources ?? [new URL(import.meta.resolve("@zavx0z/ui/themes/theme.css"))]
    const font = new TrueTypeFont(await Bun.file(fontSource).arrayBuffer())
    const styleSheets = await Promise.all(sources.map(source => Bun.file(source).text()))
    backend = new RendererWebGpuBackend({font, invalidateGeometry: geometry => renderer.invalidateGeometry(geometry)})
    layout = createDocumentRenderer({document, root: host, viewport: {width, height}, styleSheets, textMeasurer: backend.textMeasurer!})
    overlay = new RendererWebGpuScreenOverlay({content: backend.root, viewport: {width, height}})
    await renderer.init(canvas.asHtmlCanvas())
    ready = true
  }

  async function draw(): Promise<void> {
    componentRoot.flush()
    backend!.applyFrame(layout!.flush())
    const device = canvas.getContext("webgpu")!.getConfiguration()!.device
    device.pushErrorScope("validation")
    renderer.renderFrame(space, overlay, viewPoint)
    const error = await device.popErrorScope()
    if (error !== null) throw new Error(`Ошибка GPU-кадра Headless: ${error.message}`)
  }

  const capture = (element: Element): Promise<CapturedFrame> => exclusive(() => withGpu(async () => {
    if (!ready || element.ownerDocument !== document || !host.contains(element)) {
      throw new Error("Снимок доступен только для смонтированного элемента этого Headless")
    }
    await draw()
    const bounds = element.getBoundingClientRect()
    const x = Math.floor(bounds.x)
    const y = Math.floor(bounds.y)
    return canvas.capture({x, y, width: Math.ceil(bounds.right) - x, height: Math.ceil(bounds.bottom) - y})
  }))

  function screenshot(element: Element): Promise<Buffer>
  function screenshot(element: Element, format: "image"): Promise<Bun.Image>
  async function screenshot(element: Element, format?: "image"): Promise<Buffer | Bun.Image> {
    const png = (await capture(element)).png
    return format === "image" ? new Bun.Image(png) : png
  }

  return {
    render(value: unknown, props?: unknown): Promise<Element> {
      return exclusive(() => withGpu(async () => {
        await initialize()
        if (isCompiledTemplate(value)) value = component(value, props ?? {})
        const child = normalizeChildren(value as ComponentValue)
        if (child === null) throw new Error("Headless.render ожидает JSX скомпилированного компонента либо компонент с props")
        componentRoot.render(child)
        await draw()
        if (host.children.length !== 1) throw new Error("Компонент должен вернуть один внешний элемент")
        return host.firstElementChild!
      }))
    },
    capture,
    screenshot,
    dispose(): Promise<void> {
      return exclusive(async () => {
        if (disposed) return
        componentRoot.unmount()
        layout?.dispose()
        backend?.dispose()
        canvas.dispose()
        gpu?.destroy()
        host.remove()
        disposed = true
      })
    },
  }
}
