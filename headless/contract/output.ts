import type {Element} from "@zavx0z/dom"
import type {ComponentValue} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {CapturedFrame} from "../native-canvas.ts"

/**
Результат {@link createHeadless}: один живой host с явным освобождением ресурсов.

Все GPU-операции host сериализуются. Методы принимают только элементы его
собственного `Document`; после `dispose` новые операции завершаются ошибкой.

@property render - Монтирует скомпилированный JSX и возвращает единственный внешний Element.

@property screenshot - Возвращает PNG по актуальному border-box элемента.
Без второго аргумента результатом служит `Buffer`; формат `image` возвращает `Bun.Image` того же снимка.

@property capture - Возвращает RGBA8 и PNG одного кадра по границам элемента.

@property dispose - Освобождает component root, layout, GPU-поверхность и устройство; повторный вызов безопасен.

@example
```tsx
import {Typography} from "@zavx0z/ui/typography"

const headless = createHeadless()
const element = await headless.render(
  <Typography
    text="Пример"
  />,
)
await headless.dispose()
```
*/
export interface Headless {
  render(value: JsxSourceElement | ComponentValue): Promise<Element>
  render<Props>(type: ((props: Props) => JsxSourceElement) | CompiledTemplate<Props>, props: Props): Promise<Element>
  screenshot(element: Element): Promise<Buffer>
  screenshot(element: Element, format: "image"): Promise<Bun.Image>
  capture(element: Element): Promise<CapturedFrame>
  dispose(): Promise<void>
}
