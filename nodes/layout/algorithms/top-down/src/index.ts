/**
Числовая вертикальная раскладка DAG.

Портовый вход сохраняет SOUTH/NORTH, контурный — присоединяет связи к фигурам.
Оба возвращают кубические маршруты и typed witness при цикле.

@packageDocumentation
*/
import type {
  TopDownCycleWitness,
  TopDownCurveSegment,
  TopDownEdgeGeometry,
  TopDownLayoutErrorCode,
  TopDownLayoutEdge,
  TopDownLayoutGraph,
  TopDownInput,
  TopDownContourGraph,
  TopDownContourEdge,
  TopDownShape,
  TopDownLayoutResult,
} from "../../../protocol/types/src/top-down.ts"
import {solveTopDownCurves} from "./curve-solver.ts"

export type {
  TopDownCycleWitness,
  TopDownCurveSegment,
  TopDownEdgeGeometry,
  TopDownLayoutEdge,
  TopDownLayoutErrorCode,
  TopDownLayoutGraph,
  TopDownInput,
  TopDownContourGraph,
  TopDownContourEdge,
  TopDownShape,
  TopDownLayoutNode,
  TopDownLayoutOptions,
  TopDownLayoutPort,
  TopDownLayoutResult,
  TopDownPortGeometry,
  TopDownPortSide,
} from "../../../protocol/types/src/top-down.ts"

/**
Структурированный отказ до размещения. Witness указывает цикл; другого
solver или скрытого fallback нет.
*/
export class TopDownLayoutError extends Error {
  override readonly name = "TopDownLayoutError"

  constructor(
    readonly code: TopDownLayoutErrorCode,
    readonly witness: TopDownCycleWitness,
  ) {
    super(`TOP_DOWN_CYCLE_DETECTED: ${witness.nodeIds.join(", ")}`)
  }
}

/**
Вычисляет плоский DAG в локальных CSS-пикселях без viewport и DOM.

Портовый вход сохраняет точные SOUTH/NORTH endpoints. Явный contour-вход
сохраняет порядок nodes/edges и возвращает пересечения фигур отдельно от ports.
Результат детерминирован для одинакового входа, исходные массивы не изменяются.

@param graph - Измеренные фигуры и связи либо измеренные прямоугольники и точные порты.
@returns Геометрия нод и кубических маршрутов; contour содержит также guidePoints/attachment.
@throws {@link TopDownLayoutError} при цикле; Error при недопустимом числовом входе.
*/
export function layoutTopDown(graph: TopDownInput): TopDownLayoutResult {
  return solveTopDownCurves(graph, (witness) => new TopDownLayoutError("CYCLE_DETECTED", witness))
}
