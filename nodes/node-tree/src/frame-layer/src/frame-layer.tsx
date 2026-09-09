import {memo} from "@zavx0z/component"
import {MemoFrameProjection} from "../../frame-projection/src/frame-projection.tsx"
import {sameSelection} from "../../../../shared/node-tree/view.ts"
import type {VisibleFrame, NodeTreeSelection, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

type FrameLayerProps = Readonly<{
  entries: readonly VisibleFrame[]
  selection?: NodeTreeSelection | undefined
  actions: NodeTreeActions
}>

export function FrameLayer(props: FrameLayerProps) {
  return <div
    data-node-tree-frame-layer=""
    style={css`
      box-sizing: border-box;
      display: block;
      width: 0;
      height: 0;
      overflow: visible;
    `}
  >
    {props.entries.map(entry => <MemoFrameProjection
      key={entry.frame.id}
      entry={entry}
      selection={props.selection}
      actions={props.actions}
    />)}
  </div>
}

export const MemoFrameLayer = memo(FrameLayer, (previous, next) =>
  previous.entries === next.entries && sameSelection(previous.selection, next.selection) &&
  previous.actions === next.actions)
