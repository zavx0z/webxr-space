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
  x: number
}>

export type CoffmanGrahamLayoutEdge = Readonly<LayoutEdge>

export type CoffmanGrahamLayoutOptions = Readonly<{
  /** Maximum number of real nodes in one Coffman–Graham layer. */
  maxNodesPerLayer?: number
  nodeSpacing?: number
  layerSpacing?: number
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

export type CoffmanGrahamLayoutResult = Readonly<{
  direction: "DOWN"
  bounds: LayoutRectangle
  nodes: readonly LayoutNodeGeometry[]
  ports: readonly CoffmanGrahamPortGeometry[]
  edges: readonly CoffmanGrahamEdgeGeometry[]
}>

export type CoffmanGrahamCycleWitness = Readonly<{
  nodeIds: readonly string[]
  edgeIds: readonly string[]
}>

export type CoffmanGrahamLayoutErrorCode = "CYCLE_DETECTED"
