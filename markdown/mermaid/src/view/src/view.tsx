import {useState} from "@zavx0z/component"
import {DiagramNode} from "@nodes/node/diagram"
import {Link, createCubicLinkRoute, type LinkPathPoint, type LinkRoute} from "@webxr/nodes/link"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutTopDown} from "@nodes/layout/top-down"
import type {MermaidGraph} from "../../parser.ts"

export type MermaidViewProps = Readonly<{graph: MermaidGraph; plan: ReturnType<typeof layoutMermaidGraph>}>

export function MermaidView(props: MermaidViewProps) {
  const plan = props.plan
  const [selected, setSelected] = useState<string | null>(null)
  return <div
    aria-label="Mermaid: диаграмма"
    data-mermaid-graph=""
    data-mermaid-direction={props.graph.direction}
    style={css`
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      margin-bottom: 12px;
      overflow: auto;
      border: 1px solid var(--widget-box-outline);
      border-radius: 6px;
      background: #171b24;
    `}
  >
    <div style={css`
      position: relative;
      width: ${plan.width}px;
      height: ${plan.height}px;
    `}>
      {plan.edges.map(edge => <Link
        key={edge.id}
        id={edge.id}
        title={`${edge.from} → ${edge.to}`}
        from={{nodeId: edge.from, socketId: "out"}}
        to={{nodeId: edge.to, socketId: "in"}}
        route={edge.route}
        startArrow={edge.startArrow}
        endArrow={edge.endArrow}
      />)}
      {plan.nodes.map(node => <DiagramNode
        key={node.id}
        id={node.id}
        description={node.label}
        rect={node.rect}
        shape={node.shape}
        selected={node.id === selected}
        onActivate={() => setSelected(node.id)}
      />)}
    </div>
  </div>
}

export function layoutMermaidGraph(graph: MermaidGraph) {
  const horizontal = graph.direction === "LR" || graph.direction === "RL"
  const reverse = graph.direction === "RL" || graph.direction === "BT"
  const dimensions = graph.nodes.map(node => ({id: node.id, width: 210, height: node.shape === "circle" ? 210 : 64}))
  const ports = graph.edges.flatMap(edge => [
    {id: `${edge.id}/out`, nodeId: edge.from},
    {id: `${edge.id}/in`, nodeId: edge.to},
  ])
  const edges = graph.edges.map(edge => ({id: edge.id, sourcePortId: `${edge.id}/out`, targetPortId: `${edge.id}/in`}))
  const result = horizontal
    ? layoutFixed({
      viewport: {width: 1400, height: 700},
      nodes: dimensions,
      ports: dimensions.flatMap(node => [
        ...(graph.edges.some(edge => edge.from === node.id) ? [{id: `${node.id}/out`, nodeId: node.id, y: node.height / 2}] : []),
        ...(graph.edges.some(edge => edge.to === node.id) ? [{id: `${node.id}/in`, nodeId: node.id, y: node.height / 2}] : []),
      ]),
      edges: graph.edges.map(edge => ({id: edge.id, sourcePortId: `${edge.from}/out`, targetPortId: `${edge.to}/in`})),
      layoutOptions: {spacing: 32, layerSpacing: 96, padding: 24, clearance: 8},
    })
    : layoutTopDown({nodes: dimensions, ports: ports.map(port => ({...port, x: 105})), edges, layoutOptions: {nodeSpacing: 32, layerSpacing: 64, padding: 24}})
  const point = (value: LinkPathPoint): LinkPathPoint => ({
    x: reverse && horizontal ? 2 * result.bounds.x + result.bounds.width - value.x : value.x,
    y: reverse && !horizontal ? 2 * result.bounds.y + result.bounds.height - value.y : value.y,
  })
  const routes = new Map(result.edges.map(edge => {
    let route: LinkRoute
    if ("curves" in edge) {
      route = createCubicLinkRoute(edge.curves.map(curve => ({
        startPoint: point(curve.startPoint),
        controlPoints: [point(curve.controlPoints[0]), point(curve.controlPoints[1])] as const,
        endPoint: point(curve.endPoint),
      })))
    } else {
      const section = edge.sections[0]!
      route = {kind: "orthogonal", points: [section.startPoint, ...section.bendPoints, section.endPoint].map(point)}
    }
    return [edge.id, route] as const
  }))
  return {
    width: result.bounds.x + result.bounds.width + 24,
    height: result.bounds.y + result.bounds.height + 24,
    nodes: graph.nodes.map(node => {
      const rect = result.nodes.find(entry => entry.id === node.id)!
      const position = point({x: rect.x + (reverse && horizontal ? rect.width : 0), y: rect.y + (reverse && !horizontal ? rect.height : 0)})
      return {...node, rect: {...rect, ...position}}
    }),
    edges: graph.edges.map(edge => ({...edge, route: routes.get(edge.id)!})),
  }
}
