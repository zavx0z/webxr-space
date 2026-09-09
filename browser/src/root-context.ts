import {createContext, useContext, useLayoutEffect, useRef, useSyncExternalStore} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import type {SpaceElement} from "@zavx0z/dom/space"
import type {ViewPointElement} from "@zavx0z/dom/viewpoint"
import {createDocumentClipboardController, type DocumentClipboardController} from "../clipboard.ts"

/** Размер и положение Canvas в CSS px; `dpr` переводит их в пиксели буфера. */
export type RootSize = Readonly<{width: number; height: number; left: number; top: number; dpr: number}>
export type FrameLoop = "demand" | "always"

/**
Состояние подключения, доступное уже при первом выполнении App.

`document` — тот же semantic Document, в который монтируются компоненты.
`size` меняется только вместе с размером, положением Canvas или плотностью пикселей.
`invalidate` объединяет запросы: несколько вызовов до кадра дают один кадр.
*/
export type RootState = Readonly<{
  document: Document
  size: RootSize
  frameloop: FrameLoop
  clipboard: DocumentClipboardController
  invalidate(): void
}>

/** К началу кадра авторские Space и ViewPoint уже смонтированы и проверены. */
export type FrameState = RootState & Readonly<{space: SpaceElement; viewPoint: ViewPointElement}>
export type FrameCallback = (state: FrameState, delta: number) => void

export const rootContext = createContext<RootEnvironment | null>(null)

/**
Подписывает компонент на выбранную часть состояния его подключения.

Результат селектора сравнивается через `Object.is`. Для составного результата
нужно сохранять ссылку, пока его данные не изменились. Обычный контекст остаётся
стабильным: изменение размера не вызывает повторное выполнение всего App.

@throws Error При вызове вне App, смонтированного через Browser `createRoot`.
@example
```tsx
const size = useSpace(state => state.size)
```
*/
export function useSpace<Selection>(selector: (state: RootState) => Selection): Selection {
  const environment = useRootEnvironment()
  return useSyncExternalStore(environment.subscribe, () => selector(environment.read()))
}

/**
Вызывает callback перед расчётом и рисованием общего кадра.

`delta` — время с предыдущего кадра в секундах, для первого кадра равно нулю.
В режиме `demand` подписка сама не запускает непрерывную анимацию: для неё
выберите `always` либо запросите следующий кадр через `state.invalidate()`.
Изменяйте нужные semantic Elements через refs; обновление состояния компонентов
на каждом кадре не требуется. При размонтировании подписка снимается автоматически.

@throws Error При вызове вне App, смонтированного через Browser `createRoot`.
@example
```tsx
useFrame((_state, delta) => {
  if (object.current) object.current.z += delta * 100
})
```
*/
export function useFrame(callback: FrameCallback): void {
  const environment = useRootEnvironment()
  const latest = useRef(callback)
  latest.current = callback
  useLayoutEffect(() => environment.subscribeFrame((state, delta) => latest.current(state, delta)), [environment])
}

function useRootEnvironment(): RootEnvironment {
  const value = useContext(rootContext)
  if (value === null) throw new Error("Browser hooks require an App mounted with Browser createRoot")
  return value
}

export function createRootEnvironment(document: Document, size: RootSize, frameloop: FrameLoop) {
  let request = () => {}
  let disposed = false
  let previousTime: number | null = null
  let pending = false
  let inFrame = false
  const listeners = new Set<() => void>()
  const frames = new Set<FrameCallback>()
  const invalidate = () => {
    if (disposed) return
    pending = true
    if (!inFrame) request()
  }
  const clipboard = createDocumentClipboardController(document, {requestFrame: invalidate})
  let state: RootState = Object.freeze({document, size: Object.freeze({...size}), frameloop, clipboard, invalidate})
  return Object.freeze({
    read: () => state,
    pendingFrame: () => pending,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    subscribeFrame(listener: FrameCallback) {
      frames.add(listener)
      return () => { frames.delete(listener) }
    },
    connect(requestFrame: () => void) {
      request = requestFrame
      if (pending) request()
    },
    setFrameloop(frameloop: FrameLoop) {
      if (disposed || state.frameloop === frameloop) return
      state = Object.freeze({...state, frameloop})
      for (const listener of listeners) listener()
      invalidate()
    },
    resize(size: RootSize) {
      const previous = state.size
      if (disposed || previous.width === size.width && previous.height === size.height &&
        previous.left === size.left && previous.top === size.top && previous.dpr === size.dpr) return
      state = Object.freeze({...state, size: Object.freeze({...size})})
      for (const listener of listeners) listener()
    },
    frame(space: SpaceElement, viewPoint: ViewPointElement, now: number) {
      pending = false
      const delta = previousTime === null ? 0 : Math.max(0, (now - previousTime) / 1000)
      previousTime = now
      const frame: FrameState = {...state, space, viewPoint}
      inFrame = true
      try {
        document.transaction(() => {
          for (const listener of frames) listener(frame, delta)
        })
      } finally {
        inFrame = false
      }
      return delta
    },
    dispose() {
      disposed = true
      listeners.clear()
      frames.clear()
      clipboard.dispose()
      request = () => {}
    },
  })
}

export type RootEnvironment = ReturnType<typeof createRootEnvironment>
