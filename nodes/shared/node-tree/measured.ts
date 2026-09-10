import {useMemo, useRef, useSyncExternalStore} from "@zavx0z/component"
import type {NodeTreeSnapshot} from "@nodes/tree"
import type {LayoutResult} from "@nodes/layout/types"
import {metadataBoolean, metadataString} from "@nodes/parameters/shared"
import {socketKey} from "@nodes/sockets/shared"
import {createNodeTreeLayout, StaleNodeTreeLayoutError} from "../projection/layout.ts"
import {createNodeGeometryIndex} from "../projection/geometry.ts"
import {createActions, linkKind} from "./view.ts"
import {ModelNode, type ModelNodeData} from "../model-node/index.tsx"
import type {NodeTreeProps, NodeTreeLayout, NodePresentationState} from "./contracts.ts"
import type {GraphInput, GraphMeasurement, GraphMeasuredLayout, GraphLayoutComputer} from "../graph/contracts.ts"

export type MeasuredNodeTreeComputer = (snapshot: NodeTreeSnapshot, presentation: NodePresentationState, nodes: readonly GraphMeasurement[]) => LayoutResult | Promise<LayoutResult>
type Props = Omit<NodeTreeProps, "layout"> & Readonly<{compute: MeasuredNodeTreeComputer}>
const emptySubscribe = (_listener: () => void) => () => {}
const emptySnapshot = () => null

/** Адаптирует реальные измерения к прежнему числовому договору модели с точными Socket адресами. */
export function useMeasuredNodeTreePresentation(props: Props | null) {
  const snapshot = useSyncExternalStore<NodeTreeSnapshot | null>(props?.store.subscribe ?? emptySubscribe, props?.store.getSnapshot ?? emptySnapshot)
  const active = useRef<object | null>(null)
  const context = useMemo(() => {
    if (props === null || snapshot === null) return null
    const token = {}
    let ready = false
    const current = () => active.current === token && props.store.getSnapshot() === snapshot
    const actions = createActions(props, props.store.getTopologySnapshot(), () => ready && current())
    const connected = new Set(snapshot.links.flatMap(link => [socketKey(link.from.nodeId, link.from.socketId), socketKey(link.to.nodeId, link.to.socketId)]))
    const data = new Map(snapshot.nodes.map(node => [node.id, {node, connectedSocketKeys: connected, treeProps: props, actions} satisfies ModelNodeData]))
    const input: GraphInput = {nodes: snapshot.nodes.map(node => ({
      id: node.id,
      data: data.get(node.id),
      view: ModelNode,
      anchors: node.sockets.map(socket => ({id: socket.id, selector: `[data-socket-id=${JSON.stringify(socket.id)}] [data-socket-glyph]`})),
    }))}
    const convert = (receipt: NodeTreeLayout): GraphMeasuredLayout => {
      const geometry = createNodeGeometryIndex(snapshot.nodes, snapshot.frames, snapshot.links, receipt.layout)
      const byId = new Map(snapshot.nodes.map(node => [node.id, node]))
      return {
        bounds: geometry.bounds,
        nodes: snapshot.nodes.map(node => ({
          id: node.id,
          ...geometry.nodeRects.get(node.id)!,
          data: {...data.get(node.id)!, resolvedSocketSides: geometry.portSides},
        })),
        frames: snapshot.frames.map(frame => ({
          id: frame.id,
          rect: geometry.frameRects.get(frame.id)!,
          label: metadataString(frame.metadata, "label", frame.id),
          parentFrameId: frame.parentFrameId,
        })),
        links: snapshot.links.map(link => ({
          id: link.id,
          title: metadataString(link.metadata, "label", `${link.from.nodeId} → ${link.to.nodeId}`),
          kind: linkKind(link, byId),
          from: link.from,
          to: link.to,
          route: geometry.linkRoutes.get(link.id)!,
          disabled: metadataBoolean(link.metadata, "disabled", false),
        })),
      }
    }
    const layout: GraphLayoutComputer = measurements => {
      if (!current()) throw new StaleNodeTreeLayoutError()
      const receipt = createNodeTreeLayout(props.store, () => props.compute(snapshot, props, measurements))
      return "then" in receipt ? receipt.then(convert) : convert(receipt)
    }
    return {token, input, layout, current, layoutState(value: Readonly<{pending: boolean}>) { ready = !value.pending }}
  }, [snapshot, props?.store, props?.compute, props?.collapsedNodeIds, props?.previewNodeIds, props?.nodeKinds,
    props?.nodeShapes, props?.nodeContent, props?.nodeViews, props?.onNodeCollapseChange, props?.onNodePreviewChange,
    props?.onParameterInput, props?.onParameterChange, props?.onSocketActivate])
  active.current = context?.token ?? null
  return context
}
