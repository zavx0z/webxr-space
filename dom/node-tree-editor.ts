import type {Document, HTMLButtonElement, HTMLInputElement, HTMLElement, Text} from "@zavx0z/dom"

export type NodeTreeParameterItem = Readonly<{id: string; label: string; value: string}>
export type NodeTreeItem = Readonly<{
  id: string
  label: string
  expanded: boolean
  parameters: readonly NodeTreeParameterItem[]
}>
export type NodeTreeEditorProps = Readonly<{
  title: string
  editable: boolean
  query: string
  selectedNodeId: string | null
  nodes: readonly NodeTreeItem[]
}>
export type NodeTreeParameterRefs = Readonly<{
  item: HTMLElement
  label: HTMLElement
  labelText: Text
  input: HTMLInputElement
  remove: HTMLButtonElement
  controlId: string
}>
export type NodeTreeItemRefs = Readonly<{
  item: HTMLElement
  row: HTMLElement
  disclosure: HTMLButtonElement
  label: HTMLButtonElement
  labelText: Text
  remove: HTMLButtonElement
  parameters: HTMLElement
  parameterRefs(id: string): NodeTreeParameterRefs | null
}>
export type NodeTreeEditorController = Readonly<{
  element: HTMLElement
  props: NodeTreeEditorProps
  refs: Readonly<{
    root: HTMLElement
    header: HTMLElement
    headerText: Text
    toolbar: HTMLElement
    search: HTMLInputElement
    addNode: HTMLButtonElement
    tree: HTMLElement
  }>
  nodeRefs(id: string): NodeTreeItemRefs | null
  update(props: NodeTreeEditorProps): void
  dispose(): void
}>

type NodeRecord = {refs: NodeTreeItemRefs; parameters: Map<string, NodeTreeParameterRefs>}
let nextControlId = 1

export const nodeTreeEditorDefaultProps: NodeTreeEditorProps = Object.freeze({
  title: "NodeTree",
  editable: false,
  query: "",
  selectedNodeId: "output",
  nodes: Object.freeze([
    Object.freeze({
      id: "input",
      label: "Input",
      expanded: true,
      parameters: Object.freeze([Object.freeze({id: "value", label: "Value", value: "0.75"})]),
    }),
    Object.freeze({
      id: "output",
      label: "Output",
      expanded: true,
      parameters: Object.freeze([Object.freeze({id: "name", label: "Name", value: "Result"})]),
    }),
  ]),
})

export const nodeTreeEditorCss = String.raw`
.node-tree-dom { box-sizing: border-box; display: flex; flex-direction: column; width: 460px; min-height: 260px; overflow: hidden; border: 1px solid #111; border-radius: 4px; background: #292929; color: #e0e0e0; }
.node-tree-dom__header { box-sizing: border-box; height: 30px; padding: 7px 10px; background: #242424; color: #7edcec; font-size: 12px; }
.node-tree-dom__toolbar { box-sizing: border-box; display: flex; flex-direction: row; gap: 6px; padding: 6px; border-bottom: 1px solid #181818; }
.node-tree-dom__search { box-sizing: border-box; min-width: 0; height: 26px; flex-grow: 1; padding: 4px 7px; background: #1d1d1d; color: #e0e0e0; }
.node-tree-dom__action { box-sizing: border-box; height: 26px; padding: 3px 7px; background: #3b3b3b; color: #e0e0e0; }
.node-tree-dom__tree, .node-tree-dom__parameters { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; padding: 0; }
.node-tree-dom__node { box-sizing: border-box; display: flex; flex-direction: column; border-bottom: 1px solid #202020; }
.node-tree-dom__node-row { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 5px; height: 30px; padding: 3px 6px; }
.node-tree-dom__node[aria-selected="true"] > .node-tree-dom__node-row { background: #2d5060; }
.node-tree-dom__disclosure { width: 24px; height: 24px; background: transparent; color: #a8a8a8; }
.node-tree-dom__node-label { min-width: 0; flex-grow: 1; height: 24px; text-align: left; background: transparent; color: #e0e0e0; }
.node-tree-dom__parameter { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 6px; height: 30px; padding: 3px 6px 3px 36px; }
.node-tree-dom__parameter-label { width: 86px; color: #b8b8b8; font-size: 11px; }
.node-tree-dom__parameter-input { min-width: 0; height: 24px; flex-grow: 1; padding: 3px 6px; background: #202020; color: #e0e0e0; }
[hidden] { display: none; }
`

export function createNodeTreeEditor(
  document: Document,
  initialProps: NodeTreeEditorProps = nodeTreeEditorDefaultProps,
): NodeTreeEditorController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const toolbar = document.createElement("div")
  const search = document.createElement("input")
  const addNode = document.createElement("button")
  const tree = document.createElement("ul")
  const records = new Map<string, NodeRecord>()
  let current = normalize(initialProps)
  let disposed = false
  root.className = "node-tree-dom"
  header.className = "node-tree-dom__header"
  header.appendChild(headerText)
  toolbar.className = "node-tree-dom__toolbar"
  search.className = "node-tree-dom__search"
  search.type = "search"
  search.setAttribute("aria-label", "Поиск узлов")
  addNode.className = "node-tree-dom__action"
  addNode.setAttribute("type", "button")
  addNode.setAttribute("data-action", "add-node")
  addNode.textContent = "Добавить"
  toolbar.append(search, addNode)
  tree.className = "node-tree-dom__tree"
  tree.setAttribute("role", "tree")
  root.append(header, toolbar, tree)

  const apply = (next: NodeTreeEditorProps): void => document.transaction(() => {
    syncText(headerText, next.title)
    search.value = next.query
    addNode.disabled = !next.editable
    syncBooleanAttribute(addNode, "hidden", !next.editable)
    const ids = new Set(next.nodes.map(({id}) => id))
    for (const [id, record] of records) if (!ids.has(id)) {
      record.refs.item.remove()
      records.delete(id)
    }
    for (const node of next.nodes) {
      let record = records.get(node.id)
      if (!record) {
        record = createNodeRecord(document, node.id)
        records.set(node.id, record)
      }
      syncNode(record, node, next)
    }
    reorder(tree, next.nodes.map(({id}) => records.get(id)!.refs.item))
    current = next
  })
  const refs = Object.freeze({root, header, headerText, toolbar, search, addNode, tree})
  const controller: NodeTreeEditorController = Object.freeze({
    element: root,
    refs,
    get props() { return current },
    nodeRefs(id) { return records.get(String(id))?.refs ?? null },
    update(props) {
      if (disposed) throw new Error("NodeTreeEditor controller is disposed")
      apply(normalize(props))
    },
    dispose() { disposed = true },
  })
  apply(current)
  return controller
}

function createNodeRecord(document: Document, nodeId: string): NodeRecord {
  const item = document.createElement("li")
  const row = document.createElement("div")
  const disclosure = document.createElement("button")
  const label = document.createElement("button")
  const labelText = document.createTextNode("")
  const remove = document.createElement("button")
  const parameters = document.createElement("ul")
  const parameterRecords = new Map<string, NodeTreeParameterRefs>()
  item.className = "node-tree-dom__node"
  item.setAttribute("role", "treeitem")
  item.setAttribute("data-node-id", nodeId)
  row.className = "node-tree-dom__node-row"
  disclosure.className = "node-tree-dom__disclosure"
  disclosure.setAttribute("type", "button")
  disclosure.setAttribute("data-action", "toggle-node")
  disclosure.textContent = "▾"
  label.className = "node-tree-dom__node-label"
  label.setAttribute("type", "button")
  label.setAttribute("data-action", "select-node")
  label.appendChild(labelText)
  remove.className = "node-tree-dom__action"
  remove.setAttribute("type", "button")
  remove.setAttribute("data-action", "remove-node")
  remove.textContent = "Удалить"
  parameters.className = "node-tree-dom__parameters"
  parameters.setAttribute("role", "group")
  row.append(disclosure, label, remove)
  item.append(row, parameters)
  const refs: NodeTreeItemRefs = Object.freeze({
    item, row, disclosure, label, labelText, remove, parameters,
    parameterRefs(id) { return parameterRecords.get(String(id)) ?? null },
  })
  return {refs, parameters: parameterRecords}
}

function syncNode(record: NodeRecord, node: NodeTreeItem, props: NodeTreeEditorProps): void {
  const {refs} = record
  syncText(refs.labelText, node.label)
  refs.item.setAttribute("aria-expanded", String(node.expanded))
  refs.item.setAttribute("aria-selected", String(props.selectedNodeId === node.id))
  syncBooleanAttribute(refs.item, "hidden", props.query !== "" && !node.label.toLowerCase().includes(props.query.toLowerCase()))
  refs.disclosure.disabled = false
  refs.disclosure.textContent = node.expanded ? "▾" : "▸"
  refs.remove.disabled = !props.editable
  syncBooleanAttribute(refs.remove, "hidden", !props.editable)
  syncBooleanAttribute(refs.parameters, "hidden", !node.expanded)
  const ids = new Set(node.parameters.map(({id}) => id))
  for (const [id, parameter] of record.parameters) if (!ids.has(id)) {
    parameter.item.remove()
    record.parameters.delete(id)
  }
  for (const parameter of node.parameters) {
    let parameterRefs = record.parameters.get(parameter.id)
    if (!parameterRefs) {
      parameterRefs = createParameterRefs(refs.item.ownerDocument!, node.id, parameter.id)
      record.parameters.set(parameter.id, parameterRefs)
    }
    syncText(parameterRefs.labelText, parameter.label)
    parameterRefs.input.value = parameter.value
    parameterRefs.input.readOnly = !props.editable
    parameterRefs.remove.disabled = !props.editable
    syncBooleanAttribute(parameterRefs.remove, "hidden", !props.editable)
  }
  reorder(refs.parameters, node.parameters.map(({id}) => record.parameters.get(id)!.item))
}

function createParameterRefs(document: Document, nodeId: string, parameterId: string): NodeTreeParameterRefs {
  const item = document.createElement("li")
  const label = document.createElement("label")
  const labelText = document.createTextNode("")
  const input = document.createElement("input")
  const remove = document.createElement("button")
  const controlId = `node-tree-parameter-${nextControlId++}`
  item.className = "node-tree-dom__parameter"
  item.setAttribute("data-node-id", nodeId)
  item.setAttribute("data-parameter-id", parameterId)
  label.className = "node-tree-dom__parameter-label"
  label.setAttribute("for", controlId)
  label.appendChild(labelText)
  input.className = "node-tree-dom__parameter-input"
  input.id = controlId
  input.type = "text"
  remove.className = "node-tree-dom__action"
  remove.setAttribute("type", "button")
  remove.setAttribute("data-action", "remove-parameter")
  remove.textContent = "Удалить"
  item.append(label, input, remove)
  return Object.freeze({item, label, labelText, input, remove, controlId})
}

function normalize(props: NodeTreeEditorProps): NodeTreeEditorProps {
  if (!props || typeof props !== "object") throw new TypeError("NodeTreeEditor props must be an object")
  if (typeof props.title !== "string" || typeof props.query !== "string") throw new TypeError("NodeTreeEditor title/query must be strings")
  if (typeof props.editable !== "boolean") throw new TypeError("NodeTreeEditor editable must be a boolean")
  if (props.selectedNodeId !== null && typeof props.selectedNodeId !== "string") throw new TypeError("NodeTreeEditor selectedNodeId must be string or null")
  if (!Array.isArray(props.nodes)) throw new TypeError("NodeTreeEditor nodes must be an array")
  const nodeIds = new Set<string>()
  const nodes = props.nodes.map((node, index) => {
    assertKey(node.id, `Node ${index}`)
    if (nodeIds.has(node.id)) throw new Error(`NodeTreeEditor Node id must be unique: ${node.id}`)
    nodeIds.add(node.id)
    if (typeof node.label !== "string" || typeof node.expanded !== "boolean" || !Array.isArray(node.parameters)) throw new TypeError(`NodeTreeEditor Node ${node.id} is invalid`)
    const parameterIds = new Set<string>()
    const parameters = node.parameters.map((parameter: NodeTreeParameterItem, parameterIndex: number) => {
      assertKey(parameter.id, `Parameter ${node.id}/${parameterIndex}`)
      if (parameterIds.has(parameter.id)) throw new Error(`NodeTreeEditor Parameter id must be unique in ${node.id}: ${parameter.id}`)
      parameterIds.add(parameter.id)
      if (typeof parameter.label !== "string" || typeof parameter.value !== "string") throw new TypeError(`NodeTreeEditor Parameter ${node.id}/${parameter.id} is invalid`)
      return Object.freeze({...parameter})
    })
    return Object.freeze({...node, parameters: Object.freeze(parameters)})
  })
  if (props.selectedNodeId !== null && !nodeIds.has(props.selectedNodeId)) throw new Error(`NodeTreeEditor selected Node does not exist: ${props.selectedNodeId}`)
  return Object.freeze({...props, nodes: Object.freeze(nodes)})
}

function assertKey(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} id must be non-empty`)
}
function reorder(parent: HTMLElement, children: readonly HTMLElement[]): void {
  let reference = parent.firstChild
  for (const child of children) {
    if (child !== reference) parent.insertBefore(child, reference)
    reference = child.nextSibling
  }
}
function syncText(text: Text, value: string): void { if (text.data !== value) text.data = value }
function syncBooleanAttribute(element: HTMLElement, name: string, value: boolean): void {
  if (value) {
    if (!element.hasAttribute(name)) element.setAttribute(name, "")
  } else element.removeAttribute(name)
}
