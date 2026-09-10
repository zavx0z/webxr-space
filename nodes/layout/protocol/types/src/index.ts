/**
Публичные serializable договоры числовой раскладки.

Алгоритмы получают measured размеры и port offsets, возвращая geometry без
runtime объектов. Входы вертикальных политик сохраняют собственные ограничения.

@packageDocumentation
*/

export * from "./protocol.ts"
export type {
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
  TopDownLayoutNode,
  TopDownLayoutOptions,
  TopDownLayoutPort,
  TopDownLayoutResult,
  TopDownPortGeometry,
  TopDownPortSide,
} from "./top-down.ts"
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
} from "./coffman-graham.ts"
