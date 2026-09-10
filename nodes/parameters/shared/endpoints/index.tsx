/**
Создаёт представления конкретных Socket указанной стороны и сохраняет их ключи.
Активация передаёт исходный идентификатор сокета родительскому обработчику.

@packageDocumentation
*/

import {Socket} from "@nodes/sockets/socket"
import type {SocketSide} from "@nodes/sockets/presets"
import type {ParameterEndpoint} from "../src/contracts.ts"

export function ParameterEndpoints(props: Readonly<{
  nodeId: string
  side: SocketSide
  sockets: readonly ParameterEndpoint[]
  onActivate?: ((socketId: string, event: Event) => void) | undefined
}>) {
  return <span
    data-parameter-sockets={props.side}
    style={css`
      display: flex;
      align-items: center;
      min-width: ${props.sockets.length === 0 ? "0" : "12px"};
      gap: 2px;
    `}
  >
    {props.sockets.map(socket => <Socket
      key={socket.id}
      id={socket.id}
      nodeId={props.nodeId}
      kind={socket.kind}
      direction={socket.direction}
      side={socket.side}
      label={socket.label}
      title={socket.title}
      shape={socket.shape}
      connected={socket.connected}
      selected={socket.selected}
      disabled={socket.disabled}
      onActivate={event => props.onActivate?.(socket.id, event)}
    />)}
  </span>
}
