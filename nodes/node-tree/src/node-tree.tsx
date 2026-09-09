import {createNodeTreeLayout} from "../../shared/projection/layout.ts"
import {useMemo, useRef, useLayoutEffect, useSyncExternalStore, type FunctionComponent} from "@zavx0z/component"
import {DEFAULT_NODE_TREE_TRANSFORM} from "../../shared/projection/geometry.ts"
import {getNodeTreeLayoutStore} from "../../shared/projection/layout-state.ts"
import {createActions, createNodeTreeViewSelector} from "../../shared/node-tree/view.ts"
import type {NodeTreeActions, NodeTreeProps, NodeTreeView} from "../../shared/node-tree/contracts.ts"
import {MemoNodeTreeContent} from "./node-tree-content/src/node-tree-content.tsx"

export type {NodeRect, NodeTreeTransform, NodeTreeViewport} from "../../shared/projection/geometry.ts"
export {nodeSocketLayoutPortId} from "../../shared/projection/geometry.ts"
export {socketKey} from "@nodes/sockets/shared"
export {createNodeTreeLayout, StaleNodeTreeLayoutError} from "../../shared/projection/layout.ts"
export type {NodeView, NodeViewProps, NodeTreeLayoutComputer, NodePresentationState, NodeTreeLayout, NodeTreeProps, NodeTreeSelection, NodeTreeStore} from "../../shared/node-tree/contracts.ts"

export function NodeTree(props: NodeTreeProps) {
  const snapshot = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  const layout = useMemo(() => {
    const compute = props.layout
    return typeof compute === "function" ? createNodeTreeLayout(props.store, source => compute(source, props)) : compute
  }, [props.store, props.layout, snapshot, props.collapsedNodeIds, props.previewNodeIds, props.nodeKinds, props.nodeShapes])
  const layoutStore = useMemo(
    () => getNodeTreeLayoutStore(props.store, layout),
    [props.store, layout],
  )
  const layoutState = useSyncExternalStore(layoutStore.subscribe, layoutStore.getSnapshot)
  const activeLayout = useRef(layoutStore)
  const selectView = useMemo(() => createNodeTreeViewSelector(props.store), [props.store])
  const previous = useRef<Readonly<{view: NodeTreeView; treeProps: NodeTreeProps; actions: NodeTreeActions}> | null>(null)
  const actions = useMemo(() => createActions(props, layoutState.topology, layoutStore,
    () => activeLayout.current === layoutStore), [
    props.store, props.layout, layoutState.topology, props.onSelectionChange, props.onNodeCollapseChange,
    props.onNodePreviewChange, props.onSocketActivate, props.onParameterInput, props.onParameterChange,
  ])
  const presentation = layoutState.pending ? previous.current : {
    view: selectView(layoutState, props.viewport, props.materializeCulled === true), treeProps: props, actions,
  }
  // Revoke the old input before DOM changes (including blur/change on hiding).
  // Invalid geometry throws above and cannot replace the active input.
  activeLayout.current = layoutStore
  useLayoutEffect(() => {
    if (!layoutState.pending) previous.current = presentation
  }, [layoutState.pending, presentation])
  const view = presentation?.view
  const transform = props.transform ?? DEFAULT_NODE_TREE_TRANSFORM
  return <section
    role="tree"
    aria-label={props.label ?? "Node tree"}
    data-node-tree=""
    data-layout-pending={layoutState.pending ? "true" : undefined}
    aria-busy={layoutState.pending ? "true" : "false"}
    data-frame-count={view?.frames.length ?? 0}
    data-link-count={view?.links.length ?? 0}
    data-node-count={view?.nodes.length ?? 0}
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: transparent;
      color: #d8d8d8;

      ${props.style}
    `}
  >
    <p
      role="status"
      data-layout-status=""
      hidden={!layoutState.pending}
      style={css`
        margin: 0;
        padding: 12px;
        color: #a8a8a8;

        &[hidden] {
          display: none;
        }
      `}
    >
      Ожидание раскладки
    </p>
    <div
      role="group"
      aria-label={props.label ?? "Node tree scene"}
      data-node-tree-scene=""
      hidden={layoutState.pending}
      style={css`
        box-sizing: border-box;
        position: absolute;
        display: block;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        transform: translate(${transform.x}px, ${transform.y}px) scale(${transform.scale});
        transform-origin: 0 0;

        &[hidden] {
          visibility: hidden;
          pointer-events: none;
        }
      `}
    >
      {presentation === null ? null : <MemoNodeTreeContent
        view={presentation.view}
        treeProps={presentation.treeProps}
        actions={presentation.actions}
      />}
    </div>
  </section>
}

export type NodeTreeComponent = FunctionComponent<NodeTreeProps>
