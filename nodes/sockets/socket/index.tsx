/**
Проецирует один сокет или строку Socket в семантическую кнопку.
Состояние и обработчик активации принадлежат вызывающему компоненту.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {NODE_BORDER_WIDTH, NODE_ROW_HEIGHT, SOCKET_GLYPH_SIZE} from "../shared/src/metrics.ts"
import {socketPreset, SOCKET_KINDS, SOCKET_SHAPES, SOCKET_PRESETS} from "../shared/src/presets.ts"

import type {SocketProps} from "./contract/input.ts"
export type {SocketProps} from "./contract/input.ts"

/** Проецирует адрес, вид и состояние сокета; изменение связей остаётся у вызывающего кода. */

export function Socket(props: SocketProps) {
  validateSocketProps(props)
  const preset = socketPreset(props.kind)
  const shape = props.shape ?? preset.shape
  const active = props.connected === true || props.selected === true
  const presentation = props.presentation ?? "endpoint"
  const glyphWidth = shape === "volume-grid" ? 6 : SOCKET_GLYPH_SIZE
  const glyphHeight = shape === "line" ? 3 : shape === "volume-grid" ? 6 : SOCKET_GLYPH_SIZE
  const title = presentation === "endpoint"
    ? props.title ?? `${props.label} · ${preset.label}`
    : props.title ?? (props.label === preset.label ? undefined : preset.label)
  return <button
    type="button"
    aria-label={`${props.label} · ${props.direction}`}
    aria-pressed={String(active)}
    disabled={props.disabled === true}
    data-node-id={props.nodeId}
    data-socket-id={props.id}
    data-socket-kind={props.kind}
    data-socket-direction={props.direction}
    data-socket-side={props.side}
    data-socket-shape={shape}
    data-square={shape === "square" || shape === "square-dot" ? "true" : undefined}
    data-diamond={shape === "diamond" || shape === "diamond-dot" ? "true" : undefined}
    data-line={shape === "line" ? "true" : undefined}
    data-volume-grid={shape === "volume-grid" ? "true" : undefined}
    data-presentation={presentation}
    data-connected={props.connected === true ? "true" : undefined}
    title={title}
    onClick={props.onActivate}
    style={css`
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${presentation === "row" ? "100%" : "12px"};
      min-width: ${presentation === "row" ? "0" : "12px"};
      height: ${presentation === "row" ? `${NODE_ROW_HEIGHT}px` : `${SOCKET_GLYPH_SIZE}px`};
      min-height: ${presentation === "row" ? `${NODE_ROW_HEIGHT}px` : `${SOCKET_GLYPH_SIZE}px`};
      flex-direction: row;
      gap: ${presentation === "row" ? "4px" : "0"};
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: ${preset.color};
      font-size: var(--font-size-xs);
      overflow: visible;

      &[data-presentation="endpoint"][data-socket-side="left"] {
        margin-left: -6px;
      }

      &[data-presentation="endpoint"][data-socket-side="right"] {
        left: 6px;
        margin-right: -6px;
      }

      &:hover [data-socket-glyph] {
        box-shadow: 0 0 6px currentcolor;
      }

      &:hover [data-socket-glyph][data-dot="true"] {
        box-shadow: inset 0 0 0 3px currentcolor, 0 0 6px currentcolor;
      }

      &:focus [data-socket-glyph] {
        box-shadow: 0 0 6px currentcolor;
      }

      &:focus [data-socket-glyph][data-dot="true"] {
        box-shadow: inset 0 0 0 3px currentcolor, 0 0 6px currentcolor;
      }

      &:disabled {
        opacity: .45;
      }

      &:disabled [data-socket-glyph] {
        box-shadow: none;
      }

      &:disabled [data-socket-glyph][data-dot="true"] {
        box-shadow: inset 0 0 0 3px currentcolor;
      }

      ${props.style}
    `}
  >
    <span
      aria-hidden="true"
      data-socket-glyph=""
      data-socket-shape={shape}
      data-dot={shape.endsWith("-dot") ? "true" : undefined}
      data-diamond={shape === "diamond" || shape === "diamond-dot" ? "true" : undefined}
      data-line={shape === "line" ? "true" : undefined}
      data-volume-grid={shape === "volume-grid" ? "true" : undefined}
      data-active={String(active)}
      style={css`
        box-sizing: border-box;
        position: ${presentation === "row" ? "absolute" : "static"};
        display: block;
        left: ${presentation === "row" && props.side === "left" ? "0" : "auto"};
        top: ${presentation === "row" ? "50%" : "auto"};
        margin-top: ${presentation === "row" ? `${-glyphHeight / 2}px` : "0"};
        right: ${presentation === "row" && props.side === "right" ? "0" : "auto"};
        width: ${glyphWidth}px;
        min-width: ${glyphWidth}px;
        height: ${glyphHeight}px;
        min-height: ${glyphHeight}px;
        margin-left: ${presentation === "row" && props.side === "left"
          ? `${-glyphWidth / 2 - NODE_BORDER_WIDTH}px`
          : "0"};
        margin-right: ${presentation === "row" && props.side === "right"
          ? `${-glyphWidth / 2 - NODE_BORDER_WIDTH}px`
          : "0"};
        border: var(--border-width-control) solid #202020;
        border-radius: var(--radius-round);
        background: currentcolor;

        &[data-dot="true"] {
          box-shadow: inset 0 0 0 3px currentcolor;
        }

        &[data-diamond="true"] {
          border-color: transparent;
          border-radius: 1px;
          background: currentcolor;
          transform: rotate(45deg);
        }

        &[data-line="true"] {
          width: ${SOCKET_GLYPH_SIZE}px;
          min-width: ${SOCKET_GLYPH_SIZE}px;
          height: 3px;
          min-height: 3px;
          border-radius: 1px;
        }

        &[data-volume-grid="true"] {
          width: 6px;
          min-width: 6px;
          height: 6px;
          min-height: 6px;
          border: var(--border-width-control) dotted currentcolor;
          border-radius: 0;
          background: transparent;
        }
      `}
    ></span>
    <span
      data-socket-label=""
      hidden={presentation !== "row"}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 100%;
        min-width: 0;
        padding-left: ${props.side === "left" ? "16px" : "0"};
        padding-right: ${props.side === "right" ? "16px" : "0"};
        overflow: hidden;
        color: #d8d8d8;
        font-size: var(--font-size-xs);
        text-align: ${props.side};
        white-space: nowrap;
        text-overflow: ellipsis;

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.label}
    </span>
  </button>
}

export type SocketComponent = FunctionComponent<SocketProps>

function validateSocketProps(props: SocketProps): void {
  if (props.id.trim().length === 0) throw new TypeError("Socket id must be non-empty")
  if (props.nodeId.trim().length === 0) throw new TypeError("Socket nodeId must be non-empty")
  if (props.label.trim().length === 0) throw new TypeError("Socket label must be non-empty")
  if (!SOCKET_KINDS.includes(props.kind)) throw new TypeError(`Unsupported Socket kind: ${props.kind}`)
  if (!SOCKET_SHAPES.includes(props.shape ?? SOCKET_PRESETS[props.kind].shape)) {
    throw new TypeError(`Unsupported Socket shape: ${String(props.shape)}`)
  }
  if (props.direction !== "input" && props.direction !== "output" && props.direction !== "bidirectional") {
    throw new TypeError(`Unsupported Socket direction: ${props.direction}`)
  }
  if (props.side !== "left" && props.side !== "right") throw new TypeError(`Unsupported Socket side: ${props.side}`)
}
