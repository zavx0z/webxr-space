import type {FunctionComponent} from "@zavx0z/component"
import type {ParameterNodeProps} from "@nodes/node/parameter"
import type {NodeChildren, NodeKind, NodeShape} from "@nodes/node/contracts"
import type {NodeTreeExternalStore, NodeTreeSnapshot, ParameterSnapshot} from "@nodes/tree"
import type {LayoutResult} from "@nodes/layout/types"
import type {ParameterInput} from "@nodes/parameters/shared"
import type {NodeGeometryIndex, NodeRect, NodeTreeTransform, NodeTreeViewport} from "../projection/geometry.ts"
import type {LinkRoute} from "../routing/link-path.ts"

export type NodeTreeStore = NodeTreeExternalStore<NodeTreeSnapshot, ParameterSnapshot>
export const nodeTreeLayoutBrand: unique symbol = Symbol("NodeTreeLayout")

/** One validated layout bound to the exact source snapshot used to compute it. */
export type NodeTreeLayout = Readonly<{
  [nodeTreeLayoutBrand]: true
  snapshot: NodeTreeSnapshot
  layout: LayoutResult
}>

export type NodeTreeSelection =
  | Readonly<{kind: "frame" | "link" | "node"; id: string}>
  | null

/**
Проекция единственного Store в одном semantic дереве.

@property store - Исходный Store; адресные Parameter Stores сохраняют identity.

@property layout - Готовая геометрия или receipt, связанный с точным snapshot и source Store.

@property [materializeCulled] - Сохраняет компоненты вне viewport скрытыми вместо исключения из проекции.

@property [viewport] - Область видимости в координатах дерева; не выполняет раскладку.
*/
export type NodePresentationState = Readonly<{
  collapsedNodeIds?: ReadonlySet<string> | undefined
  previewNodeIds?: ReadonlySet<string> | undefined
  nodeKinds?: ReadonlyMap<string, NodeKind> | undefined
  nodeShapes?: ReadonlyMap<string, NodeShape> | undefined
}>
export type NodeTreeLayoutComputer = (snapshot: NodeTreeSnapshot, presentation: NodePresentationState) => LayoutResult

/** A supplied compiled node receives the same accepted snapshot, geometry and guarded actions as built-in nodes. */
export type NodeViewProps = ParameterNodeProps & Readonly<{
  snapshot: NodeTreeSnapshot["nodes"][number]
  contentVisible: boolean
  shape?: NodeShape | undefined
  onContentVisibleChange?: ((visible: boolean, event: Event) => void) | undefined
}>
export type NodeView = FunctionComponent<NodeViewProps>

export type NodeTreeProps = Readonly<{
  store: NodeTreeStore
  nodeKinds?: ReadonlyMap<string, NodeKind> | undefined
  nodeShapes?: ReadonlyMap<string, NodeShape> | undefined
  nodeContent?: ReadonlyMap<string, NodeChildren> | undefined
  nodeViews?: ReadonlyMap<string, NodeView> | undefined
  label?: string | undefined
  layout: LayoutResult | NodeTreeLayout | NodeTreeLayoutComputer
  viewport?: NodeTreeViewport | undefined
  materializeCulled?: boolean | undefined
  transform?: NodeTreeTransform | undefined
  selection?: NodeTreeSelection | undefined
  collapsedNodeIds?: ReadonlySet<string> | undefined
  previewNodeIds?: ReadonlySet<string> | undefined
  style?: CssStyle | undefined
  onSelectionChange?: ((selection: NodeTreeSelection, event: Event) => void) | undefined
  onNodeCollapseChange?: ((nodeId: string, collapsed: boolean, event: Event) => void) | undefined
  onNodePreviewChange?: ((nodeId: string, enabled: boolean, event: Event) => void) | undefined
  onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((nodeId: string, socketId: string, event: Event) => void) | undefined
}>

export type UiSnapshot = NodeTreeSnapshot
export type UiNode = UiSnapshot["nodes"][number]
export type UiFrame = UiSnapshot["frames"][number]
export type UiLink = UiSnapshot["links"][number]

export type VisibleNode = Readonly<{node: UiNode; rect: NodeRect; culled: boolean}>
export type VisibleFrame = Readonly<{frame: UiFrame; rect: NodeRect; culled: boolean}>
export type VisibleLink = Readonly<{link: UiLink; route: LinkRoute; bounds: NodeRect; culled: boolean}>

export type NodeTreeView = Readonly<{
  frames: readonly VisibleFrame[]
  nodes: readonly VisibleNode[]
  links: readonly VisibleLink[]
  nodeById: ReadonlyMap<string, UiNode>
  frameById: ReadonlyMap<string, UiFrame>
  visibleNodeIds: ReadonlySet<string>
  visibleFrameIds: ReadonlySet<string>
  connectedSocketKeys: ReadonlySet<string>
  geometry: NodeGeometryIndex
}>

export type NodeTreeActions = Readonly<{
  parameterInput(change: ParameterInput, event: Event): void
  parameterChange(change: ParameterInput, event: Event): void
  selectFrame(id: string): (event: Event) => void
  selectLink(id: string): (event: Event) => void
  selectNode(id: string): (event: Event) => void
  collapseNode(id: string): (collapsed: boolean, event: Event) => void
  previewNode(id: string): (enabled: boolean, event: Event) => void
  socket(nodeId: string): (socketId: string, event: Event) => void
  parameterStore(nodeId: string): (parameterId: string) => ReturnType<NodeTreeStore["parameter"]>
}>
