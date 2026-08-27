import type {
  ParameterControl,
  ParameterSocketProps,
} from "../../dom/parameter-socket.ts"
import {
  NODE_SOCKET_DIRECTIONS,
  NODE_SOCKET_DIRECTION_LABELS,
  NODE_SOCKET_KINDS,
  NODE_SOCKET_LABELS,
  type NodeSocketDirection,
  type NodeSocketKind,
  type NodeSocketStoryRoute,
} from "../socket-catalog.ts"

export type SocketDomRoute = "ui/socket" |
  `ui/socket/${NodeSocketKind}` |
  `ui/${NodeSocketStoryRoute}`

export function createSocketDomProps(route: SocketDomRoute): ParameterSocketProps {
  const segments = route.split("/")
  if (route === "ui/socket") {
    return props(
      "Сокеты · все public kinds",
      NODE_SOCKET_KINDS.map((kind) => socketRow(kind, "input")),
    )
  }
  const kind = segments[2]
  if (!isSocketKind(kind)) throw new Error(`Unknown Socket DOM kind: ${String(kind)}`)
  if (segments.length === 3) {
    return props(
      `${NODE_SOCKET_LABELS[kind]} · все направления`,
      NODE_SOCKET_DIRECTIONS.map((direction) => socketRow(kind, direction)),
    )
  }
  const direction = segments[3]
  if (!isDirection(direction) || segments.length !== 4) throw new Error(`Unknown Socket DOM direction: ${route}`)
  return props(
    `${NODE_SOCKET_LABELS[kind]} · ${NODE_SOCKET_DIRECTION_LABELS[direction]}`,
    [socketRow(kind, direction)],
  )
}

function socketRow(kind: NodeSocketKind, direction: NodeSocketDirection): ParameterControl {
  const side = direction === "output" ? "right" : "left"
  return Object.freeze({
    id: `${kind}-${direction}`,
    fieldKind: `socket:${kind}`,
    variant: "field",
    label: `${NODE_SOCKET_LABELS[kind]} · ${NODE_SOCKET_DIRECTION_LABELS[direction]}`,
    title: `${kind}/${direction} Socket`,
    value: direction,
    checked: false,
    type: "text",
    options: Object.freeze([]),
    placeholder: "",
    min: "",
    max: "",
    step: "",
    controlVisible: false,
    connected: false,
    disabled: false,
    readOnly: true,
    sockets: Object.freeze([Object.freeze({
      id: `${kind}-${direction}-socket`,
      side,
      kind,
      direction,
      label: `${NODE_SOCKET_LABELS[kind]} ${direction}`,
      title: `${NODE_SOCKET_LABELS[kind]} · ${NODE_SOCKET_DIRECTION_LABELS[direction]}`,
      selected: false,
      disabled: false,
    })]),
  })
}

function props(title: string, parameters: readonly ParameterControl[]): ParameterSocketProps {
  return Object.freeze({title, width: 620, parameters: Object.freeze(parameters)})
}
function isSocketKind(value: string | undefined): value is NodeSocketKind {
  return value !== undefined && (NODE_SOCKET_KINDS as readonly string[]).includes(value)
}
function isDirection(value: string | undefined): value is NodeSocketDirection {
  return value !== undefined && (NODE_SOCKET_DIRECTIONS as readonly string[]).includes(value)
}
