import {computeAdaptiveLayout} from "../src/index.ts"
import type {AdaptiveLayoutDiagnosticsInput} from "./contract/input.ts"
import type {AdaptiveLayoutDiagnosticsOutput} from "./contract/output.ts"

export type {AdaptiveLayoutDiagnosticsInput} from "./contract/input.ts"
export type {AdaptiveLayoutDiagnosticsOutput} from "./contract/output.ts"

/** Возвращает геометрию и ограниченную диагностику перебора сторон. */
export function layoutAdaptiveWithDiagnostics(input: AdaptiveLayoutDiagnosticsInput): AdaptiveLayoutDiagnosticsOutput {
  return computeAdaptiveLayout(input)
}
