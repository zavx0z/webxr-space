import {memo} from "@zavx0z/component"
import {Node} from "../../../../node/src/node.tsx"
import {metadataBoolean, metadataString} from "@nodes/parameters/shared"
import {nodePreview, sameNodeEntry, sameSelection, sameSet} from "../../../../shared/node-tree/view.ts"
import type {VisibleNode, NodeTreeView, NodeTreeProps, NodeTreeActions} from "../../../../shared/node-tree/contracts.ts"

type NodeProjectionProps = Readonly<{
  entry: VisibleNode
  view: NodeTreeView
  treeProps: NodeTreeProps
  actions: NodeTreeActions
}>

export function NodeProjection(projection: NodeProjectionProps) {
  const {entry, view, actions} = projection
  const props = projection.treeProps
  const node = entry.node
  const collapsed = props.collapsedNodeIds?.has(node.id) ?? metadataBoolean(node.metadata, "collapsed", false)
  const preview = nodePreview(node, props.previewNodeIds)
  return <Node
    id={node.id}
    frameId={node.frameId}
    label={metadataString(node.metadata, "label", node.id)}
    title={metadataString(node.metadata, "description", "") || undefined}
    category={metadataString(node.metadata, "category", "") || undefined}
    headerColor={metadataString(node.metadata, "headerColor", "") || undefined}
    rect={entry.rect}
    selected={props.selection?.kind === "node" && props.selection.id === node.id}
    hidden={entry.culled}
    collapsed={collapsed}
    preview={preview}
    parameters={node.parameters}
    sockets={node.sockets}
    parameterStore={actions.parameterStore(node.id)}
    connectedSocketKeys={view.connectedSocketKeys}
    resolvedSocketSides={view.geometry.portSides}
    onActivate={actions.selectNode(node.id)}
    onCollapseChange={actions.collapseNode(node.id)}
    onPreviewChange={actions.previewNode(node.id)}
    onParameterInput={actions.parameterInput}
    onParameterChange={actions.parameterChange}
    onSocketActivate={actions.socket(node.id)}
  />
}

export const MemoNodeProjection = memo(NodeProjection, sameNodeProjectionProps)

function sameNodeProjectionProps(previous: NodeProjectionProps, next: NodeProjectionProps): boolean {
  const left = previous.treeProps
  const right = next.treeProps
  return sameNodeEntry(previous.entry, next.entry) && previous.actions === next.actions &&
    sameSelection(left.selection, right.selection) &&
    left.collapsedNodeIds === right.collapsedNodeIds && left.previewNodeIds === right.previewNodeIds &&
    left.onParameterInput === right.onParameterInput && left.onParameterChange === right.onParameterChange &&
    sameSet(previous.view.connectedSocketKeys, next.view.connectedSocketKeys)
}
