import {DiagramNode} from "@nodes/node/diagram"
import type {GraphNodeProps, GraphInput, GraphLayoutComputer} from "@webxr/nodes/view"
import {layoutTopDown} from "@nodes/layout/top-down"
import {createCubicLinkRoute} from "@webxr/nodes/link"
import {GraphEditor, type GraphEditorProps} from "@webxr/nodes/editor"
import type {NodeTreeStore} from "@webxr/nodes/view/tree"
import {layoutFixed} from "@nodes/layout/fixed"

export function MeasuredDiagram(props: GraphNodeProps) {
  return <DiagramNode
    id={props.id}
    description={props.data as string}
    rect={props.rect}
    intrinsic={props.intrinsic}
    elementRef={props.elementRef}
    onActivate={props.onActivate}
  />
}

export function MeasuredCircle(props: GraphNodeProps) {
  return <DiagramNode
    id={props.id}
    description={props.data as string}
    shape="circle"
    rect={props.rect}
    intrinsic={props.intrinsic}
    elementRef={props.elementRef}
    onActivate={props.onActivate}
  />
}

export function graphInput(label = "Короткая"): GraphInput {
  return {nodes: [
    {id: "a", data: label, view: MeasuredDiagram},
    {id: "b", data: "Существенно более длинная подпись", view: MeasuredDiagram},
  ]}
}

export const measuredLayout: GraphLayoutComputer = nodes => {
  const result = layoutTopDown({
    nodes,
    ports: nodes.map(node => ({id: node.id, nodeId: node.id, x: node.width / 2})),
    edges: [{id: "edge", sourcePortId: "a", targetPortId: "b"}],
  })
  return {
    bounds: result.bounds,
    nodes: result.nodes,
    links: result.edges.map(edge => ({id: edge.id, title: edge.id, route: createCubicLinkRoute(edge.curves)})),
  }
}

export const measuredTreeLayout: NonNullable<GraphEditorProps["measureLayout"]> = (snapshot, _presentation, nodes) => layoutFixed({
  viewport: {width: 900, height: 600},
  nodes,
  ports: nodes.flatMap(node => node.anchors.map(anchor => ({id: `${node.id}/${anchor.id}`, nodeId: node.id, y: anchor.y}))),
  edges: snapshot.links.map(link => ({id: link.id, sourcePortId: `${link.from.nodeId}/${link.from.socketId}`, targetPortId: `${link.to.nodeId}/${link.to.socketId}`})),
})

export function MeasuredEditor(props: Readonly<{store: NodeTreeStore}>) {
  return <GraphEditor
    store={props.store}
    measureLayout={measuredTreeLayout}
    width={900}
    height={600}
  />
}
