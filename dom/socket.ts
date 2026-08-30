import type {
  Document,
  HTMLButtonElement,
  HTMLSpanElement,
  Text,
} from "@zavx0z/dom"

export const SOCKET_KINDS = Object.freeze([
  "boolean",
  "float",
  "integer",
  "vector",
  "rotation",
  "color",
  "string",
  "menu",
  "object",
  "collection",
  "image",
  "material",
  "texture",
  "geometry",
  "matrix",
  "shader",
  "bundle",
  "closure",
  "custom",
] as const)

export type SocketKind = typeof SOCKET_KINDS[number]

export const SOCKET_SHAPES = Object.freeze([
  "circle",
  "square",
  "diamond",
  "circle-dot",
  "square-dot",
  "diamond-dot",
  "line",
  "volume-grid",
] as const)

export type SocketShape = typeof SOCKET_SHAPES[number]
export type SocketSide = "left" | "right"
export type SocketDirection = "input" | "output" | "bidirectional"

export type SocketPreset = Readonly<{
  kind: SocketKind
  label: string
  color: string
  shape: SocketShape
}>

export type SocketDefinition = Readonly<{
  id: string
  kind: SocketKind
  direction: SocketDirection
  side: SocketSide
  label: string
  title?: string
  shape?: SocketShape
  selected?: boolean
  disabled?: boolean
}>

export type SocketController = Readonly<{
  element: HTMLButtonElement
  refs: Readonly<{
    button: HTMLButtonElement
    glyph: HTMLSpanElement
    glyphText: Text
    label: HTMLSpanElement
    text: Text
  }>
  definition: SocketDefinition
  update(definition: SocketDefinition): void
  dispose(): void
}>

export const SOCKET_PRESETS: Readonly<Record<SocketKind, SocketPreset>> = Object.freeze({
  boolean: preset("boolean", "Boolean", "#dc5485", "circle"),
  float: preset("float", "Float", "#9e9e9e", "circle"),
  integer: preset("integer", "Integer", "#5c9e6b", "circle"),
  vector: preset("vector", "Vector", "#638aeb", "circle"),
  rotation: preset("rotation", "Rotation", "#946be0", "diamond"),
  color: preset("color", "Color", "#ebc73d", "circle"),
  string: preset("string", "String", "#6bb8b8", "circle"),
  menu: preset("menu", "Menu", "#616b7a", "diamond"),
  object: preset("object", "Object", "#ed7d38", "circle"),
  collection: preset("collection", "Collection", "#e0e0e0", "square"),
  image: preset("image", "Image", "#946bd6", "circle"),
  material: preset("material", "Material", "#d4404d", "circle"),
  texture: preset("texture", "Texture", "#ba7033", "circle"),
  geometry: preset("geometry", "Geometry", "#38ad91", "diamond"),
  matrix: preset("matrix", "Matrix", "#5c91cc", "square"),
  shader: preset("shader", "Shader", "#54c763", "circle"),
  bundle: preset("bundle", "Bundle", "#2e9eae", "square-dot"),
  closure: preset("closure", "Closure", "#ab704a", "diamond-dot"),
  custom: preset("custom", "Custom", "#d659d1", "circle-dot"),
})

export const socketCss = /* @__PURE__ */ String.raw`
.node-socket {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  min-width: 14px;
  height: 14px;
  min-height: 14px;
  padding: 0;
  border: 2px solid #9e9e9e;
  border-radius: 50%;
  background: #202020;
  color: transparent;
  font-size: 1px;
}
.node-socket[data-side="left"] { margin-left: -8px; }
.node-socket[data-side="right"] { margin-right: -8px; }
.node-socket[data-shape="square"],
.node-socket[data-shape="square-dot"] { border-radius: 2px; }
.node-socket[data-shape="diamond"],
.node-socket[data-shape="diamond-dot"] { border-color: transparent; background: transparent; }
.node-socket[data-shape="line"] { width: 14px; height: 6px; min-height: 6px; border-radius: 1px; }
.node-socket[data-shape="volume-grid"] { border-radius: 2px; background: #292929; }
.node-socket__glyph { display: block; width: 4px; height: 4px; border-radius: 50%; background: transparent; }
.node-socket[data-shape="diamond"] .node-socket__glyph,
.node-socket[data-shape="diamond-dot"] .node-socket__glyph,
.node-socket[data-shape="line"] .node-socket__glyph,
.node-socket[data-shape="volume-grid"] .node-socket__glyph {
  width: 14px;
  height: 14px;
  border-radius: 0;
  color: currentcolor;
  font-size: 13px;
  line-height: 14px;
  text-align: center;
}
.node-socket[data-shape="circle-dot"] .node-socket__glyph,
.node-socket[data-shape="square-dot"] .node-socket__glyph,
.node-socket[data-shape="diamond-dot"] .node-socket__glyph { background: currentcolor; }
.node-socket[aria-pressed="true"] { box-shadow: 0 0 7px currentcolor; }
.node-socket[disabled] { opacity: .45; }
.node-socket__label { display: none; }
`

export function socketPreset(kind: SocketKind): SocketPreset {
  return SOCKET_PRESETS[kind]
}

export function createSocket(document: Document, initial: SocketDefinition): SocketController {
  const definition = normalizeSocket(initial)
  const button = document.createElement("button")
  const glyph = document.createElement("span")
  const glyphText = document.createTextNode("")
  const label = document.createElement("span")
  const text = document.createTextNode("")
  const id = definition.id
  let current = definition
  let disposed = false

  button.className = "node-socket"
  button.setAttribute("type", "button")
  glyph.className = "node-socket__glyph"
  glyph.setAttribute("aria-hidden", "true")
  glyph.appendChild(glyphText)
  label.className = "node-socket__label"
  label.appendChild(text)
  button.append(glyph, label)

  const update = (nextDefinition: SocketDefinition): void => {
    if (disposed) throw new Error("Socket controller is disposed")
    const next = normalizeSocket(nextDefinition)
    if (next.id !== id) throw new Error(`Socket id cannot change: ${id} -> ${next.id}`)
    const visual = socketPreset(next.kind)
    const shape = next.shape ?? visual.shape
    button.setAttribute("data-socket-id", next.id)
    button.setAttribute("data-socket-kind", next.kind)
    button.setAttribute("data-direction", next.direction)
    button.setAttribute("data-side", next.side)
    button.setAttribute("data-shape", shape)
    button.setAttribute("aria-label", next.label)
    button.setAttribute("aria-pressed", String(next.selected === true))
    button.title = next.title ?? `${next.label} · ${visual.label}`
    button.disabled = next.disabled === true
    button.setAttribute("style", `border-color: ${visual.color}; color: ${visual.color}`)
    const symbol = shape === "diamond" ? "◆"
      : shape === "diamond-dot" ? "◈"
        : shape === "line" ? "━"
          : shape === "volume-grid" ? "▦"
            : ""
    if (glyphText.data !== symbol) glyphText.data = symbol
    if (text.data !== next.label) text.data = next.label
    current = next
  }

  const refs = Object.freeze({button, glyph, glyphText, label, text})
  const controller: SocketController = Object.freeze({
    element: button,
    refs,
    get definition() { return current },
    update,
    dispose() { disposed = true },
  })
  update(definition)
  return controller
}

function preset(kind: SocketKind, label: string, color: string, shape: SocketShape): SocketPreset {
  return Object.freeze({kind, label, color, shape})
}

function normalizeSocket(definition: SocketDefinition): SocketDefinition {
  if (!definition || typeof definition !== "object") throw new TypeError("Socket definition must be an object")
  if (typeof definition.id !== "string" || definition.id.trim() === "") throw new TypeError("Socket id must be non-empty")
  if (!SOCKET_KINDS.includes(definition.kind)) throw new TypeError(`Unsupported Socket kind: ${definition.kind}`)
  if (!(["input", "output", "bidirectional"] as const).includes(definition.direction)) {
    throw new TypeError(`Unsupported Socket direction: ${definition.direction}`)
  }
  if (definition.side !== "left" && definition.side !== "right") throw new TypeError(`Unsupported Socket side: ${definition.side}`)
  if (typeof definition.label !== "string" || definition.label.trim() === "") throw new TypeError("Socket label must be non-empty")
  if (definition.shape !== undefined && !SOCKET_SHAPES.includes(definition.shape)) throw new TypeError(`Unsupported Socket shape: ${definition.shape}`)
  return Object.freeze({...definition})
}
