import type {TopDownCycleWitness, TopDownLayoutErrorCode} from "../../../protocol/types/src/top-down.ts"

/** Структурированный отказ до размещения с точным witness цикла. */
export class TopDownLayoutError extends Error {
  override readonly name = "TopDownLayoutError"

  constructor(
    readonly code: TopDownLayoutErrorCode,
    readonly witness: TopDownCycleWitness,
  ) {
    super(`TOP_DOWN_CYCLE_DETECTED: ${witness.nodeIds.join(", ")}`)
  }
}
