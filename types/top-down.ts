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
One relation and its participation in the tidy forest.

`constraint=true` means the edge is the single parent relation of its target
and therefore owns node placement. `constraint=false` preserves the semantic
relation but overlays it without forcing unrelated nodes onto common levels.
*/
export type TopDownLayoutEdge = Readonly<LayoutEdge & {
  constraint: boolean
}>

/** Bounded spacing controls in logical pixels. */
export type TopDownLayoutOptions = Readonly<{
  /** Horizontal clearance between adjacent subtrees. */
  nodeSpacing?: number
  /** Minimum vertical clearance between a parent and its children. */
  layerSpacing?: number
  /** Distance between independent external spline rails. */
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

/** One cubic segment of the single top-down spline connection type. */
export type TopDownCurveSegment = Readonly<{
  startPoint: LayoutPoint
  controlPoints: readonly [LayoutPoint, LayoutPoint]
  endPoint: LayoutPoint
}>

/** Routed semantic edge expressed only as a continuous cubic spline chain. */
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
