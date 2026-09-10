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
    intrinsic={props.intrinsic}
    elementRef={props.elementRef}
    selected={props.selected}
    hidden={props.hidden}
    onActivate={props.onActivate}
    style={css`
      --diagram-node-padding-inline: ${node.shape === "circle" ? 31 : 15}px;
      --diagram-node-padding-block: 11px;
      --diagram-node-font-family: var(--mermaid-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      --diagram-node-font-size: 16px;
      --diagram-node-line-height: var(--mermaid-line-height, 20px);
    `}
  />
}
