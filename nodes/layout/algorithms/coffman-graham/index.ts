/**
Раскладка DAG со слоем ограниченной ширины.

maxNodesPerLayer задаёт от 2 до 16 узлов на слой; результат содержит кубические
маршруты и crossings. Worker использует тот же алгоритм и typed отказ цикла.

@packageDocumentation
*/

import {solveCoffmanGraham} from "./src/solver.ts"
import {CoffmanGrahamLayoutError} from "./src/error.ts"
import type {CoffmanGrahamLayoutInput} from "./contract/input.ts"
import type {CoffmanGrahamLayoutOutput} from "./contract/output.ts"

export type {CoffmanGrahamLayoutInput} from "./contract/input.ts"
export type {CoffmanGrahamLayoutOutput} from "./contract/output.ts"

/**
Вычисляет один DAG с ограничением числа нод в слое.

@param input - Измеренные ноды, порты, связи и параметры слоёв.
@returns Геометрия нод, портов, кубических маршрутов и пересечений.
@throws {@link CoffmanGrahamLayoutError} при цикле.
*/
export function layoutCoffmanGraham(input: CoffmanGrahamLayoutInput): CoffmanGrahamLayoutOutput {
  const {layoutOptions, ...graph} = input
  return solveCoffmanGraham({
    ...graph,
    ...(layoutOptions === undefined ? {} : {layoutOptions}),
  }, witness => new CoffmanGrahamLayoutError("CYCLE_DETECTED", witness))
}
