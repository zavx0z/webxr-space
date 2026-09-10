import type {ParameterNodeProps} from "../../shared/contracts.ts"
import {projectedSocketSide} from "../../shared/parameter-presentation.ts"

/** Проверяет данные ноды и выделяет самостоятельные сокеты по сторонам. */
export function prepareNodeContents(props: ParameterNodeProps) {
  validateParameterNodeProps(props)
  const parameters = props.parameters ?? []
  if (props.children != null && parameters.length > 0) {
    throw new Error(`Node ${props.id} accepts either authored Component children or projected Parameters`)
  }
  const sockets = props.sockets ?? []
  const parameterIds = new Set(parameters.map(parameter => parameter.id))
  const loose = sockets.filter(socket => socket.parameterId === undefined || !parameterIds.has(socket.parameterId))
  const right = loose.filter(socket => projectedSocketSide(props.id, socket, props.resolvedSocketSides) === "right")
  const left = loose.filter(socket => projectedSocketSide(props.id, socket, props.resolvedSocketSides) === "left")
  return {parameters, sockets, left, right}
}

function validateParameterNodeProps(props: ParameterNodeProps): void {
  if (props.id.trim().length === 0) throw new TypeError("Node id must be non-empty")
  if (props.label.trim().length === 0) throw new TypeError(`Node ${props.id} label must be non-empty`)
  if (props.headerColor !== undefined && !/^#[0-9a-f]{6}$/iu.test(props.headerColor)) {
    throw new TypeError(`Node ${props.id} headerColor must be #rrggbb`)
  }
  const ids = new Set<string>()
  for (const socket of props.sockets ?? []) {
    if (ids.has(socket.id)) throw new Error(`Node ${props.id} Socket id must be unique: ${socket.id}`)
    ids.add(socket.id)
  }
}
