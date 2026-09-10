/**
Шапка и готовые параметры конкретной ParameterNode.

@packageDocumentation
*/

import type {ParameterNodeProps} from "../shared/contracts.ts"
import {Button, IconButton} from "@zavx0z/ui/buttons/button"
import {chevronDownIcon, chevronRightIcon} from "@zavx0z/ui/themes/icons"
import {metadataBoolean, metadataString, Parameter, type ParameterInput} from "@nodes/parameters/shared"
import {parameterSpacingBefore} from "../shared/parameter-presentation.ts"
import {Socket} from "@nodes/sockets/socket"
import {resolveSocketKind, resolveSocketShape} from "@nodes/sockets/presets"
import {NODE_BODY_PADDING_TOP, NODE_BODY_PADDING_BOTTOM, NODE_ROW_GAP} from "../shared/metrics.ts"
import {NODE_BORDER_WIDTH} from "@nodes/sockets/metrics"
import {prepareNodeContents} from "./src/prepare.ts"

export function ParameterNodeContents(props: ParameterNodeProps & Readonly<{headerHeight: number}>) {
  const {parameters, sockets, left, right} = prepareNodeContents(props)
  const collapseLabel = props.collapsed === true ? `Развернуть ${props.label}` : `Свернуть ${props.label}`
  const collapseIcon = props.collapsed === true ? chevronRightIcon : chevronDownIcon
  const toggleCollapse = (event: Event) => {
    event.stopPropagation()
    props.onCollapseChange?.(props.collapsed !== true, event)
  }
  const change = (value: ParameterInput, event: Event) => { if (!props.collapsed) props.onParameterInput?.(value, event) }
  const commit = (value: ParameterInput, event: Event) => { if (!props.collapsed) props.onParameterChange?.(value, event) }
  return <>
    <header
      data-collapsed={props.collapsed === true ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: ${props.headerHeight}px;
        min-height: ${props.headerHeight}px;
        gap: 4px;
        padding: 0 5px;
        overflow: hidden;
        border-radius: var(--radius-large) var(--radius-large) 0 0;
        background: ${props.headerColor ?? "#5b466b"};
        color: #dedede;

        &[data-collapsed="true"] {
          border-radius: var(--radius-large);
        }
      `}
    >
      <Button
        label={collapseLabel}
        iconSrc={collapseIcon}
        iconOnly={true}
        variant="text"
        size="small"
        aria-label={collapseLabel}
        aria-expanded={String(props.collapsed !== true)}
        title={collapseLabel}
        disabled={props.onCollapseChange === undefined}
        onClick={toggleCollapse}
      />
      <strong
        data-node-label=""
        title={props.title}
        style={css`
          display: block;
          min-width: 0;
          flex-grow: 1;
          overflow: hidden;
          color: #dedede;
          font-size: var(--font-size-sm);
          font-weight: 600;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {props.label}
      </strong>
      <small
        hidden={props.category === undefined}
        style={css`
          display: block;
          flex-shrink: 0;
          color: rgba(255, 255, 255, .68);
          font-size: 9px;
          white-space: nowrap;

          &[hidden] {
            display: none;
          }
        `}
      >
        {props.category ?? ""}
      </small>
      {(props.actions ?? []).map(action => <IconButton
        key={action.id}
        label={action.label}
        iconSrc={action.iconSrc}
        selected={action.selected}
        disabled={action.disabled}
        size="small"
        onClick={event => {
          event.stopPropagation()
          action.onClick?.(event)
        }}
      />)}
    </header>
    <section
      aria-label={`${props.label} body`}
      data-node-body=""
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: ${props.intrinsic || props.rect === undefined ? "auto" : `${props.rect.width}px`};
        margin-left: ${-NODE_BORDER_WIDTH}px;
        margin-right: ${props.intrinsic ? -NODE_BORDER_WIDTH : 0}px;
        min-width: 0;
        gap: ${NODE_ROW_GAP}px;
        padding: ${NODE_BODY_PADDING_TOP}px 0 ${NODE_BODY_PADDING_BOTTOM}px;

        &[hidden] {
          display: none;
        }
      `}
    >
      {right.map(socket => <Socket
        key={socket.id}
        id={socket.id}
        nodeId={props.id}
        kind={resolveSocketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))}
        direction={socket.direction}
        side="right"
        label={metadataString(socket.metadata, "label", socket.id)}
        shape={resolveSocketShape(metadataString(socket.metadata, "shape", ""))}
        connected={props.connectedSocketKeys?.has(`${props.id}\u0000${socket.id}`) === true}
        disabled={metadataBoolean(socket.metadata, "disabled", false)}
        presentation="row"
        style={css`
          width: auto;
          align-self: stretch;
          margin-left: ${NODE_BORDER_WIDTH}px;
          margin-right: ${NODE_BORDER_WIDTH}px;

          ${props.collapsed && css`
            height: 0;
            min-height: 0;
            flex-grow: 1;
          `}
        `}
        onActivate={event => props.onSocketActivate?.(socket.id, event)}
      />)}
      {parameters.map(parameter => <Parameter
        key={parameter.id}
        nodeId={props.id}
        snapshot={parameter}
        sockets={sockets.filter(socket => socket.parameterId === parameter.id)}
        store={props.parameterStore?.(parameter.id)}
        connectedSocketKeys={props.connectedSocketKeys}
        resolvedSocketSides={props.resolvedSocketSides}
        spacingBefore={parameterSpacingBefore(parameter)}
        onInput={change}
        onChange={commit}
        onSocketActivate={props.onSocketActivate}
      />)}
      {props.children}
      {left.map(socket => <Socket
        key={socket.id}
        id={socket.id}
        nodeId={props.id}
        kind={resolveSocketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))}
        direction={socket.direction}
        side="left"
        label={metadataString(socket.metadata, "label", socket.id)}
        shape={resolveSocketShape(metadataString(socket.metadata, "shape", ""))}
        connected={props.connectedSocketKeys?.has(`${props.id}\u0000${socket.id}`) === true}
        disabled={metadataBoolean(socket.metadata, "disabled", false)}
        presentation="row"
        style={css`
          width: auto;
          align-self: stretch;
          margin-left: ${NODE_BORDER_WIDTH}px;
          margin-right: ${NODE_BORDER_WIDTH}px;

          ${props.collapsed && css`
            height: 0;
            min-height: 0;
            flex-grow: 1;
          `}
        `}
        onActivate={event => props.onSocketActivate?.(socket.id, event)}
      />)}
    </section>
  </>
}
