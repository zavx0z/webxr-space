import type {
  LayoutEdge,
  LayoutEdgeGeometry,
  LayoutNodeGeometry,
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
the same intrinsic horizontal offset on both sides.
*/
export type TopDownLayoutPort = Readonly<{
  id: string
  nodeId: string
  x: number
}>

/** Bounded spacing controls in logical pixels. */
export type TopDownLayoutOptions = Readonly<{
  /** Horizontal clearance between adjacent nodes in one rank. */
  nodeSpacing?: number
  /** Minimum empty vertical corridor between adjacent ranks. */
  layerSpacing?: number
  /** Distance between independent route tracks and external lanes. */
  edgeSpacing?: number
  /** Empty content boundary around nodes and routes. */
  padding?: number
}>

/**
Serializable flat DAG accepted by the isolated top-down policy.

Viewport state is intentionally absent: pan, zoom and resize do not invalidate
this intrinsic scene geometry.
*/
export type TopDownLayoutGraph = Readonly<{
  nodes: readonly TopDownLayoutNode[]
  ports: readonly TopDownLayoutPort[]
  edges: readonly LayoutEdge[]
  layoutOptions?: TopDownLayoutOptions
}>

/** Absolute geometry of one exact top or bottom endpoint. */
export type TopDownPortGeometry = Readonly<{
  id: string
  x: number
  y: number
  side: TopDownPortSide
}>

/** Geometry-only result of one deterministic top-down calculation. */
export type TopDownLayoutResult = Readonly<{
  direction: "DOWN"
  bounds: LayoutRectangle
  nodes: readonly LayoutNodeGeometry[]
  ports: readonly TopDownPortGeometry[]
  edges: readonly LayoutEdgeGeometry[]
}>

/** Minimal cycle evidence returned before placement starts. */
export type TopDownCycleWitness = Readonly<{
  nodeIds: readonly string[]
  edgeIds: readonly string[]
}>

export type TopDownLayoutErrorCode = "CYCLE_DETECTED"
