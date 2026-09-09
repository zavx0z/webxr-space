/**
Авторская композиция Parameter: подпись, поле и endpoint с каждой стороны.
Connected скрывает поле, сохраняя ту же semantic структуру.

@packageDocumentation
*/

import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {NODE_ROW_HEIGHT} from "@nodes/sockets/metrics"
import type {ParameterBaseProps} from "../../src/contracts.ts"
import {ParameterEndpoints} from "../../endpoints/src/endpoints.tsx"
import {ParameterLabel} from "../../label/src/label.tsx"

type ParameterLayoutProps = ParameterBaseProps & Readonly<{
  kind: string
  fieldOwnsLabel?: boolean | undefined
  children: JsxSourceElement
}>

export function ParameterLayout(props: ParameterLayoutProps) {
  validateBaseProps(props)
  const left = (props.sockets ?? []).filter(socket => socket.side === "left")
  const right = (props.sockets ?? []).filter(socket => socket.side === "right")
  return <div
    role="group"
    aria-label={props.label}
    data-parameter-id={props.id}
    data-field-kind={props.kind}
    data-socket-count={(props.sockets ?? []).length}
    data-connected={props.connected === true ? "true" : undefined}
    hidden={props.hidden === true}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      min-width: 0;
      min-height: ${NODE_ROW_HEIGHT}px;
      gap: 3px;

      &[hidden] {
        display: none;
      }

      ${props.style}
    `}
  >
    <ParameterEndpoints
      nodeId={props.nodeId}
      side="left"
      sockets={left}
      onActivate={props.onSocketActivate}
    />
    <ParameterLabel
      label={props.label}
      connected={props.connected === true}
      hidden={props.fieldOwnsLabel === true && props.connected !== true}
      title={props.connected === true ? props.title : undefined}
    />
    <span
      data-parameter-field=""
      hidden={props.connected === true}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 0;
        min-width: 0;
        min-height: ${NODE_ROW_HEIGHT}px;
        flex-grow: 1;

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.children}
    </span>
    <ParameterEndpoints
      nodeId={props.nodeId}
      side="right"
      sockets={right}
      onActivate={props.onSocketActivate}
    />
  </div>
}

function validateBaseProps(props: ParameterBaseProps): void {
  if (props.id.trim().length === 0) throw new TypeError("Parameter id must be non-empty")
  if (props.nodeId.trim().length === 0) throw new TypeError("Parameter nodeId must be non-empty")
  if (props.label.trim().length === 0) throw new TypeError("Parameter label must be non-empty")
  const ids = new Set<string>()
  const sides = new Set<string>()
  for (const socket of props.sockets ?? []) {
    if (ids.has(socket.id)) throw new Error(`Parameter ${props.id} Socket id must be unique: ${socket.id}`)
    if (sides.has(socket.side)) throw new Error(`Parameter ${props.id} has duplicate ${socket.side} Socket`)
    ids.add(socket.id)
    sides.add(socket.side)
  }
}
