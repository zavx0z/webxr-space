import type {
  GraphInput,
  GraphLayoutComputer,
  GraphScene,
  GraphSelection,
  GraphTransform,
  GraphViewport,
} from "../../shared/graph/contracts.ts"

/**
Входные данные общего представления графа в существующей проекции `Document`.

`scene` передаёт уже рассчитанную геометрию. Пара `input` и `layout` включает
измерение настоящих DOM-нод перед числовой раскладкой; смешивать эти режимы
нельзя. До завершения измерения представление сохраняет последнюю принятую сцену.

@property [scene] - Готовые ноды, рамки, маршруты и границы в CSS-пикселях.

@property [input] - Ноды без геометрии для измеряемого режима.

@property [layout] - Синхронная либо асинхронная политика раскладки измеренных нод.

@property [pending] - Блокирует ввод и сохраняет прежние элементы скрытыми.

@property [isCurrent] - Проверяет актуальность источника перед пользовательским действием.

@property [autoSize] - В режиме `pan-zoom` следует размеру CSS viewport и повторяет fit до ручного жеста.

@property [navigation] - Выбирает внешнее управление, прокрутку либо pan/zoom.

@property [transform] - Управляемое смещение и масштаб графа.

@property [selection] - Управляемое выделение ноды, рамки или связи.

@property [onLayoutStateChange] - Получает состояние измерения и его ошибку.

@example
```tsx
<GraphView
  scene={scene}
  navigation="pan-zoom"
  autoSize={true}
/>
```
*/
export interface GraphViewProps {
  readonly scene?: GraphScene | null | undefined
  readonly input?: GraphInput | undefined
  readonly layout?: GraphLayoutComputer | undefined
  readonly pending?: boolean | undefined
  readonly isCurrent?: (() => boolean) | undefined
  readonly label?: string | undefined
  readonly title?: string | undefined
  readonly width?: number | undefined
  readonly height?: number | undefined
  readonly autoSize?: boolean | undefined
  readonly navigation?: "none" | "scroll" | "pan-zoom" | undefined
  readonly interactive?: boolean | undefined
  readonly controls?: boolean | undefined
  readonly gridSize?: number | undefined
  readonly minScale?: number | undefined
  readonly maxScale?: number | undefined
  readonly fitPadding?: number | undefined
  readonly overscan?: number | undefined
  readonly viewport?: GraphViewport | undefined
  readonly materializeCulled?: boolean | undefined
  readonly transform?: GraphTransform | undefined
  readonly selection?: GraphSelection | undefined
  readonly style?: CssStyle | undefined
  readonly onTransformChange?: ((transform: GraphTransform, event: Event) => void) | undefined
  readonly onSelectionChange?: ((selection: GraphSelection, event: Event) => void) | undefined
  readonly onLayoutStateChange?: ((state: Readonly<{pending: boolean; error: Error | null}>) => void) | undefined
}
