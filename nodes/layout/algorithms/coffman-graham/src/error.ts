import type {
  CoffmanGrahamCycleWitness,
  CoffmanGrahamLayoutErrorCode,
} from "../../../protocol/types/src/coffman-graham.ts"

/** Структурированный отказ при обнаружении цикла до размещения. */
export class CoffmanGrahamLayoutError extends Error {
  override readonly name = "CoffmanGrahamLayoutError"

  constructor(
    readonly code: CoffmanGrahamLayoutErrorCode,
    readonly witness: CoffmanGrahamCycleWitness,
  ) {
    super(`COFFMAN_GRAHAM_CYCLE_DETECTED: ${witness.nodeIds.join(", ")}`)
  }
}
