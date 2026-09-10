import type {Socket as CoreSocket} from "@nodes/tree"
import {metadataString} from "@nodes/parameters/shared"
import {socketKey, socketSide} from "@nodes/sockets/shared"
import type {ParameterNodeProps} from "./contracts.ts"

/** Одинаковые правила представления для числового плана и JSX ноды. */
export function parameterSpacingBefore(
  parameter: NonNullable<ParameterNodeProps["parameters"]>[number],
): "small" | "medium" | undefined {
  const spacing = metadataString(parameter.presentation, "spacingBefore", "")
  if (spacing === "") return undefined
  if (spacing !== "small" && spacing !== "medium") {
    throw new TypeError(`Parameter ${parameter.id} spacingBefore must be small or medium`)
  }
  return spacing
}

export function projectedSocketSide(
  nodeId: string,
  socket: CoreSocket,
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right">,
): "left" | "right" {
  return resolvedSocketSides?.get(socketKey(nodeId, socket.id)) ?? socketSide(socket)
}
