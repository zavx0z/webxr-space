/**
Вертикальная раскладка DAG с кубическими маршрутами.

Точные порты направляются SOUTH → NORTH, contour-вход использует границы фигур.
Цикл отклоняется с typed witness.
Worker client и executor сохраняют результат и ошибки прямого вызова.

@packageDocumentation
*/

import {solveTopDownCurves} from "./src/curve-solver.ts"
import {TopDownLayoutError} from "./src/error.ts"
import type {TopDownLayoutInput} from "./contract/input.ts"
import type {TopDownLayoutOutput} from "./contract/output.ts"

export type {TopDownLayoutInput} from "./contract/input.ts"
export type {TopDownLayoutOutput} from "./contract/output.ts"

/**
Вычисляет плоский DAG в локальных CSS-пикселях без viewport и DOM.

@param input - Обёртка портового либо контурного измеренного графа.
@returns Геометрия нод и кубических маршрутов; contour сохраняет guide points и attachment.
@throws {@link TopDownLayoutError} при цикле.
*/
export function layoutTopDown(input: TopDownLayoutInput): TopDownLayoutOutput {
  return solveTopDownCurves(input.graph, witness => new TopDownLayoutError("CYCLE_DETECTED", witness))
}
