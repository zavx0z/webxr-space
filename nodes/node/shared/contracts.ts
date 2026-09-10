import type {ExternalStore, NodeJsonValue, NodeTreeNodeSnapshot, ParameterReference, ParameterSnapshot, Socket as CoreSocket} from "@nodes/tree"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {ParameterInput} from "@nodes/parameters/shared"

export type NodeRect = Readonly<{x: number; y: number; width: number; height: number}>

/**
Данные изображения для области содержимого ноды.

@property width - Исходная ширина изображения в пикселях.

@property height - Исходная высота изображения в пикселях; пропорции сохраняются при вписывании.

@property [alt] - При отсутствии доступное описание берётся из подписи области содержимого.
*/
export type NodePreviewImage = Readonly<{
  src: string
  width: number
  height: number
  alt?: string | undefined
}>

export type NodeKind = "parameter" | "content" | "diagram"
export type NodeShape = "rectangle" | "oval" | "circle"
export type NodeChildren = JsxSourceElement | readonly JsxSourceElement[] | null | undefined
export type NodeAction = Readonly<{id: string; label: string; iconSrc: string; selected?: boolean | undefined; disabled?: boolean | undefined; onClick?: ((event: Event) => void) | undefined}>

export type ParameterNodeProps = Readonly<{
  id: string
  frameId?: string | undefined
  label: string
  rect?: NodeRect | undefined
  intrinsic?: boolean | undefined
  elementRef?: ((element: HTMLElement | null) => void) | undefined
  title?: string | undefined
  category?: string | undefined
  headerColor?: string | undefined
  selected?: boolean | undefined
  hidden?: boolean | undefined
  collapsed?: boolean | undefined
  embedded?: boolean | undefined
  actions?: readonly NodeAction[] | undefined
  parameters?: NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>["parameters"] | undefined
  sockets?: readonly CoreSocket[] | undefined
  parameterStore?: ((parameterId: string) => ExternalStore<ParameterSnapshot>) | undefined
  connectedSocketKeys?: ReadonlySet<string> | undefined
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  children?: JsxSourceElement | null | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
  onCollapseChange?: ((collapsed: boolean, event: Event) => void) | undefined
  onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>
