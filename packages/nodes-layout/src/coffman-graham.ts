import type {
  CoffmanGrahamCycleWitness,
  CoffmanGrahamLayoutErrorCode,
  CoffmanGrahamLayoutGraph,
  CoffmanGrahamLayoutResult,
} from "../types/coffman-graham.ts"
import {solveCoffmanGraham} from "./coffman-graham/solver.ts"

export type {
  CoffmanGrahamCrossingGeometry,
  CoffmanGrahamCurveSegment,
  CoffmanGrahamCycleWitness,
  CoffmanGrahamEdgeGeometry,
  CoffmanGrahamLayoutEdge,
  CoffmanGrahamLayoutErrorCode,
  CoffmanGrahamLayoutGraph,
  CoffmanGrahamLayoutNode,
  CoffmanGrahamLayoutOptions,
  CoffmanGrahamLayoutPort,
  CoffmanGrahamLayoutResult,
  CoffmanGrahamPortGeometry,
  CoffmanGrahamPortSide,
} from "../types/coffman-graham.ts"

export class CoffmanGrahamLayoutError extends Error {
  override readonly name = "CoffmanGrahamLayoutError"

  constructor(
    readonly code: CoffmanGrahamLayoutErrorCode,
    readonly witness: CoffmanGrahamCycleWitness,
  ) {
    super(`COFFMAN_GRAHAM_CYCLE_DETECTED: ${witness.nodeIds.join(", ")}`)
  }
}

/** Calculates one width-bounded Coffman–Graham layered DAG. */
export function layoutCoffmanGraham(graph: CoffmanGrahamLayoutGraph): CoffmanGrahamLayoutResult {
  return solveCoffmanGraham(graph, (witness) => new CoffmanGrahamLayoutError("CYCLE_DETECTED", witness))
}
