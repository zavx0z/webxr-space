import type {AdaptiveNoLegalSideWitness} from "../types/adaptive.ts"

/** Машиночитаемый отказ при отсутствии допустимого назначения сторон. */
export class AdaptiveLayoutError extends Error {
  readonly code = "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"

  constructor(readonly witness: AdaptiveNoLegalSideWitness) {
    super(`${witness.code}: ${witness.reason}`)
    this.name = "AdaptiveLayoutError"
  }
}
