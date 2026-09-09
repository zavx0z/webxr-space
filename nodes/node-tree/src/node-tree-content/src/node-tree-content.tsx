import {memo} from "@zavx0z/component"
import {MemoFrameLayer} from "../../frame-layer/src/frame-layer.tsx"
import {MemoLinkLayer} from "../../link-layer/src/link-layer.tsx"
import {MemoNodeLayer} from "../../node-layer/src/node-layer.tsx"
import {sameSelection} from "../../../../shared/node-tree/view.ts"
import type {NodeTreeView, NodeTreeProps, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

type NodeTreeContentProps = Readonly<{
  view: NodeTreeView
  treeProps: NodeTreeProps
  actions: NodeTreeActions
}>

export function NodeTreeContent(props: NodeTreeContentProps) {
  const {view, treeProps, actions} = props
  return <div
    data-node-tree-content=""
    style={css`
      box-sizing: border-box;
      position: absolute;
      display: block;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    `}
  >
    <MemoFrameLayer
      entries={view.frames}
      selection={treeProps.selection}
      actions={actions}
    />
    <MemoLinkLayer
      entries={view.links}
      nodeById={view.nodeById}
      selection={treeProps.selection}
      actions={actions}
    />
    <MemoNodeLayer
      entries={view.nodes}
      view={view}
      treeProps={treeProps}
      actions={actions}
    />
  </div>
}

export const MemoNodeTreeContent = memo(NodeTreeContent, sameNodeTreeContentProps)

function sameNodeTreeContentProps(previous: NodeTreeContentProps, next: NodeTreeContentProps): boolean {
  const left = previous.treeProps
  const right = next.treeProps
  return previous.view === next.view && previous.actions === next.actions &&
    sameSelection(left.selection, right.selection) &&
    left.collapsedNodeIds === right.collapsedNodeIds && left.previewNodeIds === right.previewNodeIds &&
    left.onParameterInput === right.onParameterInput && left.onParameterChange === right.onParameterChange
}
