import {component, memo} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {NodeChildren} from "@nodes/node/contracts"
import type {GraphNode, GraphNodeProps} from "../contracts.ts"
import {GraphNodeSlot} from "./content/index.tsx"

/** Монтирует переданный TSX с устойчивым ключом без дополнительного DOM-контейнера. */
export function GraphNodeContent(props: Readonly<{
  node: GraphNode
  selected: boolean
  hidden: boolean
  onActivate: (event: Event) => void
}>) {
  const content: NodeChildren = renderNode(props.node, {
    id: props.node.id,
    rect: props.node.rect,
    data: props.node.data,
    selected: props.selected,
    hidden: props.hidden,
    onActivate: props.onActivate,
  })
  return <GraphNodeSlot>{content}</GraphNodeSlot>
}

export const MemoGraphNodeContent = memo(GraphNodeContent, (previous, next) =>
  previous.node === next.node && previous.selected === next.selected && previous.hidden === next.hidden &&
  previous.onActivate === next.onActivate)

function renderNode(node: GraphNode, props: GraphNodeProps): NodeChildren {
  return component(node.view as unknown as CompiledTemplate<GraphNodeProps>, props, node.id) as unknown as JsxSourceElement
}
