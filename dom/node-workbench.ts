import type {
  Document,
  HTMLImageElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"
import {
  type GraphCanvasController,
  type GraphCanvasProps,
} from "./graph-canvas.ts"
import {
  createNodeEditor,
  nodeEditorCss,
  type NodeEditorController,
} from "./node-editor.ts"
import {
  createNodeTreeEditor,
  type NodeTreeEditorController,
  type NodeTreeEditorProps,
} from "./node-tree-editor.ts"
import {
  createParameterSocket,
  type ParameterSocketController,
  type ParameterSocketProps,
} from "./parameter-socket.ts"

export type NodeWorkbenchImage = Readonly<{
  id: string
  src: string
  alt: string
  title: string
  width: number
  height: number
}>

export type NodeWorkbenchPopup = Readonly<{
  visible: boolean
  label: string
  items: readonly Readonly<{id: string; label: string; selected: boolean}>[]
}>

export type NodeWorkbenchProps = Readonly<{
  title: string
  mode: "aggregate" | "node-editor" | "frame" | "link" | "comparison"
  showTree: boolean
  showGraph: boolean
  showParameters: boolean
  tree: NodeTreeEditorProps
  graph: GraphCanvasProps
  parameters: ParameterSocketProps
  images: readonly NodeWorkbenchImage[]
  popup: NodeWorkbenchPopup
}>

export type NodeWorkbenchImageRefs = Readonly<{
  figure: HTMLElement
  image: HTMLImageElement
  caption: HTMLElement
  captionText: Text
}>

export type NodeWorkbenchController = Readonly<{
  element: HTMLElement
  props: NodeWorkbenchProps
  refs: Readonly<{
    root: HTMLElement
    header: HTMLElement
    headerText: Text
    content: HTMLElement
    treeRegion: HTMLElement
    graphRegion: HTMLElement
    parameterRegion: HTMLElement
    mediaRegion: HTMLElement
    popup: HTMLElement
    popupLabel: HTMLElement
    popupLabelText: Text
    popupList: HTMLElement
  }>
  tree: NodeTreeEditorController
  editor: NodeEditorController
  graph: GraphCanvasController
  parameters: ParameterSocketController
  imageRefs(id: string): NodeWorkbenchImageRefs | null
  update(props: NodeWorkbenchProps): void
  dispose(): void
}>

type PopupRecord = {item: HTMLElement; text: Text}

export const nodeWorkbenchCss = [nodeEditorCss, String.raw`
.node-workbench { box-sizing: border-box; display: flex; flex-direction: column; width: 860px; height: 560px; overflow: hidden; border: 1px solid #111; border-radius: 4px; background: #292929; color: #e0e0e0; }
.node-workbench__header { box-sizing: border-box; height: 34px; padding: 8px 10px; background: #242424; color: #7edcec; font-size: 12px; }
.node-workbench__content { box-sizing: border-box; display: flex; flex-direction: row; flex-grow: 1; gap: 10px; min-height: 0; overflow: auto; padding: 10px; }
.node-workbench__region { box-sizing: border-box; display: block; flex-shrink: 0; }
.node-workbench__media { box-sizing: border-box; display: flex; flex-direction: row; flex-shrink: 0; gap: 10px; }
.node-workbench__figure { box-sizing: border-box; display: flex; flex-direction: column; width: 360px; height: 470px; margin: 0; overflow: hidden; border: 1px solid #171717; border-radius: 4px; background: #202020; }
.node-workbench__image { box-sizing: border-box; width: 100%; height: 430px; object-fit: contain; background: #181818; }
.node-workbench__caption { box-sizing: border-box; height: 40px; padding: 10px; color: #a8a8a8; font-size: 10px; }
.node-workbench__popup { position: absolute; box-sizing: border-box; left: 420px; top: 128px; z-index: 20; width: 230px; overflow: hidden; border: 1px solid #111; border-radius: 4px; background: #242424; box-shadow: 0 8px 20px rgba(0, 0, 0, .45); }
.node-workbench__popup-label { box-sizing: border-box; height: 28px; padding: 7px 9px; color: #7edcec; font-size: 10px; }
.node-workbench__popup-list { box-sizing: border-box; display: flex; flex-direction: column; padding: 4px; }
.node-workbench__popup-item { box-sizing: border-box; min-height: 26px; padding: 6px 8px; color: #d7d7d7; font-size: 10px; }
.node-workbench__popup-item[aria-selected="true"] { background: #2d5060; color: #bff5ff; }
[hidden] { display: none; }
`] .join("\n")

export function createNodeWorkbench(
  document: Document,
  initialProps: NodeWorkbenchProps,
): NodeWorkbenchController {
  const initial = normalize(initialProps)
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const content = document.createElement("div")
  const treeRegion = document.createElement("section")
  const graphRegion = document.createElement("section")
  const parameterRegion = document.createElement("section")
  const mediaRegion = document.createElement("section")
  const popup = document.createElement("aside")
  const popupLabel = document.createElement("header")
  const popupLabelText = document.createTextNode("")
  const popupList = document.createElement("div")
  const tree = createNodeTreeEditor(document, initial.tree)
  const editor = createNodeEditor(document, initial.graph)
  const graph = editor.graph
  const parameters = createParameterSocket(document, initial.parameters)
  const images = new Map<string, NodeWorkbenchImageRefs>()
  const popupItems = new Map<string, PopupRecord>()
  let current = initial
  let disposed = false

  root.className = "node-workbench"
  header.className = "node-workbench__header"
  header.appendChild(headerText)
  content.className = "node-workbench__content"
  for (const region of [treeRegion, graphRegion, parameterRegion]) region.className = "node-workbench__region"
  mediaRegion.className = "node-workbench__media"
  treeRegion.appendChild(tree.element)
  graphRegion.appendChild(editor.element)
  parameterRegion.appendChild(parameters.element)
  content.append(treeRegion, graphRegion, parameterRegion, mediaRegion)
  popup.className = "node-workbench__popup"
  popup.setAttribute("role", "dialog")
  popupLabel.className = "node-workbench__popup-label"
  popupLabel.appendChild(popupLabelText)
  popupList.className = "node-workbench__popup-list"
  popupList.setAttribute("role", "listbox")
  popup.append(popupLabel, popupList)
  root.append(header, content, popup)

  const apply = (next: NodeWorkbenchProps): void => document.transaction(() => {
    syncText(headerText, next.title)
    root.setAttribute("data-mode", next.mode)
    tree.update(next.tree)
    editor.update(next.graph)
    parameters.update(next.parameters)
    syncBooleanAttribute(treeRegion, "hidden", !next.showTree)
    syncBooleanAttribute(graphRegion, "hidden", !next.showGraph)
    syncBooleanAttribute(parameterRegion, "hidden", !next.showParameters)
    syncImages(document, mediaRegion, images, next.images)
    reorder(content, next.mode === "comparison"
      ? [mediaRegion, graphRegion, parameterRegion, treeRegion]
      : [treeRegion, graphRegion, parameterRegion, mediaRegion])
    syncText(popupLabelText, next.popup.label)
    syncPopup(document, popupList, popupItems, next.popup.items)
    syncBooleanAttribute(popup, "hidden", !next.popup.visible)
    current = Object.freeze({
      ...next,
      tree: tree.props,
      graph: graph.props,
      parameters: parameters.props,
    })
  })

  const refs = Object.freeze({
    root, header, headerText, content, treeRegion, graphRegion, parameterRegion,
    mediaRegion, popup, popupLabel, popupLabelText, popupList,
  })
  const controller: NodeWorkbenchController = Object.freeze({
    element: root,
    refs,
    tree,
    editor,
    graph,
    parameters,
    get props() { return current },
    imageRefs(id) { return images.get(String(id)) ?? null },
    update(props) {
      if (disposed) throw new Error("NodeWorkbench controller is disposed")
      apply(normalize(props))
    },
    dispose() {
      if (disposed) return
      disposed = true
      tree.dispose()
      editor.dispose()
      parameters.dispose()
    },
  })
  apply(initial)
  return controller
}

function syncImages(
  document: Document,
  parent: HTMLElement,
  records: Map<string, NodeWorkbenchImageRefs>,
  definitions: readonly NodeWorkbenchImage[],
): void {
  const ids = new Set(definitions.map(({id}) => id))
  for (const [id, refs] of records) if (!ids.has(id)) {
    refs.figure.remove()
    records.delete(id)
  }
  for (const definition of definitions) {
    let refs = records.get(definition.id)
    if (!refs) {
      const figure = document.createElement("figure")
      const image = document.createElement("img")
      const caption = document.createElement("figcaption")
      const captionText = document.createTextNode("")
      figure.className = "node-workbench__figure"
      figure.setAttribute("data-image-id", definition.id)
      image.className = "node-workbench__image"
      caption.className = "node-workbench__caption"
      caption.appendChild(captionText)
      figure.append(image, caption)
      refs = Object.freeze({figure, image, caption, captionText})
      records.set(definition.id, refs)
    }
    refs.image.src = definition.src
    refs.image.alt = definition.alt
    refs.image.title = definition.title
    refs.image.width = definition.width
    refs.image.height = definition.height
    syncText(refs.captionText, definition.title)
  }
  reorder(parent, definitions.map(({id}) => records.get(id)!.figure))
}

function syncPopup(
  document: Document,
  parent: HTMLElement,
  records: Map<string, PopupRecord>,
  definitions: NodeWorkbenchPopup["items"],
): void {
  const ids = new Set(definitions.map(({id}) => id))
  for (const [id, record] of records) if (!ids.has(id)) {
    record.item.remove()
    records.delete(id)
  }
  for (const definition of definitions) {
    let record = records.get(definition.id)
    if (!record) {
      const item = document.createElement("div")
      const text = document.createTextNode("")
      item.className = "node-workbench__popup-item"
      item.setAttribute("role", "option")
      item.setAttribute("data-popup-item-id", definition.id)
      item.tabIndex = 0
      item.appendChild(text)
      record = {item, text}
      records.set(definition.id, record)
    }
    syncText(record.text, definition.label)
    record.item.setAttribute("aria-selected", String(definition.selected))
  }
  reorder(parent, definitions.map(({id}) => records.get(id)!.item))
}

function normalize(props: NodeWorkbenchProps): NodeWorkbenchProps {
  if (!props || typeof props !== "object") throw new TypeError("NodeWorkbench props must be an object")
  if (typeof props.title !== "string" || !["aggregate", "node-editor", "frame", "link", "comparison"].includes(props.mode)) {
    throw new TypeError("NodeWorkbench title/mode are invalid")
  }
  for (const [name, value] of [["showTree", props.showTree], ["showGraph", props.showGraph], ["showParameters", props.showParameters]] as const) {
    if (typeof value !== "boolean") throw new TypeError(`NodeWorkbench ${name} must be a boolean`)
  }
  if (!Array.isArray(props.images)) throw new TypeError("NodeWorkbench images must be an array")
  const imageIds = new Set<string>()
  const images = props.images.map((image, index) => {
    assertKey(image.id, `NodeWorkbench image ${index}`)
    if (imageIds.has(image.id)) throw new Error(`NodeWorkbench image id must be unique: ${image.id}`)
    imageIds.add(image.id)
    if (typeof image.src !== "string" || typeof image.alt !== "string" || typeof image.title !== "string") throw new TypeError(`NodeWorkbench image ${image.id} text is invalid`)
    if (!Number.isFinite(image.width) || image.width < 0 || !Number.isFinite(image.height) || image.height < 0) throw new RangeError(`NodeWorkbench image ${image.id} size is invalid`)
    return Object.freeze({...image})
  })
  if (!props.popup || typeof props.popup !== "object" || typeof props.popup.visible !== "boolean" || typeof props.popup.label !== "string" || !Array.isArray(props.popup.items)) {
    throw new TypeError("NodeWorkbench popup is invalid")
  }
  const popupIds = new Set<string>()
  const popupItems = props.popup.items.map((item, index) => {
    assertKey(item.id, `NodeWorkbench popup item ${index}`)
    if (popupIds.has(item.id)) throw new Error(`NodeWorkbench popup item id must be unique: ${item.id}`)
    popupIds.add(item.id)
    if (typeof item.label !== "string" || typeof item.selected !== "boolean") throw new TypeError(`NodeWorkbench popup item ${item.id} is invalid`)
    return Object.freeze({...item})
  })
  return Object.freeze({
    ...props,
    images: Object.freeze(images),
    popup: Object.freeze({...props.popup, items: Object.freeze(popupItems)}),
  })
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
