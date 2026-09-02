import type {
  LayoutEdge,
  LayoutNodeGeometry,
  LayoutPoint,
  LayoutRectangle,
} from "./protocol.ts"

/** Exact terminal side owned by the top-down policy. */
export type TopDownPortSide = "NORTH" | "SOUTH"

/** Intrinsic leaf rectangle measured before global placement. */
export type TopDownLayoutNode = Readonly<{
  id: string
  width: number
  height: number
}>

/**
Exact visible endpoint measured from the left edge of its node.

The policy resolves a source to `SOUTH` and a target to `NORTH`; `x` remains
the same intrinsic horizontal offset on both sides. One port belongs to exactly
one semantic edge, so physical routes never merge through a reused endpoint.
*/
export type TopDownLayoutPort = Readonly<{
  id: string
  nodeId: string
  x: number
}>

/**
One semantic relation.

All relations participate in the same Dagre ranking, ordering, placement and
rounded-corner pipeline. The top-down policy intentionally has no edge subtype,
constraint flag or alternate router.
*/
export type TopDownLayoutEdge = Readonly<LayoutEdge>

/** Bounded spacing controls in logical pixels. */
export type TopDownLayoutOptions = Readonly<{
  /** Horizontal clearance between adjacent nodes on one rank. */
  nodeSpacing?: number
  /** Vertical clearance between adjacent Dagre ranks. */
  layerSpacing?: number
  /** Clearance Dagre reserves between independent semantic edges. */
  edgeSpacing?: number
  /** Empty content boundary around nodes and routes. */
  padding?: number
}>

/**
Serializable flat DAG accepted by the isolated top-down policy.

Viewport state is intentionally absent: pan, zoom and resize do not invalidate
this intrinsic scene geometry. The production policy accepts at most 128 nodes,
256 ports and 512 edges; larger projections require another bounded policy.
*/
export type TopDownLayoutGraph = Readonly<{
  nodes: readonly TopDownLayoutNode[]
  ports: readonly TopDownLayoutPort[]
  edges: readonly TopDownLayoutEdge[]
  layoutOptions?: TopDownLayoutOptions
}>

/** Absolute geometry of one exact top or bottom endpoint. */
export type TopDownPortGeometry = Readonly<{
  id: string
  x: number
  y: number
  side: TopDownPortSide
}>

/** One cubic Bézier segment in the uniform rounded-corner representation. */
export type TopDownCurveSegment = Readonly<{
  startPoint: LayoutPoint
  controlPoints: readonly [LayoutPoint, LayoutPoint]
  endPoint: LayoutPoint
}>

/**
One independent Dagre edge encoded only as a cubic Bézier chain.

Strictly top-down line sections use degenerate cubics. Only real guide-point
corners bend through equivalent quadratic-to-cubic Bézier segments.
*/
export type TopDownEdgeGeometry = Readonly<{
  id: string
  curves: readonly [TopDownCurveSegment, ...TopDownCurveSegment[]]
}>

/** Geometry-only result of one deterministic top-down calculation. */
export type TopDownLayoutResult = Readonly<{
  direction: "DOWN"
  bounds: LayoutRectangle
  nodes: readonly LayoutNodeGeometry[]
  ports: readonly TopDownPortGeometry[]
  edges: readonly TopDownEdgeGeometry[]
}>

/** Minimal cycle evidence returned before placement starts. */
export type TopDownCycleWitness = Readonly<{
  nodeIds: readonly string[]
  edgeIds: readonly string[]
}>

export type TopDownLayoutErrorCode = "CYCLE_DETECTED"
