import {createRoot, component} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {Document} from "@zavx0z/dom"
import {Parameter, createNodeTree, createNodeTreeExternalStore, type NodeTreeSnapshot} from "@nodes/tree"
import {DiagramNode} from "@nodes/node/diagram"
import type {NodeViewProps, NodeView} from "@webxr/nodes/view/tree"
import {GraphEditor} from "@webxr/nodes/editor"
import {socketKey, type NodePresentationState} from "@webxr/nodes/view/tree"
import {planProjectedNodeGeometry} from "@nodes/node/geometry"
import type {NodeKind, NodeShape} from "@nodes/node/contracts"
import {layoutFixed} from "@nodes/layout/fixed"
import {InteractiveContent} from "../../node/.storybook/stories/nodes.tsx"

const kinds: ReadonlyMap<string, NodeKind> = new Map([["source", "content"], ["target", "diagram"]])
const shapes: ReadonlyMap<string, NodeShape> = new Map([["target", "oval"]])

export function computeMixedLayout(snapshot: NodeTreeSnapshot, state: NodePresentationState) {
  const connected = new Set(snapshot.links.flatMap(link => [socketKey(link.from.nodeId, link.from.socketId), socketKey(link.to.nodeId, link.to.socketId)]))
  const plans = snapshot.nodes.map(node => ({node, geometry: planProjectedNodeGeometry(node, 220, connected, undefined, {
    kind: state.nodeKinds?.get(node.id),
    shape: state.nodeShapes?.get(node.id),
    collapsed: state.collapsedNodeIds?.has(node.id),
    contentVisible: state.nodeKinds?.get(node.id) === "content" && state.previewNodeIds?.has(node.id) === true,
  })}))
  return layoutFixed({
    viewport: {width: 900, height: 700},
    nodes: plans.map(({node, geometry}) => ({id: node.id, width: geometry.width, height: geometry.height})),
    ports: plans.flatMap(({node, geometry}) => geometry.sockets.map(socket => ({...socket, nodeId: node.id}))),
    edges: snapshot.links.map(link => ({id: link.id, sourcePortId: `${link.from.nodeId}/${link.from.socketId}`, targetPortId: `${link.to.nodeId}/${link.to.socketId}`})),
  })
}

function ApplicationNode(props: NodeViewProps) {
  return <DiagramNode
    id={props.id}
    description={`Компонент приложения: ${props.snapshot.id}`}
    rect={props.rect}
    shape={props.shape}
    selected={props.selected}
    hidden={props.hidden}
    onActivate={props.onActivate}
  />
}

export function mountMixedNodes(document: Document, custom = false) {
  const value = new Parameter<number, {label: string}>("amount", 1, {label: "Число"})
  const tree = createNodeTree({nodes: [
    {id: "source", metadata: {label: "Источник", preview: {enabled: true}}, parameters: [value], sockets: [{id: "out", direction: "output", parameterId: "amount"}]},
    {id: "target", metadata: {description: "Диаграммная нода"}, sockets: [{id: "in", direction: "input"}]},
  ], links: [{id: "connection", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}]})
  const store = createNodeTreeExternalStore(tree)
  const content = component(InteractiveContent as unknown as CompiledTemplate<{}>, {}) as unknown as JsxSourceElement
  const contents = new Map([["source", content]])
  const views: ReadonlyMap<string, NodeView> | undefined = custom ? new Map([["target", ApplicationNode]]) : undefined
  const owner = document.createElement("div")
  const root = createRoot(owner)
  root.render(<GraphEditor
    store={store}
    layout={computeMixedLayout}
    nodeKinds={kinds}
    nodeShapes={shapes}
    nodeContent={contents}
    nodeViews={views}
    width={900}
    height={700}
    onParameterInput={input => value.set(input.value as number)}
    onParameterChange={input => value.set(input.value as number)}
  />)
  return {owner, tree, value, dispose() {
    root.unmount()
    tree.dispose()
    owner.remove()
  }}
}
