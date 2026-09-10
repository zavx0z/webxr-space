/**
Адреса Socket связывают визуальный сокет с моделью без создания Store.
Явно заданная сторона сохраняет приоритет над направлением трафика.

@packageDocumentation
*/

import type {Socket as CoreSocket} from "@nodes/tree"

export function socketKey(nodeId: string, socketId: string): string {
  return `${nodeId}\u0000${socketId}`
}

export function socketSide(socket: Pick<CoreSocket, "direction" | "side">): "left" | "right" {
  return socket.side ?? (socket.direction === "output" ? "right" : "left")
}
