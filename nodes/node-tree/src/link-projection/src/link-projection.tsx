import {memo} from "@zavx0z/component"
import {Link} from "../../../../link/src/link.tsx"
import {metadataBoolean, metadataString} from "@nodes/parameters/shared"
import type {SocketKind} from "@nodes/sockets/presets"
import {sameLinkEntry, sameSelection} from "../../../../shared/node-tree/view.ts"
import type {VisibleLink, NodeTreeSelection, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

export function LinkProjection(props: Readonly<{
  entry: VisibleLink
  kind: SocketKind
  selection?: NodeTreeSelection | undefined
  actions: NodeTreeActions
}>) {
  const entry = props.entry
  return <Link
    id={entry.link.id}
    title={metadataString(entry.link.metadata, "label", `${entry.link.from.nodeId} → ${entry.link.to.nodeId}`)}
    kind={props.kind}
    from={entry.link.from}
    to={entry.link.to}
    route={entry.route}
    selected={props.selection?.kind === "link" && props.selection.id === entry.link.id}
    disabled={metadataBoolean(entry.link.metadata, "disabled", false)}
    hidden={entry.culled}
    onActivate={props.actions.selectLink(entry.link.id)}
  />
}

export const MemoLinkProjection = memo(LinkProjection, (previous, next) =>
  sameLinkEntry(previous.entry, next.entry) && previous.kind === next.kind &&
  sameSelection(previous.selection, next.selection) && previous.actions === next.actions)
