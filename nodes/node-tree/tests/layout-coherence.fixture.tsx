import {createRoot, useMemo, useSyncExternalStore} from "@zavx0z/component"
import type {Document, Element} from "@zavx0z/dom"
import {layoutFixed} from "@nodes/layout/fixed"
import type {LayoutResult} from "@nodes/layout/types"
import {Parameter, createNodeTree, createNodeTreeExternalStore, type NodeJsonValue, type NodeTreeSnapshot} from "@nodes/tree"
import {NodeEditor} from "@webxr/nodes/node-editor"
import {planProjectedNodeGeometry} from "@webxr/nodes/node"
import {NodeTree, nodeSocketLayoutPortId, socketKey, type NodeTreeLayout, type NodeTreeSelection, type NodeTreeTransform} from "@webxr/nodes/node-tree"
import type {ParameterInput} from "@nodes/parameters/shared"

export function textParameter(value: string) {
  return new Parameter<NodeJsonValue, NodeJsonValue>("message", value, {label: "Сообщение"}, {id: "string", version: 1})
}

export function createLayoutGraph(linked = true) {
  const source = textParameter("source initial")
  const target = textParameter("target initial")
  const sourceAmount = new Parameter<NodeJsonValue, NodeJsonValue>("amount", 1, {label: "Число"}, {id: "float", version: 1})
  const targetAmount = new Parameter<NodeJsonValue, NodeJsonValue>("amount", 0, {label: "Число"}, {id: "float", version: 1})
  const valueType = {id: "float", version: 1}
  const tree = createNodeTree({
    nodes: [
      {
        id: "source",
        parameters: [source, sourceAmount],
        sockets: linked ? [{id: "out", direction: "output", parameterId: "amount", side: "right", valueType}] : [],
      },
      {
        id: "target",
        parameters: [target, targetAmount],
        sockets: linked ? [{id: "in", direction: "input", parameterId: "amount", side: "left", valueType}] : [],
      },
    ],
    links: linked ? [{id: "value-link", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}] : [],
  })
  const store = createNodeTreeExternalStore(tree)
  const changes: ParameterInput[] = []
  const selections: NodeTreeSelection[] = []
  const transforms: NodeTreeTransform[] = []
  const change = (input: ParameterInput) => {
    changes.push(input)
    tree.parameter(input.nodeId, input.parameterId).set(input.value)
  }
  const select = (selection: NodeTreeSelection) => selections.push(selection)
  const transform = (next: NodeTreeTransform) => transforms.push(next)
  return {tree, store, source, target, sourceAmount, targetAmount, changes, selections, transforms, change, select, transform}
}

export type LayoutGraph = ReturnType<typeof createLayoutGraph>
export type FixtureLayout = LayoutResult | NodeTreeLayout

export function graphLayout(snapshot: NodeTreeSnapshot): LayoutResult {
  const connected = new Set(snapshot.links.flatMap(link => [
    socketKey(link.from.nodeId, link.from.socketId),
    socketKey(link.to.nodeId, link.to.socketId),
  ]))
  const plans = snapshot.nodes.map(node => ({node, geometry: planProjectedNodeGeometry(node, 280, connected)}))
  return layoutFixed({
    viewport: {width: 900, height: 600},
    nodes: plans.map(({node, geometry}) => ({id: node.id, width: geometry.width, height: geometry.height})),
    ports: plans.flatMap(({node, geometry}) => geometry.sockets.map(socket => ({...socket, nodeId: node.id}))),
    edges: snapshot.links.map(link => ({
      id: link.id,
      sourcePortId: nodeSocketLayoutPortId(link.from.nodeId, link.from.socketId),
      targetPortId: nodeSocketLayoutPortId(link.to.nodeId, link.to.socketId),
    })),
  })
}

type GraphProps = Readonly<{graph: LayoutGraph}>
type LayoutProps = Readonly<{graph: LayoutGraph; layout: FixtureLayout}>

function RawTreeFixture(props: GraphProps) {
  const snapshot = useSyncExternalStore(props.graph.store.subscribe, props.graph.store.getSnapshot)
  const layout = useMemo(() => graphLayout(snapshot), [snapshot])
  return <TreeFixture
    graph={props.graph}
    layout={layout}
  />
}

function RawEditorFixture(props: GraphProps) {
  const snapshot = useSyncExternalStore(props.graph.store.subscribe, props.graph.store.getSnapshot)
  const layout = useMemo(() => graphLayout(snapshot), [snapshot])
  return <EditorFixture
    graph={props.graph}
    layout={layout}
  />
}

function TreeFixture(props: LayoutProps) {
  return <NodeTree
    store={props.graph.store}
    layout={props.layout}
    label="Layout coherence tree"
    onParameterInput={props.graph.change}
    onParameterChange={props.graph.change}
    onSelectionChange={props.graph.select}
  />
}

function EditorFixture(props: LayoutProps) {
  return <NodeEditor
    store={props.graph.store}
    layout={props.layout}
    label="Layout coherence editor"
    width={760}
    height={480}
    onParameterInput={props.graph.change}
    onParameterChange={props.graph.change}
    onSelectionChange={props.graph.select}
    onTransformChange={props.graph.transform}
  />
}

type LayoutControl = ReturnType<typeof createLayoutControl>
type ControlledProps = Readonly<{graph: LayoutGraph; control: LayoutControl}>

function ControlledTreeFixture(props: ControlledProps) {
  const layout = useSyncExternalStore(props.control.subscribe, props.control.getSnapshot)
  return <TreeFixture
    graph={props.graph}
    layout={layout}
  />
}

function ControlledEditorFixture(props: ControlledProps) {
  const layout = useSyncExternalStore(props.control.subscribe, props.control.getSnapshot)
  return <EditorFixture
    graph={props.graph}
    layout={layout}
  />
}

/** Test parent state publishes a layout prop without wrapping the graph Store. */
function createLayoutControl(initial: FixtureLayout) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    publish(next: FixtureLayout) {
      value = next
      for (const listener of listeners) listener()
    },
  }
}

export function mountLayoutFixture(document: Document, graph: LayoutGraph, kind: "tree" | "editor", layout?: FixtureLayout) {
  const element = document.createElement("div")
  const root = createRoot(element)
  const control = createLayoutControl(layout ?? graphLayout(graph.store.getSnapshot()))
  try {
    if (layout !== undefined && kind === "tree") {
      root.render(<ControlledTreeFixture
        graph={graph}
        control={control}
      />)
    } else if (layout !== undefined) {
      root.render(<ControlledEditorFixture
        graph={graph}
        control={control}
      />)
    } else if (kind === "tree") {
      root.render(<RawTreeFixture
        graph={graph}
      />)
    } else {
      root.render(<RawEditorFixture
        graph={graph}
      />)
    }
  } catch (error) {
    root.unmount()
    throw error
  }
  return {element: element as Element, root, publish: control.publish, dispose: () => root.unmount()}
}
