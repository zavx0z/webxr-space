import type {
  LayoutEdge,
  LayoutNodeGeometry,
  LayoutPoint,
  LayoutRectangle,
} from "./protocol.ts"

export type CoffmanGrahamPortSide = "NORTH" | "SOUTH"

export type CoffmanGrahamLayoutNode = Readonly<{
  id: string
  width: number
  height: number
}>

export type CoffmanGrahamLayoutPort = Readonly<{
  id: string
  nodeId: string
  /** Measured node-side slot; the policy assigns port IDs by connection order. */
  x: number
}>

export type CoffmanGrahamLayoutEdge = Readonly<LayoutEdge>

export type CoffmanGrahamLayoutOptions = Readonly<{
  /** Maximum number of real nodes in one Coffman–Graham layer. */
  maxNodesPerLayer?: number
  nodeSpacing?: number
  layerSpacing?: number
  /** Minimum Euclidean centerline clearance for compatible route sections. */
  edgeSpacing?: number
  padding?: number
}>

export type CoffmanGrahamLayoutGraph = Readonly<{
  nodes: readonly CoffmanGrahamLayoutNode[]
  ports: readonly CoffmanGrahamLayoutPort[]
  edges: readonly CoffmanGrahamLayoutEdge[]
  layoutOptions?: CoffmanGrahamLayoutOptions
}>

export type CoffmanGrahamPortGeometry = Readonly<{
  id: string
  x: number
  y: number
  side: CoffmanGrahamPortSide
}>

export type CoffmanGrahamCurveSegment = Readonly<{
  startPoint: LayoutPoint
  controlPoints: readonly [LayoutPoint, LayoutPoint]
  endPoint: LayoutPoint
}>

export type CoffmanGrahamEdgeGeometry = Readonly<{
  id: string
  curves: readonly [CoffmanGrahamCurveSegment, ...CoffmanGrahamCurveSegment[]]
}>

/** One classified residual crossing rendered as a stable over/under bridge. */
export type CoffmanGrahamCrossingGeometry = Readonly<{
  overEdgeId: string
  underEdgeId: string
  point: LayoutPoint
}>

export type CoffmanGrahamLayoutResult = Readonly<{
  direction: "DOWN"
  bounds: LayoutRectangle
  nodes: readonly LayoutNodeGeometry[]
  ports: readonly CoffmanGrahamPortGeometry[]
  edges: readonly CoffmanGrahamEdgeGeometry[]
  crossings: readonly CoffmanGrahamCrossingGeometry[]
}>

export type CoffmanGrahamCycleWitness = Readonly<{
  nodeIds: readonly string[]
  edgeIds: readonly string[]
}>

export type CoffmanGrahamLayoutErrorCode = "CYCLE_DETECTED"
