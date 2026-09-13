import type {LayoutResult} from "@nodes/layout/types"
import type {ParameterInput} from "@nodes/parameters/shared"
import type {NodeChildren, NodeKind, NodeShape} from "@nodes/node/contracts"
import type {
  GraphSelection,
  GraphTransform,
  GraphViewport,
} from "../../shared/graph/contracts.ts"
import type {
  NodeTreeLayout,
  NodeTreeLayoutComputer,
  NodeTreeStore,
  NodeView,
} from "../../shared/node-tree/contracts.ts"
import type {MeasuredNodeTreeComputer} from "../../shared/node-tree/measured.ts"

/**
Входные данные редактора, который составляет модель {@link NodeTreeStore} и
общий `GraphView` без копирования состояния графа.

`layout` принимает готовую геометрию либо вычисляет её по снимку модели.
`measureLayout` получает дополнительно настоящие размеры нод. Достаточно одного
из этих способов; отсутствие обоих приводит к ошибке при вызове.

@property store - Заимствованный Store модели и адресных параметров.

@property [layout] - Готовый либо вычисляемый результат раскладки модели.

@property [measureLayout] - Политика раскладки по snapshot и DOM-измерениям.

@property [collapsedNodeIds] - Управляемое множество свёрнутых нод.

@property [previewNodeIds] - Управляемое множество нод с видимым содержимым.

@property [onParameterInput] - Передаёт промежуточное изменение параметра владельцу.

@property [onParameterChange] - Передаёт подтверждённое изменение параметра владельцу.

@property [onSocketActivate] - Сообщает точный адрес активированного сокета.

@example
```tsx
<GraphEditor
  store={store}
  layout={layoutFixed}
  navigation="pan-zoom"
/>
```
*/
export interface GraphEditorProps {
  readonly store: NodeTreeStore
  readonly nodeKinds?: ReadonlyMap<string, NodeKind> | undefined
  readonly nodeShapes?: ReadonlyMap<string, NodeShape> | undefined
  readonly nodeContent?: ReadonlyMap<string, NodeChildren> | undefined
  readonly nodeViews?: ReadonlyMap<string, NodeView> | undefined
  readonly label?: string | undefined
  readonly title?: string | undefined
  readonly layout?: LayoutResult | NodeTreeLayout | NodeTreeLayoutComputer | undefined
  readonly measureLayout?: MeasuredNodeTreeComputer | undefined
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
  readonly collapsedNodeIds?: ReadonlySet<string> | undefined
  readonly previewNodeIds?: ReadonlySet<string> | undefined
  readonly style?: CssStyle | undefined
  readonly onTransformChange?: ((transform: GraphTransform, event: Event) => void) | undefined
  readonly onSelectionChange?: ((selection: GraphSelection, event: Event) => void) | undefined
  readonly onLayoutStateChange?: ((state: Readonly<{pending: boolean; error: Error | null}>) => void) | undefined
  readonly onNodeCollapseChange?: ((nodeId: string, collapsed: boolean, event: Event) => void) | undefined
  readonly onNodePreviewChange?: ((nodeId: string, enabled: boolean, event: Event) => void) | undefined
  readonly onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  readonly onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  readonly onSocketActivate?: ((nodeId: string, socketId: string, event: Event) => void) | undefined
}
