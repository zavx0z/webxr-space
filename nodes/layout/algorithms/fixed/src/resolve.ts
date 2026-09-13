import type {ResolvedLayoutGraph} from "../../../protocol/types/src/protocol.ts"
import type {FixedLayoutInput} from "../contract/input.ts"

/** Применяет fixed endpoint law к входу общего solver. */
export function resolveFixedLayoutGraph(graph: FixedLayoutInput): ResolvedLayoutGraph {
  const portById = new Map(graph.ports.map(port => [port.id, port]))
  if (portById.size !== graph.ports.length) throw new Error("Layout port ids must be globally unique")
  const sides = new Map<string, "WEST" | "EAST">()
  for (const edge of graph.edges) {
    setPortSide(sides, edge.sourcePortId, "EAST", edge.id)
    setPortSide(sides, edge.targetPortId, "WEST", edge.id)
    if (!portById.has(edge.sourcePortId)) throw new Error(`Unknown source port: ${edge.id}/${edge.sourcePortId}`)
    if (!portById.has(edge.targetPortId)) throw new Error(`Unknown target port: ${edge.id}/${edge.targetPortId}`)
  }
  return {
    ...graph,
    ports: graph.ports.flatMap(port => {
      const side = sides.get(port.id)
      return side === undefined ? [] : [{...port, side}]
    }),
  }
}

function setPortSide(
  sides: Map<string, "WEST" | "EAST">,
  portId: string,
  side: "WEST" | "EAST",
  edgeId: string,
): void {
  const previous = sides.get(portId)
  if (previous !== undefined && previous !== side) {
    throw new Error(`Port has conflicting edge roles: ${edgeId}/${portId}`)
  }
  sides.set(portId, side)
}
