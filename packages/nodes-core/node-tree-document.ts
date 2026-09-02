import type {NodeTreeDocument} from "./node-tree.ts"
import type {Parameter} from "./parameter.ts"
import type {NodeJsonObject, NodeJsonValue} from "./parameter.ts"

export const NODE_TREE_DOCUMENT_FORMAT_VERSION = 2 as const

export type PortableNodeTreeDocument = NodeTreeDocument<Parameter<NodeJsonValue, NodeJsonValue>>

/** Validates the exact Editor shape and returns its canonical document version. */
export function requireNodeTreeDocumentShape(value: NodeJsonValue): 1 | 2 {
  if (!isObject(value) || (value["formatVersion"] !== 1 && value["formatVersion"] !== 2)) shapeError()
  shapeObject(value, 4, ["formatVersion", "frames", "nodes", "links", "scopes", "groups", "templates"])
  let requiredVersion: 1 | 2 = 1
  if (value["scopes"] !== undefined) {
    if (shapeOrdered(value["scopes"], (entry) => {
      const scope = shapeObject(entry, 1, ["kind", "parentScopeId", "instance", "metadata"])
      if (scope["instance"] !== undefined) shapeInstance(scope["instance"])
    }) > 0) requiredVersion = 2
  }
  if (value["groups"] !== undefined) {
    if (shapeOrdered(value["groups"], (entry) => {
      shapeObject(entry, 0, ["scopeId", "parentGroupId", "metadata"])
    }) > 0) requiredVersion = 2
  }
  if (value["templates"] !== undefined) {
    if (shapeOrdered(value["templates"], (entry) => {
      shapeObject(entry, 2, ["version", "kind", "metadata"])
    }) > 0) requiredVersion = 2
  }
  shapeOrdered(value["frames"], (entry) => {
    const frame = shapeObject(entry, 0, ["parentFrameId", "scopeId", "groupId", "metadata"])
    if (frame["scopeId"] !== undefined || frame["groupId"] !== undefined) requiredVersion = 2
  })
  shapeOrdered(value["nodes"], (entry) => {
    const node = shapeObject(entry, 2,
      ["parameters", "sockets", "frameId", "scopeId", "groupId", "instance", "metadata"])
    if (node["scopeId"] !== undefined || node["groupId"] !== undefined || node["instance"] !== undefined) {
      requiredVersion = 2
    }
    if (node["instance"] !== undefined) shapeInstance(node["instance"])
    shapeOrdered(node["parameters"], (parameter) => {
      const record = shapeObject(parameter, 2, ["value", "presentation", "valueType"])
      if (record["valueType"] !== undefined) {
        requiredVersion = 2
        shapeObject(record["valueType"]!, 2, ["id", "version"])
      }
    })
    shapeOrdered(node["sockets"], (socket) => {
      const record = shapeObject(socket, 1, ["direction", "parameterId", "side", "valueType", "metadata"])
      if (record["valueType"] !== undefined) {
        requiredVersion = 2
        shapeObject(record["valueType"]!, 2, ["id", "version"])
      }
    })
  })
  shapeOrdered(value["links"], (entry) => {
    const link = shapeObject(entry, 2, ["from", "to", "metadata"])
    shapeObject(link["from"]!, 2, ["nodeId", "socketId"])
    shapeObject(link["to"]!, 2, ["nodeId", "socketId"])
  })
  return requiredVersion
}

function shapeInstance(value: NodeJsonValue): void {
  shapeObject(value, 4, ["id", "templateId", "templateVersion", "localId"])
}

function shapeOrdered(value: NodeJsonValue | undefined, entry: (value: NodeJsonValue) => void): number {
  const collection = shapeObject(value, 2, ["order", "byId"])
  const order = collection["order"]
  const byId = collection["byId"]
  if (!Array.isArray(order) || !isObject(byId)) shapeError()
  if (Object.keys(order).length !== order.length || order.length !== Object.keys(byId).length ||
    new Set(order).size !== order.length ||
    order.some((id) => typeof id !== "string" || !Object.hasOwn(byId, id))) shapeError()
  for (const id of order) entry(byId[id as string]!)
  return order.length
}

function shapeObject(
  value: NodeJsonValue | undefined,
  required: number,
  members: readonly string[],
): NodeJsonObject {
  if (!isObject(value)) shapeError()
  if (Object.keys(value).some((key) => !members.includes(key)) ||
    members.slice(0, required).some((key) => !Object.hasOwn(value, key))) shapeError()
  return value
}

function shapeError(): never {
  throw new TypeError("Malformed NodeTree document")
}

/** Validates one exact v1/v2 document without normalizing malformed entities. */
export function requirePortableNodeTreeDocument(value: NodeJsonValue): PortableNodeTreeDocument {
  if (!isObject(value) || (value["formatVersion"] !== 1 &&
    value["formatVersion"] !== NODE_TREE_DOCUMENT_FORMAT_VERSION)) malformed()
  const version = value["formatVersion"] as 1 | 2
  requireExactMembers(
    value,
    ["formatVersion", "frames", "nodes", "links"],
    version === 1 ? [] : ["scopes", "groups", "templates"],
    "NodeTree document",
  )
  if (version === 2) {
    if (value["scopes"] !== undefined) validateOrdered(value["scopes"], "Graph Scope", validateScope)
    if (value["groups"] !== undefined) validateOrdered(value["groups"], "Node Group", validateGroup)
    if (value["templates"] !== undefined) validateOrdered(value["templates"], "Node Template", validateTemplate)
  }
  validateOrdered(value["frames"], "Frame", (entry, label) => validateFrame(entry, label, version))
  validateOrdered(value["nodes"], "Node", (entry, label) => validateNode(entry, label, version))
  validateOrdered(value["links"], "Link", validateLink)
  return value as unknown as PortableNodeTreeDocument
}

/** Computes the canonical document version from its actual entity fields. */
export function requiredNodeTreeDocumentFormatVersion(document: NodeJsonObject): 1 | 2 {
  const frames = document["frames"]
  const nodes = document["nodes"]
  if (!isOrdered(frames) || !isOrdered(nodes)) return 1
  if (orderedSize(document["scopes"]) > 0 || orderedSize(document["groups"]) > 0 ||
    orderedSize(document["templates"]) > 0) return 2
  const frameValues = Object.values(frames["byId"] as NodeJsonObject)
  if (frameValues.some((frame) => isObject(frame) &&
    (frame["scopeId"] !== undefined || frame["groupId"] !== undefined))) return 2
  const nodeValues = Object.values(nodes["byId"] as NodeJsonObject)
  return nodeValues.some((node) => isObject(node) && (
    node["scopeId"] !== undefined || node["groupId"] !== undefined || node["instance"] !== undefined ||
    orderedContainsValueType(node["parameters"]) || orderedContainsValueType(node["sockets"])
  )) ? 2 : 1
}

function orderedSize(value: NodeJsonValue | undefined): number {
  return isOrdered(value) ? Object.keys(value["byId"]).length : 0
}

function orderedContainsValueType(value: NodeJsonValue | undefined): boolean {
  if (!isOrdered(value)) return false
  return Object.values(value["byId"] as NodeJsonObject).some((entry) =>
    isObject(entry) && entry["valueType"] !== undefined)
}

function validateOrdered(
  value: NodeJsonValue | undefined,
  label: string,
  validateEntry: (entry: NodeJsonValue, label: string) => void,
): void {
  if (!isOrdered(value)) malformed(`${label} collection must contain exact order/byId`)
  requireExactMembers(value, ["order", "byId"], [], `${label} collection`)
  const seen = new Set<string>()
  for (const id of value["order"] as readonly NodeJsonValue[]) {
    if (typeof id !== "string" || seen.has(id)) malformed(`${label} order contains invalid or duplicate id`)
    seen.add(id)
    const byId = value["byId"] as NodeJsonObject
    if (!Object.hasOwn(byId, id)) malformed(`${label} order references missing byId entry: ${id}`)
    validateEntry(byId[id]!, `${label} ${id}`)
  }
  for (const id of Object.keys(value["byId"] as NodeJsonObject)) {
    if (!seen.has(id)) malformed(`${label} byId entry is missing from order: ${id}`)
  }
}

function validateScope(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["kind"], ["parentScopeId", "instance", "metadata"], label)
  if (entry["kind"] !== "graph" && entry["kind"] !== "subgraph") malformed(`${label} has invalid kind`)
  optionalString(entry["parentScopeId"], `${label}.parentScopeId`)
  if (entry["instance"] !== undefined) validateInstance(entry["instance"], `${label}.instance`)
}

function validateGroup(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, [], ["scopeId", "parentGroupId", "metadata"], label)
  optionalString(entry["scopeId"], `${label}.scopeId`)
  optionalString(entry["parentGroupId"], `${label}.parentGroupId`)
}

function validateTemplate(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["version", "kind"], ["metadata"], label)
  positiveVersion(entry["version"], `${label}.version`)
  if (entry["kind"] !== "node" && entry["kind"] !== "graph") malformed(`${label} has invalid kind`)
}

function validateFrame(value: NodeJsonValue, label: string, version: 1 | 2): void {
  const entry = requireObject(value, label)
  requireExactMembers(
    entry,
    [],
    version === 1
      ? ["parentFrameId", "metadata"]
      : ["parentFrameId", "scopeId", "groupId", "metadata"],
    label,
  )
  optionalString(entry["parentFrameId"], `${label}.parentFrameId`)
  optionalString(entry["scopeId"], `${label}.scopeId`)
  optionalString(entry["groupId"], `${label}.groupId`)
}

function validateNode(value: NodeJsonValue, label: string, version: 1 | 2): void {
  const entry = requireObject(value, label)
  requireExactMembers(
    entry,
    ["parameters", "sockets"],
    version === 1
      ? ["frameId", "metadata"]
      : ["frameId", "scopeId", "groupId", "instance", "metadata"],
    label,
  )
  optionalString(entry["frameId"], `${label}.frameId`)
  optionalString(entry["scopeId"], `${label}.scopeId`)
  optionalString(entry["groupId"], `${label}.groupId`)
  if (entry["instance"] !== undefined) validateInstance(entry["instance"], `${label}.instance`)
  validateOrdered(entry["parameters"], `${label} Parameter`, (parameter, parameterLabel) =>
    validateParameter(parameter, parameterLabel, version))
  validateOrdered(entry["sockets"], `${label} Socket`, (socket, socketLabel) =>
    validateSocket(socket, socketLabel, version))
}

function validateParameter(value: NodeJsonValue, label: string, version: 1 | 2): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["value", "presentation"], version === 1 ? [] : ["valueType"], label)
  if (entry["valueType"] !== undefined) validateValueType(entry["valueType"], `${label}.valueType`)
}

function validateSocket(value: NodeJsonValue, label: string, version: 1 | 2): void {
  const entry = requireObject(value, label)
  requireExactMembers(
    entry,
    ["direction"],
    version === 1
      ? ["parameterId", "side", "metadata"]
      : ["parameterId", "side", "valueType", "metadata"],
    label,
  )
  if (entry["direction"] !== "input" && entry["direction"] !== "output" &&
    entry["direction"] !== "bidirectional") malformed(`${label} has invalid direction`)
  optionalString(entry["parameterId"], `${label}.parameterId`)
  if (entry["side"] !== undefined && entry["side"] !== "left" && entry["side"] !== "right") {
    malformed(`${label} has invalid side`)
  }
  if (entry["valueType"] !== undefined) validateValueType(entry["valueType"], `${label}.valueType`)
}

function validateLink(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["from", "to"], ["metadata"], label)
  validateEndpoint(entry["from"]!, `${label}.from`)
  validateEndpoint(entry["to"]!, `${label}.to`)
}

function validateEndpoint(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["nodeId", "socketId"], [], label)
  requiredString(entry["nodeId"], `${label}.nodeId`)
  requiredString(entry["socketId"], `${label}.socketId`)
}

function validateInstance(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["id", "templateId", "templateVersion", "localId"], [], label)
  requiredString(entry["id"], `${label}.id`)
  requiredString(entry["templateId"], `${label}.templateId`)
  positiveVersion(entry["templateVersion"], `${label}.templateVersion`)
  requiredString(entry["localId"], `${label}.localId`)
}

function validateValueType(value: NodeJsonValue, label: string): void {
  const entry = requireObject(value, label)
  requireExactMembers(entry, ["id", "version"], [], label)
  requiredString(entry["id"], `${label}.id`)
  positiveVersion(entry["version"], `${label}.version`)
}

function requireObject(value: NodeJsonValue, label: string): NodeJsonObject {
  if (!isObject(value)) malformed(`${label} must be an object`)
  return value
}

function requireExactMembers(
  value: NodeJsonObject,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional])
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) malformed(`${label} contains unknown member: ${key}`)
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) malformed(`${label} is missing member: ${key}`)
  }
}

function requiredString(value: NodeJsonValue | undefined, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) malformed(`${label} must be a non-empty string`)
}

function optionalString(value: NodeJsonValue | undefined, label: string): void {
  if (value !== undefined) requiredString(value, label)
}

function positiveVersion(value: NodeJsonValue | undefined, label: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    malformed(`${label} must be a positive safe integer`)
  }
}

function malformed(message?: string): never {
  throw new TypeError(message ??
    `Unsupported or malformed NodeTree document format; expected 1 or ${NODE_TREE_DOCUMENT_FORMAT_VERSION}`)
}

function isOrdered(value: NodeJsonValue | undefined): value is NodeJsonObject & Readonly<{
  order: readonly NodeJsonValue[]
  byId: NodeJsonObject
}> {
  return isObject(value) && Array.isArray(value["order"]) &&
    value["order"].every((entry) => typeof entry === "string") && isObject(value["byId"])
}

function isObject(value: NodeJsonValue | undefined): value is NodeJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
