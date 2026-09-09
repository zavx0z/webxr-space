import {memo} from "@zavx0z/component"
import {MemoNodeProjection} from "../../node-projection/src/node-projection.tsx"
import {sameSelection} from "../../../../shared/node-tree/view.ts"
import type {VisibleNode, NodeTreeView, NodeTreeProps, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

type NodeLayerProps = Readonly<{
  entries: readonly VisibleNode[]
  view: NodeTreeView
  treeProps: NodeTreeProps
  actions: NodeTreeActions
}>

export function NodeLayer(props: NodeLayerProps) {
  return <div
    data-node-tree-node-layer=""
    style={css`
      box-sizing: border-box;
      display: block;
      width: 0;
      height: 0;
      overflow: visible;
    `}
  >
    {props.entries.map(entry => <MemoNodeProjection
      key={entry.node.id}
      entry={entry}
      view={props.view}
      treeProps={props.treeProps}
      actions={props.actions}
    />)}
  </div>
}

export const MemoNodeLayer = memo(NodeLayer, (previous, next) => {
  const left = previous.treeProps
  const right = next.treeProps
  return previous.entries === next.entries && previous.actions === next.actions &&
    sameSelection(left.selection, right.selection) &&
    left.nodeKinds === right.nodeKinds && left.nodeShapes === right.nodeShapes && left.nodeContent === right.nodeContent && left.nodeViews === right.nodeViews &&
    left.collapsedNodeIds === right.collapsedNodeIds && left.previewNodeIds === right.previewNodeIds &&
    left.onParameterInput === right.onParameterInput && left.onParameterChange === right.onParameterChange &&
    previous.view.connectedSocketKeys === next.view.connectedSocketKeys &&
    previous.view.geometry === next.view.geometry
})
