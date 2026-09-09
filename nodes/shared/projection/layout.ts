import type {LayoutResult} from "@nodes/layout/types"
import type {NodeTreeSnapshot} from "@nodes/tree"
import {nodeTreeLayoutBrand, type NodeTreeLayout, type NodeTreeStore} from "../node-tree/contracts.ts"
import {createNodeGeometryIndex} from "./geometry.ts"
import {registerNodeTreeLayout} from "./layout-state.ts"

export class StaleNodeTreeLayoutError extends Error {
  constructor() {
    super("NodeTree changed while its layout was being computed")
    this.name = "StaleNodeTreeLayoutError"
  }
}

export function createNodeTreeLayout(store: NodeTreeStore, compute: (snapshot: NodeTreeSnapshot) => LayoutResult): NodeTreeLayout
export function createNodeTreeLayout(store: NodeTreeStore, compute: (snapshot: NodeTreeSnapshot) => Promise<LayoutResult>): Promise<NodeTreeLayout>
export function createNodeTreeLayout(store: NodeTreeStore, compute: (snapshot: NodeTreeSnapshot) => LayoutResult | Promise<LayoutResult>): NodeTreeLayout | Promise<NodeTreeLayout>
/**
Captures before calling the layout owner and rejects an outdated async result.
Values remain in the supplied Store; the receipt contains only derived data.
*/
export function createNodeTreeLayout(
  store: NodeTreeStore,
  compute: (snapshot: NodeTreeSnapshot) => LayoutResult | Promise<LayoutResult>,
): NodeTreeLayout | Promise<NodeTreeLayout> {
  const topology = store.getTopologySnapshot()
  const snapshot = store.getSnapshot()
  const complete = (layout: LayoutResult): NodeTreeLayout => {
    if (store.getTopologySnapshot() !== topology || store.getSnapshot() !== snapshot) {
      throw new StaleNodeTreeLayoutError()
    }
    createNodeGeometryIndex(snapshot.nodes, snapshot.frames, snapshot.links, layout)
    const owned = Object.freeze({
      direction: layout.direction,
      bounds: Object.freeze({...layout.bounds}),
      nodes: Object.freeze(layout.nodes.map(node => Object.freeze({...node}))),
      ports: Object.freeze(layout.ports.map(port => Object.freeze({...port}))),
      edges: Object.freeze(layout.edges.map(edge => Object.freeze({
        id: edge.id,
        sections: Object.freeze(edge.sections.map(section => Object.freeze({
          startPoint: Object.freeze({...section.startPoint}),
          endPoint: Object.freeze({...section.endPoint}),
          bendPoints: Object.freeze(section.bendPoints.map(point => Object.freeze({...point}))),
        }))) as LayoutResult["edges"][number]["sections"],
      }))),
    })
    if (store.getTopologySnapshot() !== topology || store.getSnapshot() !== snapshot) {
      throw new StaleNodeTreeLayoutError()
    }
    const receipt: NodeTreeLayout = Object.freeze({[nodeTreeLayoutBrand]: true, snapshot, layout: owned})
    registerNodeTreeLayout(receipt, store, topology)
    return receipt
  }
  const result = compute(snapshot)
  return result !== null && typeof result === "object" && "then" in result
    ? Promise.resolve(result).then(complete)
    : complete(result)
}
