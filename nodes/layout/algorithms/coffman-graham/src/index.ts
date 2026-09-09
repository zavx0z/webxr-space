/**
Раскладка DAG с ограничением числа узлов в слое.

Solver сохраняет измеренные размеры, формирует кубические маршруты и crossings,
а циклический вход отклоняется typed ошибкой.

@packageDocumentation
*/
import type {
  CoffmanGrahamCycleWitness,
  CoffmanGrahamLayoutErrorCode,
  CoffmanGrahamLayoutGraph,
  CoffmanGrahamLayoutResult,
} from "../../../protocol/types/src/coffman-graham.ts"
import {solveCoffmanGraham} from "./solver.ts"

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
} from "../../../protocol/types/src/coffman-graham.ts"

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
