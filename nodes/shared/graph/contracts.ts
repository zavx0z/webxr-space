import type {FunctionComponent} from "@zavx0z/component"
import type {FrameProps} from "@webxr/nodes/frame"
import type {LinkDefinition} from "@webxr/nodes/link"

/** Геометрия в CSS-пикселях графа до масштаба и пространственной проекции. */
export type GraphRect = Readonly<{x: number; y: number; width: number; height: number}>
export type GraphTransform = Readonly<{x: number; y: number; scale: number}>
export type GraphViewport = GraphRect & Readonly<{overscan?: number | undefined}>
export type GraphSelection = Readonly<{kind: "frame" | "link" | "node"; id: string}> | null

/** Общий договор подключаемого представления ноды; data принадлежит адаптеру. */
export type GraphNodeProps = Readonly<{
  id: string
  rect: GraphRect | undefined
  data: unknown
  selected: boolean
  hidden: boolean
  onActivate: (event: Event) => void
  /** В измеряемом режиме сохраняет естественные CSS-размеры после размещения. */
  intrinsic?: boolean | undefined
  /** Ссылка на настоящий корневой Element ноды, без измерительной копии. */
  elementRef?: ((element: HTMLElement | null) => void) | undefined
}>

export type GraphNode = Readonly<{
  id: string
  rect: GraphRect
  data: unknown
  view: FunctionComponent<GraphNodeProps>
  hidden?: boolean | undefined
}>

export type GraphFrame = Omit<FrameProps, "selected" | "onActivate" | "children" | "style">
export type GraphLink = Omit<LinkDefinition, "selected">

/** Один согласованный результат адаптации данных и числовой раскладки. */
export type GraphScene = Readonly<{
  bounds: GraphRect
  nodes: readonly GraphNode[]
  frames: readonly GraphFrame[]
  links: readonly GraphLink[]
}>

/** Измеряемые элементы и точные DOM-окончания связей, заданные представлением. */
export type GraphInputNode = Omit<GraphNode, "rect"> & Readonly<{
  anchors?: readonly Readonly<{id: string; selector: string}>[] | undefined
}>
export type GraphInput = Readonly<{nodes: readonly GraphInputNode[]}>
export type GraphMeasurement = Readonly<{
  id: string
  width: number
  height: number
  anchors: readonly Readonly<{id: string; x: number; y: number}>[]
}>
export type GraphMeasuredLayout = Readonly<{
  bounds: GraphRect
  nodes: readonly (GraphRect & Readonly<{id: string; data?: unknown}>)[]
  links: readonly GraphLink[]
  frames?: readonly GraphFrame[] | undefined
}>
export type GraphLayoutComputer = (nodes: readonly GraphMeasurement[]) => GraphMeasuredLayout | Promise<GraphMeasuredLayout>
export type GraphRenderedNode = Omit<GraphNode, "rect"> & Readonly<{rect?: GraphRect | undefined}>

/** Просмотр заимствует сцену; источник отвечает за актуальность async-результата. */
export type GraphViewProps = Readonly<{
  scene?: GraphScene | null | undefined
  input?: GraphInput | undefined
  layout?: GraphLayoutComputer | undefined
  pending?: boolean | undefined
  isCurrent?: (() => boolean) | undefined
  label?: string | undefined
  title?: string | undefined
  width?: number | undefined
  height?: number | undefined
  navigation?: "none" | "scroll" | "pan-zoom" | undefined
  interactive?: boolean | undefined
  controls?: boolean | undefined
  gridSize?: number | undefined
  minScale?: number | undefined
  maxScale?: number | undefined
  fitPadding?: number | undefined
  overscan?: number | undefined
  viewport?: GraphViewport | undefined
  materializeCulled?: boolean | undefined
  transform?: GraphTransform | undefined
  selection?: GraphSelection | undefined
  style?: CssStyle | undefined
  onTransformChange?: ((transform: GraphTransform, event: Event) => void) | undefined
  onSelectionChange?: ((selection: GraphSelection, event: Event) => void) | undefined
  onLayoutStateChange?: ((state: Readonly<{pending: boolean; error: Error | null}>) => void) | undefined
}>
