/**
Поиск совместимой стороны каждого точного сокета.

Ограниченный набор кандидатов учитывает capability и allowedSides, возвращает
геометрию и диагностику выбора. Общий сокет сохраняет одну выбранную сторону.
Worker client и executor используют тот же production алгоритм.

@packageDocumentation
*/

import {computeAdaptiveLayout} from "./src/index.ts"
import type {AdaptiveLayoutInput} from "./contract/input.ts"
import type {AdaptiveLayoutOutput} from "./contract/output.ts"

export type {AdaptiveLayoutInput} from "./contract/input.ts"
export type {AdaptiveLayoutOutput} from "./contract/output.ts"

/** Выбирает стороны портов ограниченным поиском и возвращает общую геометрию. */
export function layoutAdaptive(input: AdaptiveLayoutInput): AdaptiveLayoutOutput {
  return computeAdaptiveLayout(input).result
}
