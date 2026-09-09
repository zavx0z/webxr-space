import {memo} from "@zavx0z/component"
import {MemoLinkProjection} from "../../link-projection/src/link-projection.tsx"
import {linkKind, sameSelection} from "../../../../shared/node-tree/view.ts"
import type {VisibleLink, UiNode, NodeTreeSelection, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

type LinkLayerProps = Readonly<{
  entries: readonly VisibleLink[]
  nodeById: ReadonlyMap<string, UiNode>
  selection?: NodeTreeSelection | undefined
  actions: NodeTreeActions
}>

export function LinkLayer(props: LinkLayerProps) {
  return <div
    data-node-tree-link-layer=""
    style={css`
      box-sizing: border-box;
      display: block;
      width: 0;
      height: 0;
      overflow: visible;
    `}
  >
    {props.entries.map(entry => <MemoLinkProjection
      key={entry.link.id}
      entry={entry}
      kind={linkKind(entry.link, props.nodeById)}
      selection={props.selection}
      actions={props.actions}
    />)}
  </div>
}

export const MemoLinkLayer = memo(LinkLayer, (previous, next) =>
  previous.entries === next.entries &&
  sameSelection(previous.selection, next.selection) && previous.actions === next.actions)
