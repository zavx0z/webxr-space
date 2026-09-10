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
  rect: GraphRect
  data: unknown
  selected: boolean
  hidden: boolean
  onActivate: (event: Event) => void
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

/** Просмотр заимствует сцену; источник отвечает за актуальность async-результата. */
export type GraphViewProps = Readonly<{
  scene: GraphScene | null
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
}>
