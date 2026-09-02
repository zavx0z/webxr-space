export const NODE_SOCKET_KINDS = Object.freeze([
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

export type NodeSocketKind = typeof NODE_SOCKET_KINDS[number]

export const NODE_SOCKET_DIRECTIONS = Object.freeze([
  "input",
  "output",
  "bidirectional",
] as const)

export type NodeSocketDirection = typeof NODE_SOCKET_DIRECTIONS[number]
export type NodeSocketStoryRoute = `socket/${NodeSocketKind}/${NodeSocketDirection}`

export const NODE_SOCKET_LABELS: Readonly<Record<NodeSocketKind, string>> = Object.freeze({
  boolean: "Boolean",
  float: "Float",
  integer: "Integer",
  vector: "Vector",
  rotation: "Rotation",
  color: "Color",
  string: "String",
  menu: "Menu",
  object: "Object",
  collection: "Collection",
  image: "Image",
  material: "Material",
  texture: "Texture",
  geometry: "Geometry",
  matrix: "Matrix",
  shader: "Shader",
  bundle: "Bundle",
  closure: "Closure",
  custom: "Custom",
})

export const NODE_SOCKET_DIRECTION_LABELS: Readonly<Record<NodeSocketDirection, string>> = Object.freeze({
  input: "Вход",
  output: "Выход",
  bidirectional: "Двунаправленный",
})
