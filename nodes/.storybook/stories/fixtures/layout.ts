import type {AdaptiveLayoutGraph} from "@zavx0z/layout/adaptive"
import type {LayoutDirection, LayoutGraph} from "@zavx0z/layout/types"
import type {
  NodeTreeDefinition,
  Socket,
  SocketDirection,
} from "@zavx0z/nodetree"
import {
  planNodeGeometry,
  type NodeGeometryPlan,
} from "../../../src/projection/metrics.ts"

export type LayoutStoryRoute =
  | "layout/fixed/baseline/right"
  | "layout/fixed/baseline/down"
  | "layout/adaptive/shared/right"
  | "layout/adaptive/shared/down"
  | "layout/adaptive/compound/right"
  | "layout/adaptive/compound/down"

type FixedLayoutStoryFixture = Readonly<{
  policy: "fixed"
  route: LayoutStoryRoute
  label: string
  expectedDirection: LayoutDirection
  graph: LayoutGraph
  tree: NodeTreeDefinition
}>

type AdaptiveLayoutStoryFixture = Readonly<{
  policy: "adaptive"
  route: LayoutStoryRoute
  label: string
  expectedDirection: LayoutDirection
  graph: AdaptiveLayoutGraph
  tree: NodeTreeDefinition
}>

export type LayoutStoryFixture = FixedLayoutStoryFixture | AdaptiveLayoutStoryFixture

const fixedGeometry = Object.freeze({
  producer: socketNodeGeometry(188, ["producer/out-primary", "producer/out-secondary"]),
  observer: socketNodeGeometry(164, ["observer/in-reply"]),
  consumerA: socketNodeGeometry(184, ["consumer-a/out-reply", "consumer-a/in-primary"]),
  consumerB: socketNodeGeometry(172, ["consumer-b/in-secondary"]),
})

const fixedTopology = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({id: "source-zone", width: 176, height: 58, contentHeight: 38}),
    layoutNode("producer", fixedGeometry.producer, "source-zone"),
    layoutNode("observer", fixedGeometry.observer, "source-zone"),
    Object.freeze({id: "target-zone", width: 176, height: 58, contentHeight: 38}),
    layoutNode("consumer-a", fixedGeometry.consumerA, "target-zone"),
    layoutNode("consumer-b", fixedGeometry.consumerB, "target-zone"),
  ]),
  ports: Object.freeze([
    layoutPort("producer/out-primary", "producer", fixedGeometry.producer),
    layoutPort("producer/out-secondary", "producer", fixedGeometry.producer),
    layoutPort("consumer-a/in-primary", "consumer-a", fixedGeometry.consumerA),
    layoutPort("consumer-a/out-reply", "consumer-a", fixedGeometry.consumerA),
    layoutPort("consumer-b/in-secondary", "consumer-b", fixedGeometry.consumerB),
    layoutPort("observer/in-reply", "observer", fixedGeometry.observer),
  ]),
  edges: Object.freeze([
    Object.freeze({id: "primary", sourcePortId: "producer/out-primary", targetPortId: "consumer-a/in-primary"}),
    Object.freeze({id: "secondary", sourcePortId: "producer/out-secondary", targetPortId: "consumer-b/in-secondary"}),
    Object.freeze({id: "reply", sourcePortId: "consumer-a/out-reply", targetPortId: "observer/in-reply"}),
  ]),
  layoutOptions: Object.freeze({spacing: 24, layerSpacing: 36, padding: 24, clearance: 24}),
}) satisfies Omit<LayoutGraph, "viewport">

const adaptiveGeometry = Object.freeze({
  source: socketNodeGeometry(168, ["source/shared"]),
  targetA: socketNodeGeometry(176, ["target-a/in"]),
  targetB: socketNodeGeometry(160, ["target-b/in"]),
})

const adaptiveTopology = Object.freeze({
  nodes: Object.freeze([
    layoutNode("source", adaptiveGeometry.source),
    layoutNode("target-a", adaptiveGeometry.targetA),
    layoutNode("target-b", adaptiveGeometry.targetB),
  ]),
  ports: Object.freeze([
    Object.freeze({
      id: "source/shared",
      nodeId: "source",
      y: socketY(adaptiveGeometry.source, "source/shared"),
      capability: "inout" as const,
      allowedSides: Object.freeze(["WEST", "EAST"] as const),
    }),
    Object.freeze({
      id: "target-a/in",
      nodeId: "target-a",
      y: socketY(adaptiveGeometry.targetA, "target-a/in"),
      capability: "in" as const,
      allowedSides: Object.freeze(["WEST"] as const),
    }),
    Object.freeze({
      id: "target-b/in",
      nodeId: "target-b",
      y: socketY(adaptiveGeometry.targetB, "target-b/in"),
      capability: "in" as const,
      allowedSides: Object.freeze(["WEST"] as const),
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({id: "to-a", sourcePortId: "source/shared", targetPortId: "target-a/in"}),
    Object.freeze({id: "to-b", sourcePortId: "source/shared", targetPortId: "target-b/in"}),
  ]),
  layoutOptions: Object.freeze({spacing: 24, layerSpacing: 36, padding: 24, clearance: 24}),
}) satisfies Omit<AdaptiveLayoutGraph, "viewport">

function fixedFixture(
  route: LayoutStoryRoute,
  label: string,
  expectedDirection: LayoutDirection,
  viewport: LayoutGraph["viewport"],
): FixedLayoutStoryFixture {
  const graph = Object.freeze({...fixedTopology, viewport})
  return Object.freeze({policy: "fixed", route, label, expectedDirection, graph, tree: createTreeDefinition(graph)})
}

function adaptiveFixture(
  route: LayoutStoryRoute,
  label: string,
  expectedDirection: LayoutDirection,
  viewport: AdaptiveLayoutGraph["viewport"],
  compound: boolean,
): AdaptiveLayoutStoryFixture {
  const nodes = compound
    ? Object.freeze([
        Object.freeze({id: "source-zone", width: 176, height: 58, contentHeight: 38}),
        Object.freeze({id: "target-zone", width: 176, height: 58, contentHeight: 38}),
        ...adaptiveTopology.nodes.map(node => Object.freeze({
          ...node,
          parentId: node.id === "source" ? "source-zone" : "target-zone",
        })),
      ])
    : adaptiveTopology.nodes
  const graph = Object.freeze({...adaptiveTopology, nodes, viewport})
  return Object.freeze({policy: "adaptive", route, label, expectedDirection, graph, tree: createTreeDefinition(graph)})
}

const fixtures = Object.freeze([
  fixedFixture("layout/fixed/baseline/right", "Фиксированная основа", "RIGHT", {width: 1180, height: 680}),
  fixedFixture("layout/fixed/baseline/down", "Фиксированная основа", "DOWN", {width: 520, height: 920}),
  adaptiveFixture("layout/adaptive/shared/right", "Общий сокет", "RIGHT", {width: 960, height: 560}, false),
  adaptiveFixture("layout/adaptive/shared/down", "Общий сокет", "DOWN", {width: 480, height: 820}, false),
  adaptiveFixture("layout/adaptive/compound/right", "Контейнеры", "RIGHT", {width: 960, height: 560}, true),
  adaptiveFixture("layout/adaptive/compound/down", "Контейнеры", "DOWN", {width: 480, height: 820}, true),
]) satisfies readonly LayoutStoryFixture[]

export function getLayoutStoryFixture(route: string): LayoutStoryFixture {
  const fixture = fixtures.find(candidate => candidate.route === route)
  if (fixture === undefined) throw new Error(`Неизвестный пример раскладки: ${route}`)
  return fixture
}

function createTreeDefinition(graph: LayoutGraph | AdaptiveLayoutGraph): NodeTreeDefinition {
  const frameIds = new Set(graph.nodes.flatMap(node => node.parentId === undefined ? [] : [node.parentId]))
  const roles = collectPortRoles(graph)
  const frames = graph.nodes.filter(node => frameIds.has(node.id)).map(node => Object.freeze({
    id: node.id,
    ...(node.parentId === undefined ? {} : {parentFrameId: node.parentId}),
    metadata: Object.freeze({label: entityLabel(node.id)}),
  }))
  const nodes = graph.nodes.filter(node => !frameIds.has(node.id)).map(node => Object.freeze({
    id: node.id,
    ...(node.parentId === undefined ? {} : {frameId: node.parentId}),
    metadata: Object.freeze({
      label: entityLabel(node.id),
      description: `${entityLabel(node.id)} · вычисленная геометрия`,
      category: "layout",
      headerColor: node.id === "source" || node.id === "producer" ? "#5b466b" : "#4b5f72",
    }),
    sockets: Object.freeze(graph.ports.filter(port => port.nodeId === node.id).map(port => socketForPort(port, roles))),
  }))
  const links = Object.freeze(graph.edges.map(edge => Object.freeze({
    id: edge.id,
    from: endpoint(edge.sourcePortId, graph),
    to: endpoint(edge.targetPortId, graph),
    metadata: Object.freeze({label: edge.id, kind: "float"}),
  })))
  const tree = Object.freeze({frames: Object.freeze(frames), nodes: Object.freeze(nodes), links})
  assertEverySocketIsLinked(tree)
  return tree
}

type PortRoles = ReadonlyMap<string, Readonly<{source: boolean; target: boolean}>>

function collectPortRoles(graph: LayoutGraph | AdaptiveLayoutGraph): PortRoles {
  const mutable = new Map<string, {source: boolean; target: boolean}>()
  for (const edge of graph.edges) {
    const source = mutable.get(edge.sourcePortId) ?? {source: false, target: false}
    source.source = true
    mutable.set(edge.sourcePortId, source)
    const target = mutable.get(edge.targetPortId) ?? {source: false, target: false}
    target.target = true
    mutable.set(edge.targetPortId, target)
  }
  return mutable
}

function socketForPort(
  port: (LayoutGraph | AdaptiveLayoutGraph)["ports"][number],
  roles: PortRoles,
): Socket {
  const role = roles.get(port.id)
  if (role === undefined) throw new Error(`Сокет примера не связан: ${port.id}`)
  const capability = "capability" in port ? port.capability : undefined
  const direction: SocketDirection = capability === "inout" || role.source && role.target
    ? "bidirectional"
    : role.source ? "output" : "input"
  return Object.freeze({
    id: socketId(port.id, port.nodeId),
    direction,
    valueType: Object.freeze({id: "float", version: 1}),
    metadata: Object.freeze({label: socketLabel(port.id), kind: "float"}),
  })
}

function endpoint(portId: string, graph: LayoutGraph | AdaptiveLayoutGraph) {
  const port = graph.ports.find(candidate => candidate.id === portId)
  if (port === undefined) throw new Error(`Неизвестный порт примера: ${portId}`)
  return Object.freeze({nodeId: port.nodeId, socketId: socketId(port.id, port.nodeId)})
}

function socketId(portId: string, nodeId: string): string {
  const prefix = `${nodeId}/`
  if (!portId.startsWith(prefix) || portId.length === prefix.length) {
    throw new Error(`Порт должен принадлежать своей ноде: ${portId}`)
  }
  return portId.slice(prefix.length)
}

function assertEverySocketIsLinked(tree: NodeTreeDefinition): void {
  const linked = new Set((tree.links ?? []).flatMap(link => [
    `${link.from.nodeId}/${link.from.socketId}`,
    `${link.to.nodeId}/${link.to.socketId}`,
  ]))
  for (const node of tree.nodes) for (const socket of node.sockets ?? []) {
    const id = `${node.id}/${socket.id}`
    if (!linked.has(id)) throw new Error(`Сокет примера не связан: ${id}`)
  }
}

function entityLabel(id: string): string {
  return ({
    "source-zone": "Источники",
    "target-zone": "Получатели",
    producer: "Производитель",
    observer: "Наблюдатель",
    "consumer-a": "Получатель A",
    "consumer-b": "Получатель B",
    source: "Источник",
    "target-a": "Цель A",
    "target-b": "Цель B",
  } as const)[id as keyof typeof labels] ?? id
}

const labels = {
  "source-zone": true,
  "target-zone": true,
  producer: true,
  observer: true,
  "consumer-a": true,
  "consumer-b": true,
  source: true,
  "target-a": true,
  "target-b": true,
} as const

function socketNodeGeometry(width: number, socketIds: readonly string[]): NodeGeometryPlan {
  return planNodeGeometry({
    width,
    rows: socketIds.map(socketId => Object.freeze({socketIds: Object.freeze([socketId])})),
  })
}

function layoutNode(id: string, geometry: NodeGeometryPlan, parentId?: string) {
  return Object.freeze({
    id,
    ...(parentId === undefined ? {} : {parentId}),
    width: geometry.width,
    height: geometry.height,
    contentHeight: geometry.contentHeight,
  })
}

function layoutPort(id: string, nodeId: string, geometry: NodeGeometryPlan) {
  return Object.freeze({id, nodeId, y: socketY(geometry, id)})
}

function socketY(geometry: NodeGeometryPlan, id: string): number {
  const socket = geometry.sockets.find(candidate => candidate.id === id)
  if (socket === undefined) throw new Error(`Нет числовой геометрии сокета: ${id}`)
  return socket.y
}

function socketLabel(id: string): string {
  return id.slice(id.lastIndexOf("/") + 1).replaceAll("-", " ")
}
