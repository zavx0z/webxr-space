import {useMemo, useRef, useLayoutEffect, useSyncExternalStore} from "@zavx0z/component"
import {createNodeTreeLayout} from "../shared/projection/layout.ts"
import {getNodeTreeLayoutStore} from "../shared/projection/layout-state.ts"
import {createActions, createNodeTreeViewSelector, linkKind} from "../shared/node-tree/view.ts"
import {metadataBoolean, metadataString} from "@nodes/parameters/shared"
import {ModelNode} from "../shared/model-node/index.tsx"
import type {NodeTreeProps} from "../shared/node-tree/contracts.ts"
import type {GraphScene} from "../shared/graph/contracts.ts"

export type {NodeView, NodeViewProps, NodeTreeLayoutComputer, NodePresentationState, NodeTreeLayout, NodeTreeProps, NodeTreeSelection, NodeTreeStore} from "../shared/node-tree/contracts.ts"
export type {NodeRect, NodeTreeTransform, NodeTreeViewport} from "../shared/projection/geometry.ts"
export {createNodeTreeLayout, StaleNodeTreeLayoutError} from "../shared/projection/layout.ts"
export {nodeSocketLayoutPortId} from "../shared/projection/geometry.ts"
export {socketKey} from "@nodes/sockets/shared"

/**
Адаптирует существующий Store и принятую раскладку для GraphView.
Этот отдельный вход подключает представления параметров; основной GraphView
не импортирует его и не создаёт вторую модель значений.
*/
export function useNodeTreePresentation(props: NodeTreeProps) {
  const snapshot = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  const layout = useMemo(() => {
    const compute = props.layout
    return typeof compute === "function" ? createNodeTreeLayout(props.store, source => compute(source, props)) : compute
  }, [props.store, props.layout, snapshot, props.collapsedNodeIds, props.previewNodeIds, props.nodeKinds, props.nodeShapes])
  const layoutStore = useMemo(() => getNodeTreeLayoutStore(props.store, layout), [props.store, layout])
  const state = useSyncExternalStore(layoutStore.subscribe, layoutStore.getSnapshot)
  const active = useRef(layoutStore)
  const selectView = useMemo(() => createNodeTreeViewSelector(props.store), [props.store])
  const previous = useRef<GraphScene | null>(null)
  const actions = useMemo(() => createActions(props, state.topology, layoutStore, () => active.current === layoutStore), [
    props.store, layoutStore, state.topology, props.onSelectionChange, props.onNodeCollapseChange,
    props.onNodePreviewChange, props.onSocketActivate, props.onParameterInput, props.onParameterChange,
  ])
  const scene = useMemo(() => {
    if (state.pending) return previous.current
    const view = selectView(state, props.viewport, props.materializeCulled === true)
    return Object.freeze({
      bounds: view.geometry.bounds,
      nodes: Object.freeze(view.nodes.map(entry => Object.freeze({
        id: entry.node.id,
        rect: entry.rect,
        hidden: entry.culled,
        view: ModelNode,
        data: {entry, view, treeProps: props, actions},
      }))),
      frames: Object.freeze(view.frames.map(({frame, rect, culled}) => Object.freeze({
        id: frame.id,
        rect,
        label: metadataString(frame.metadata, "label", frame.id),
        title: metadataString(frame.metadata, "description", "") || undefined,
        color: metadataString(frame.metadata, "color", "") || undefined,
        parentFrameId: frame.parentFrameId,
        hidden: culled,
      }))),
      links: Object.freeze(view.links.map(({link, route, culled}) => Object.freeze({
        id: link.id,
        title: metadataString(link.metadata, "label", `${link.from.nodeId} → ${link.to.nodeId}`),
        kind: linkKind(link, view.nodeById),
        from: link.from,
        to: link.to,
        route,
        disabled: metadataBoolean(link.metadata, "disabled", false),
        hidden: culled,
      }))),
    }) satisfies GraphScene
  }, [state, props.viewport, props.materializeCulled, props.nodeKinds, props.nodeShapes, props.nodeContent,
    props.nodeViews, props.collapsedNodeIds, props.previewNodeIds, actions, selectView])
  active.current = layoutStore
  useLayoutEffect(() => {
    if (!state.pending) previous.current = scene
  }, [state.pending, scene])
  const isCurrent = useMemo(() => () => active.current === layoutStore && !layoutStore.getSnapshot().pending &&
    props.store.getTopologySnapshot() === state.topology, [props.store, layoutStore, state.topology])
  return {scene, pending: state.pending, isCurrent}
}
