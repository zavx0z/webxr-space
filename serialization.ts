import {
  type Ordered,
} from "./node-tree.ts"
import {
  createNodeTree,
  createValidatedParameter,
  type FoundationNodeTreeOptions,
} from "./foundation.ts"
import type {NodeTree} from "./node-tree.ts"
import {
  Parameter,
  type NodeJsonValue,
} from "./parameter.ts"
import {applyJsonPatch} from "./json-patch.ts"
import {
  requirePortableNodeTreeDocument,
  type PortableNodeTreeDocument,
} from "./node-tree-document.ts"

export {
  NODE_TREE_DOCUMENT_FORMAT_VERSION,
} from "./node-tree-document.ts"

export type PortableNodeTree = NodeTree<Parameter<NodeJsonValue, NodeJsonValue>>
export type {PortableNodeTreeDocument} from "./node-tree-document.ts"

/** Serializes only the ID-addressed authoring document, never runtime listeners or projections. */
export function serializeNodeTreeDocument(
  document: PortableNodeTreeDocument,
  options: FoundationNodeTreeOptions = {},
): string {
  const tree = hydrateNodeTree(document as unknown as NodeJsonValue, options)
  const canonical = tree.document()
  tree.dispose()
  return JSON.stringify(canonical)
}

/**
 * Hydrates the current exact format into the one canonical NodeTree store.
 * Unknown versions and malformed order/byId indexes fail before publication.
 */
export function hydrateNodeTree(
  source: string | NodeJsonValue,
  options: FoundationNodeTreeOptions = {},
): PortableNodeTree {
  const value = applyJsonPatch(typeof source === "string" ? parseJson(source) : source, [])
  const document = requirePortableNodeTreeDocument(value)
  const scopes = document.scopes === undefined
    ? undefined
    : entries(document.scopes, "Graph Scope").map(([id, scope]) => ({id, ...scope}))
  const groups = document.groups === undefined
    ? undefined
    : entries(document.groups, "Node Group").map(([id, group]) => ({id, ...group}))
  const templates = document.templates === undefined
    ? undefined
    : entries(document.templates, "Node Template").map(([id, template]) => ({id, ...template}))
  const frames = entries(document.frames, "Frame").map(([id, frame]) => ({id, ...frame}))
  const nodes = entries(document.nodes, "Node").map(([id, node]) => ({
    id,
    ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
    ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
    ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
    ...(node.instance === undefined ? {} : {instance: node.instance}),
    parameters: entries(node.parameters, `Parameter on ${id}`).map(([parameterId, parameter]) =>
      parameter.valueType !== undefined && options.validateParameterValue !== undefined
        ? createValidatedParameter(
            parameterId,
            parameter.value,
            parameter.presentation,
            parameter.valueType,
            options.validateParameterValue,
          )
        : new Parameter(
            parameterId,
            parameter.value,
            parameter.presentation,
            parameter.valueType,
          )),
    sockets: entries(node.sockets, `Socket on ${id}`).map(([socketId, socket]) => ({
      id: socketId,
      ...socket,
    })),
    ...(node.metadata === undefined ? {} : {metadata: node.metadata}),
  }))
  const links = entries(document.links, "Link").map(([id, link]) => ({id, ...link}))
  return createNodeTree({
    ...(scopes === undefined ? {} : {scopes}),
    ...(groups === undefined ? {} : {groups}),
    ...(templates === undefined ? {} : {templates}),
    frames,
    nodes,
    links,
  }, options)
}

function parseJson(source: string): NodeJsonValue {
  try {
    return JSON.parse(source) as NodeJsonValue
  } catch (error) {
    throw new TypeError("Serialized NodeTree document must be valid JSON", {cause: error})
  }
}

function entries<T>(ordered: Ordered<T>, label: string): readonly (readonly [string, T])[] {
  const seen = new Set<string>()
  const result = ordered.order.map((id) => {
    if (seen.has(id)) throw new Error(`${label} order contains duplicate id: ${id}`)
    seen.add(id)
    if (!Object.hasOwn(ordered.byId, id)) throw new Error(`${label} order references missing byId entry: ${id}`)
    return [id, ordered.byId[id] as T] as const
  })
  for (const id of Object.keys(ordered.byId)) {
    if (!seen.has(id)) throw new Error(`${label} byId entry is missing from order: ${id}`)
  }
  return result
}
