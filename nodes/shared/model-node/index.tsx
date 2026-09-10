import type {GraphNodeProps} from "../graph/contracts.ts"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {NodeChildren} from "@nodes/node/contracts"
import type {NodeView, NodeViewProps} from "../node-tree/contracts.ts"
import {CustomNodeView} from "./custom/index.tsx"
import {component} from "@zavx0z/component"
import {ParameterNode} from "@nodes/node/parameter"
import {ContentNode} from "@nodes/node/content"
import {DiagramNode} from "@nodes/node/diagram"
import {metadataBoolean, metadataString} from "@nodes/parameters/shared"
import {nodePreview} from "../node-tree/view.ts"
import type {VisibleNode, NodeTreeView, NodeTreeProps, NodeTreeActions} from "../node-tree/contracts.ts"

export type ModelNodeData = Readonly<{
  node: VisibleNode["node"]
  connectedSocketKeys: ReadonlySet<string>
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  treeProps: Omit<NodeTreeProps, "layout">
  actions: NodeTreeActions
}>

export function ModelNode(input: GraphNodeProps) {
  const projection = input.data as ModelNodeData
  const actions = {...projection.actions, selectNode: (_id: string) => input.onActivate}
  const props: Omit<NodeTreeProps, "layout"> = {...projection.treeProps, selection: input.selected ? {kind: "node", id: input.id} : null}
  const node = projection.node
  const collapsed = props.collapsedNodeIds?.has(node.id) ?? metadataBoolean(node.metadata, "collapsed", false)
  const preview = nodePreview(node, props.previewNodeIds)
  const kind = props.nodeKinds?.get(node.id) ?? (preview === undefined ? "parameter" : "content")
  const custom = props.nodeViews?.get(node.id)
  const rendered: NodeChildren = custom === undefined ? null : renderNodeView(custom, {
    id: node.id, frameId: node.frameId, label: metadataString(node.metadata, "label", node.id),
    title: metadataString(node.metadata, "description", "") || undefined,
    category: metadataString(node.metadata, "category", "") || undefined,
    headerColor: metadataString(node.metadata, "headerColor", "") || undefined,
      rect: input.rect, intrinsic: input.intrinsic, elementRef: input.elementRef, selected: props.selection?.kind === "node" && props.selection.id === node.id,
    hidden: input.hidden, collapsed, parameters: node.parameters, sockets: node.sockets,
    snapshot: node, shape: props.nodeShapes?.get(node.id),
    parameterStore: actions.parameterStore(node.id), connectedSocketKeys: projection.connectedSocketKeys,
    resolvedSocketSides: projection.resolvedSocketSides,
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
      rect={input.rect}
      intrinsic={input.intrinsic}
      elementRef={input.elementRef}
      selected={props.selection?.kind === "node" && props.selection.id === node.id}
      hidden={input.hidden}
      collapsed={collapsed}
      parameters={node.parameters}
      sockets={node.sockets}
      parameterStore={actions.parameterStore(node.id)}
      connectedSocketKeys={projection.connectedSocketKeys}
      resolvedSocketSides={projection.resolvedSocketSides}
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
      rect={input.rect}
      intrinsic={input.intrinsic}
      elementRef={input.elementRef}
      selected={props.selection?.kind === "node" && props.selection.id === node.id}
      hidden={input.hidden}
      collapsed={collapsed}
      parameters={node.parameters}
      sockets={node.sockets}
      parameterStore={actions.parameterStore(node.id)}
      connectedSocketKeys={projection.connectedSocketKeys}
      resolvedSocketSides={projection.resolvedSocketSides}
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
      rect={input.rect}
      intrinsic={input.intrinsic}
      elementRef={input.elementRef}
      shape={props.nodeShapes?.get(node.id)}
      selected={props.selection?.kind === "node" && props.selection.id === node.id}
      hidden={input.hidden}
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
