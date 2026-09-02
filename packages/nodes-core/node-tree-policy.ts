import type {
  Node,
  NodeTreeDefinition,
  NodeTreeTopologyDelta,
} from "./node-tree.ts"
import type {NodeJsonValue, NodeValueType, ParameterReference} from "./parameter.ts"

export type InternalNodeAppendPlan = Readonly<{
  delta: NodeTreeTopologyDelta
  committed(): void
}>

/** Package-private policy passed only by the canonical createNodeTree factory. */
export type InternalNodeTreePolicy = Readonly<{
  validate(definition: NodeTreeDefinition): void
  delta(
    previous: NodeTreeDefinition,
    next: NodeTreeDefinition,
    revision: number,
    topologyRevision: number,
  ): NodeTreeTopologyDelta
  same(left: NodeTreeDefinition, right: NodeTreeDefinition): boolean
  append?(
    current: NodeTreeDefinition,
    node: Node<ParameterReference, NodeJsonValue, NodeJsonValue>,
    revision: number,
    topologyRevision: number,
  ): InternalNodeAppendPlan
  reconciled?(definition: NodeTreeDefinition): void
  validateParameterValue?(valueType: NodeValueType, value: NodeJsonValue): boolean
}>

const pendingPolicies = new WeakMap<object, InternalNodeTreePolicy>()

export function stageNodeTreePolicy(
  definition: object,
  policy: InternalNodeTreePolicy,
): void {
  if (pendingPolicies.has(definition)) {
    throw new Error("Policy already pending")
  }
  pendingPolicies.set(definition, policy)
}

export function consumeNodeTreePolicy(definition: object): InternalNodeTreePolicy | undefined {
  const policy = pendingPolicies.get(definition)
  pendingPolicies.delete(definition)
  return policy
}

export function cancelNodeTreePolicy(definition: object): void {
  pendingPolicies.delete(definition)
}
