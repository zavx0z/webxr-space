import {DiagramNode} from "@nodes/node/diagram"
import type {GraphNodeProps} from "@webxr/nodes/view"
import type {MermaidGraph} from "../src/parser.ts"

/** Адаптирует данные Mermaid к готовой ноде; размещением управляет GraphView. */
export function MermaidNode(props: GraphNodeProps) {
  const node = props.data as MermaidGraph["nodes"][number]
  return <DiagramNode
    id={props.id}
    description={node.label}
    shape={node.shape}
    rect={props.rect}
    selected={props.selected}
    hidden={props.hidden}
    onActivate={props.onActivate}
  />
}
