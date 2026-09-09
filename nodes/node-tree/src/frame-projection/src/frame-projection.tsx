import {memo} from "@zavx0z/component"
import {Frame} from "../../../../frame/src/frame.tsx"
import {metadataString} from "@nodes/parameters/shared"
import {sameFrameEntry, sameSelection} from "../../../../shared/node-tree/view.ts"
import type {VisibleFrame, NodeTreeSelection, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

export function FrameProjection(props: Readonly<{
  entry: VisibleFrame
  selection?: NodeTreeSelection | undefined
  actions: NodeTreeActions
}>) {
  const entry = props.entry
  return <Frame
    id={entry.frame.id}
    label={metadataString(entry.frame.metadata, "label", entry.frame.id)}
    title={metadataString(entry.frame.metadata, "description", "") || undefined}
    color={metadataString(entry.frame.metadata, "color", "") || undefined}
    rect={entry.rect}
    parentFrameId={entry.frame.parentFrameId}
    selected={props.selection?.kind === "frame" && props.selection.id === entry.frame.id}
    hidden={entry.culled}
    onActivate={props.actions.selectFrame(entry.frame.id)}
  />
}

export const MemoFrameProjection = memo(FrameProjection, (previous, next) =>
  sameFrameEntry(previous.entry, next.entry) && sameSelection(previous.selection, next.selection) &&
  previous.actions === next.actions)
