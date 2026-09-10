import type {NodeJsonValue, NodeTreeNodeSnapshot, ParameterReference, Socket as CoreSocket} from "@nodes/tree"
import {NODE_PARAMETER_SPACING_SMALL, NODE_PARAMETER_SPACING_MEDIUM, projectedParameterFieldHeight, resolveProjectedParameterPresentation} from "@nodes/parameters/shared"
import {socketKey} from "@nodes/sockets/shared"
import {parameterSpacingBefore, projectedSocketSide} from "./parameter-presentation.ts"
import type {NodeKind, NodeShape} from "./contracts.ts"

export type {NodeRect} from "./contracts.ts"
export type ProjectedNodeSnapshot = NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>
export type NodeGeometryPresentation = Readonly<{kind?: NodeKind | undefined; collapsed?: boolean | undefined; contentVisible?: boolean | undefined; shape?: NodeShape | undefined; height?: number | undefined}>
export function nodeSocketLayoutPortId(nodeId: string, socketId: string): string {
  if (nodeId.length === 0 || socketId.length === 0) throw new TypeError("Socket endpoint IDs must be non-empty")
  return `${nodeId}/${socketId}`
}

import {planNodeGeometry, NODE_MINIMUM_WIDTH, type NodeGeometryRowInput, type NodeGeometryPlan} from "./metrics.ts"
import {NODE_ROW_HEIGHT} from "@nodes/sockets/metrics"
export {NODE_MINIMUM_WIDTH, NODE_HEADER_HEIGHT, NODE_BODY_PADDING_TOP, NODE_BODY_PADDING_BOTTOM, NODE_ROW_GAP, NODE_COLLAPSED_HEIGHT, planNodeGeometry, type NodeGeometryRowInput, type NodeGeometryRow, type NodeGeometryPlan} from "./metrics.ts"

export function planProjectedNodeGeometry(
  snapshot: ProjectedNodeSnapshot,
  width?: number,
  connectedSocketKeys?: ReadonlySet<string>,
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right">,
  presentation: NodeGeometryPresentation = {},
): NodeGeometryPlan {
  const parameterIds = new Set(snapshot.parameters.map(parameter => parameter.id))
  const socketsByParameter = new Map<string, CoreSocket[]>()
  const loose: CoreSocket[] = []
  for (const socket of snapshot.sockets) {
    if (socket.parameterId === undefined || !parameterIds.has(socket.parameterId)) {
      loose.push(socket)
      continue
    }
    const sockets = socketsByParameter.get(socket.parameterId) ?? []
    sockets.push(socket)
    socketsByParameter.set(socket.parameterId, sockets)
  }
  const right = loose.filter(socket => projectedSocketSide(
    snapshot.id,
    socket,
    resolvedSocketSides,
  ) === "right")
  const left = loose.filter(socket => projectedSocketSide(
    snapshot.id,
    socket,
    resolvedSocketSides,
  ) === "left")
  const rows: NodeGeometryRowInput[] = [
    ...right.map(socket => projectedSocketRow(snapshot.id, socket)),
    ...snapshot.parameters.map(parameter => {
      const sockets = socketsByParameter.get(parameter.id) ?? []
      const connected = sockets.some(socket =>
        connectedSocketKeys?.has(socketKey(snapshot.id, socket.id)) === true)
      const resolved = resolveProjectedParameterPresentation(parameter)
      return Object.freeze({
        height: connected
          ? NODE_ROW_HEIGHT
          : Math.max(NODE_ROW_HEIGHT, projectedParameterFieldHeight(resolved)),
        spacingBefore: parameterSpacingBeforePixels(parameter),
        socketIds: Object.freeze(sockets.map(socket =>
          nodeSocketLayoutPortId(snapshot.id, socket.id))),
      })
    }),
    ...left.map(socket => projectedSocketRow(snapshot.id, socket)),
  ]
  if (presentation.kind === "diagram") {
    const diagramWidth = Math.max(NODE_MINIMUM_WIDTH, width ?? NODE_MINIMUM_WIDTH)
    const height = presentation.shape === "circle" ? diagramWidth : presentation.height ?? 60
    if (!Number.isFinite(height) || height <= 0) throw new TypeError("Diagram Node height must be positive and finite")
    return Object.freeze({width: diagramWidth, height, contentHeight: height, rows: Object.freeze([]),
      sockets: Object.freeze(snapshot.sockets.map(socket => Object.freeze({id: nodeSocketLayoutPortId(snapshot.id, socket.id), y: height / 2})))})
  }
  return planNodeGeometry({width, rows: Object.freeze(rows), collapsed: presentation.collapsed, contentVisible: presentation.contentVisible})
}



function parameterSpacingBeforePixels(
  parameter: ProjectedNodeSnapshot["parameters"][number],
): number {
  const spacing = parameterSpacingBefore(parameter)
  if (spacing === "small") return NODE_PARAMETER_SPACING_SMALL
  if (spacing === "medium") return NODE_PARAMETER_SPACING_MEDIUM
  return 0
}


function projectedSocketRow(nodeId: string, socket: CoreSocket): NodeGeometryRowInput {
  return Object.freeze({
    height: NODE_ROW_HEIGHT,
    socketIds: Object.freeze([nodeSocketLayoutPortId(nodeId, socket.id)]),
  })
}
