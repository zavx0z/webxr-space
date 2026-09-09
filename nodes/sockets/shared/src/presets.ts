/**
Предустановки определяют цвет и начальную форму Socket. Направление,
сторона и состояние задаются независимо; виды не создают отдельные компоненты.

@packageDocumentation
*/

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

export function socketPreset(kind: SocketKind): SocketPreset {
  if (!SOCKET_KINDS.includes(kind)) throw new TypeError(`Unsupported Socket kind: ${kind}`)
  return SOCKET_PRESETS[kind]
}

function preset(kind: SocketKind, label: string, color: string, shape: SocketShape): SocketPreset {
  return Object.freeze({kind, label, color, shape})
}
