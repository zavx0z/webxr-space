import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {NodeChildren} from "@nodes/node/contracts"
import type {NodeView, NodeViewProps} from "../../../../shared/node-tree/contracts.ts"
import {CustomNodeView} from "./custom-node-view/src/custom-node-view.tsx"
import {memo, component} from "@zavx0z/component"
import {ParameterNode} from "@nodes/node/parameter"
import {ContentNode} from "@nodes/node/content"
import {DiagramNode} from "@nodes/node/diagram"
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
  const kind = props.nodeKinds?.get(node.id) ?? (preview === undefined ? "parameter" : "content")
  const custom = props.nodeViews?.get(node.id)
  const rendered: NodeChildren = custom === undefined ? null : renderNodeView(custom, {
    id: node.id, frameId: node.frameId, label: metadataString(node.metadata, "label", node.id),
    title: metadataString(node.metadata, "description", "") || undefined,
    category: metadataString(node.metadata, "category", "") || undefined,
    headerColor: metadataString(node.metadata, "headerColor", "") || undefined,
      rect: entry.rect, selected: props.selection?.kind === "node" && props.selection.id === node.id,
    hidden: entry.culled, collapsed, parameters: node.parameters, sockets: node.sockets,
    snapshot: node, shape: props.nodeShapes?.get(node.id),
    parameterStore: actions.parameterStore(node.id), connectedSocketKeys: view.connectedSocketKeys,
    resolvedSocketSides: view.geometry.portSides,
    contentVisible: props.previewNodeIds?.has(node.id) ?? preview?.enabled ?? true,
    onActivate: actions.selectNode(node.id),
      onCollapseChange: props.onNodeCollapseChange === undefined ? undefined : actions.collapseNode(node.id),
      onContentVisibleChange: props.onNodePreviewChange === undefined ? undefined : actions.previewNode(node.id),
    onParameterInput: actions.parameterInput, onParameterChange: actions.parameterChange,
    onSocketActivate: actions.socket(node.id),
  })
  return <>
    {custom === undefined && kind === "parameter" ? <ParameterNode
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
      parameters={node.parameters}
      sockets={node.sockets}
      parameterStore={actions.parameterStore(node.id)}
      connectedSocketKeys={view.connectedSocketKeys}
      resolvedSocketSides={view.geometry.portSides}
      onActivate={actions.selectNode(node.id)}
      onCollapseChange={props.onNodeCollapseChange === undefined ? undefined : actions.collapseNode(node.id)}
      onParameterInput={actions.parameterInput}
      onParameterChange={actions.parameterChange}
      onSocketActivate={actions.socket(node.id)}
    /> : null}
    {custom === undefined && kind === "content" ? <ContentNode
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
      parameters={node.parameters}
      sockets={node.sockets}
      parameterStore={actions.parameterStore(node.id)}
      connectedSocketKeys={view.connectedSocketKeys}
      resolvedSocketSides={view.geometry.portSides}
      onActivate={actions.selectNode(node.id)}
      onCollapseChange={props.onNodeCollapseChange === undefined ? undefined : actions.collapseNode(node.id)}
      onParameterInput={actions.parameterInput}
      onParameterChange={actions.parameterChange}
      onSocketActivate={actions.socket(node.id)}
      contentVisible={props.previewNodeIds?.has(node.id) ?? preview?.enabled ?? true}
      image={preview?.image}
      onContentVisibleChange={props.onNodePreviewChange === undefined ? undefined : actions.previewNode(node.id)}
    >
      {props.nodeContent?.get(node.id)}
    </ContentNode> : null}
    {custom === undefined && kind === "diagram" ? <DiagramNode
      id={node.id}
      description={metadataString(node.metadata, "description", metadataString(node.metadata, "label", node.id))}
      rect={entry.rect}
      shape={props.nodeShapes?.get(node.id)}
      selected={props.selection?.kind === "node" && props.selection.id === node.id}
      hidden={entry.culled}
      onActivate={actions.selectNode(node.id)}
    /> : null}
    {custom !== undefined ? <CustomNodeView>
      {rendered}
    </CustomNodeView> : null}
  </>
}

function renderNodeView(view: NodeView, props: NodeViewProps): NodeChildren {
  return component(view as unknown as CompiledTemplate<NodeViewProps>, props, props.id) as unknown as JsxSourceElement
}

export const MemoNodeProjection = memo(NodeProjection, sameNodeProjectionProps)

function sameNodeProjectionProps(previous: NodeProjectionProps, next: NodeProjectionProps): boolean {
  const left = previous.treeProps
  const right = next.treeProps
  return sameNodeEntry(previous.entry, next.entry) && previous.actions === next.actions &&
    sameSelection(left.selection, right.selection) &&
      left.nodeKinds === right.nodeKinds && left.nodeShapes === right.nodeShapes && left.nodeContent === right.nodeContent && left.nodeViews === right.nodeViews &&
      left.collapsedNodeIds === right.collapsedNodeIds && left.previewNodeIds === right.previewNodeIds &&
      left.onParameterInput === right.onParameterInput && left.onParameterChange === right.onParameterChange &&
    sameSet(previous.view.connectedSocketKeys, next.view.connectedSocketKeys)
}
