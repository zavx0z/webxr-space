/**
Общая композиция готовых параметров: подпись, содержимое и сокеты.
Connected скрывает поле, сохраняя ту же semantic структуру.

@packageDocumentation
*/

import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {NODE_ROW_HEIGHT} from "@nodes/sockets/metrics"
import {NODE_PARAMETER_SPACING_MEDIUM, NODE_PARAMETER_SPACING_SMALL} from "../../src/metrics.ts"
import type {ParameterBaseProps} from "../../src/contracts.ts"
import {ParameterEndpoints} from "../../endpoints/src/endpoints.tsx"
import {ParameterLabel} from "../../label/src/label.tsx"

type ParameterLayoutProps = ParameterBaseProps & Readonly<{
  kind: string
  fieldOwnsLabel?: boolean | undefined
  fieldBeforeLabel?: boolean | undefined
  children: JsxSourceElement
}>

export function ParameterLayout(props: ParameterLayoutProps) {
  validateBaseProps(props)
  const left = (props.sockets ?? []).filter(socket => socket.side === "left")
  const right = (props.sockets ?? []).filter(socket => socket.side === "right")
  const connected = props.connected === true
  const leadingField = props.fieldBeforeLabel === true && !connected
  const fieldOwnsLabel = props.fieldOwnsLabel === true && !connected
  const insetField = fieldOwnsLabel && left.length > 0 && right.length === 0
  return <div
    role="group"
    aria-label={props.label}
    data-parameter-id={props.id}
    data-field-kind={props.kind}
    data-socket-count={(props.sockets ?? []).length}
    data-connected={connected ? "true" : undefined}
    data-label-hidden={props.labelHidden === true ? "true" : undefined}
    data-leading-checkbox={leadingField ? "true" : undefined}
    data-inset-number-row={insetField ? "true" : undefined}
    data-spacing-before={props.spacingBefore}
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

      &[data-spacing-before="small"] {
        margin-top: ${NODE_PARAMETER_SPACING_SMALL}px;
      }

      &[data-spacing-before="medium"] {
        margin-top: ${NODE_PARAMETER_SPACING_MEDIUM}px;
      }

      &[data-label-hidden="true"] {
        gap: 0;
        padding-right: 11px;
        padding-left: 12px;
      }

      &[data-leading-checkbox="true"] {
        gap: 4px;
        padding-right: 8px;
        padding-left: 8px;
      }

      &[data-inset-number-row="true"] {
        gap: 0;
        padding-right: 11px;
      }

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
      connected={connected}
      hidden={props.labelHidden === true || leadingField || fieldOwnsLabel}
      title={connected ? props.title : undefined}
    />
    <span
      data-parameter-field=""
      data-leading={leadingField ? "true" : undefined}
      hidden={connected}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: ${leadingField ? "18px" : "0"};
        min-width: 0;
        min-height: ${NODE_ROW_HEIGHT}px;
        flex-grow: ${leadingField ? 0 : 1};

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.children}
    </span>
    {leadingField ? <ParameterLabel
      label={props.label}
      connected={false}
      hidden={props.labelHidden}
      expanded
      title={props.title}
    /> : null}
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
  const ids = new Set<string>()
  for (const socket of props.sockets ?? []) {
    if (ids.has(socket.id)) throw new Error(`Parameter ${props.id} Socket id must be unique: ${socket.id}`)
    ids.add(socket.id)
  }
}
