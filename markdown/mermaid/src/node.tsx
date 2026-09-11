import {DiagramNode} from "@nodes/node/diagram"
import type {GraphNodeProps} from "@webxr/nodes/view"
import type {MermaidGraph} from "../types/graph.ts"

/**
Адаптирует узел {@link MermaidGraph} к {@link DiagramNode}.
Измерение, положение и lifecycle ноды остаются у {@link @webxr/nodes/view#GraphView | GraphView}.

@param props - Вход {@link GraphNodeProps}, у которого `data` является элементом
{@link MermaidGraph}.nodes`; `id` соответствует этой записи. Приведение типа внутри
адаптера не валидирует произвольное data, поэтому его задаёт композиция Mermaid.
*/
export function MermaidNode(props: GraphNodeProps) {
  const node = props.data as MermaidGraph["nodes"][number]
  return <DiagramNode
    id={props.id}
    description={node.label}
    shape={node.shape}
    rect={props.rect}
    intrinsic={props.intrinsic}
    elementRef={props.elementRef}
    selected={props.selected}
    hidden={props.hidden}
    onActivate={props.onActivate}
  />
}
