import type {
  ParameterControl,
  ParameterControlOption,
  ParameterSocket,
  ParameterSocketProps,
} from "../../dom/parameter-socket.ts"
import {
  NODE_PARAMETER_KINDS,
  NODE_PARAMETER_LABELS,
  NODE_PARAMETER_VARIANTS,
  NODE_PARAMETER_VARIANT_LABELS,
  type NodeParameterKind,
  type NodeParameterStoryRoute,
  type NodeParameterVariant,
} from "../parameter-catalog.ts"

export type ParameterDomRoute = "ui/parameter" |
  `ui/parameter/${NodeParameterKind}` |
  `ui/${NodeParameterStoryRoute}`

const SOCKET_KIND_BY_PARAMETER: Readonly<Record<NodeParameterKind, string>> = Object.freeze({
  text: "string",
  number: "float",
  integer: "integer",
  boolean: "boolean",
  enum: "menu",
  color: "color",
  vector: "vector",
  rotation: "rotation",
  matrix: "matrix",
  reference: "object",
  collection: "collection",
  path: "string",
  readonly: "custom",
})

export function createParameterDomProps(route: ParameterDomRoute): ParameterSocketProps {
  const segments = route.split("/")
  if (route === "ui/parameter") {
    return props(
      "Параметры · standard DOM projections",
      NODE_PARAMETER_KINDS.map((kind) => parameter(kind, "field")),
    )
  }
  const kind = segments[2]
  if (!isParameterKind(kind)) throw new Error(`Unknown Parameter DOM value kind: ${String(kind)}`)
  if (segments.length === 3) {
    return props(
      `${NODE_PARAMETER_LABELS[kind]} · все варианты`,
      NODE_PARAMETER_VARIANTS.map((variant) => parameter(kind, variant)),
    )
  }
  const variant = segments[3]
  if (!isVariant(variant) || segments.length !== 4) throw new Error(`Unknown Parameter DOM variant: ${route}`)
  return props(
    `${NODE_PARAMETER_LABELS[kind]} · ${NODE_PARAMETER_VARIANT_LABELS[variant]}`,
    [parameter(kind, variant)],
  )
}

function parameter(kind: NodeParameterKind, variant: NodeParameterVariant): ParameterControl {
  const control = standardControl(kind)
  const connected = variant === "connected"
  return Object.freeze({
    id: `${kind}-${variant}`,
    valueKind: kind,
    variant,
    label: variant === "field"
      ? NODE_PARAMETER_LABELS[kind]
      : `${NODE_PARAMETER_LABELS[kind]} · ${NODE_PARAMETER_VARIANT_LABELS[variant]}`,
    title: `Parameter ${kind}/${variant}`,
    ...control,
    controlVisible: true,
    connected,
    disabled: false,
    readOnly: control.readOnly || connected,
    sockets: sockets(kind, variant),
  })
}

function sockets(kind: NodeParameterKind, variant: NodeParameterVariant): readonly ParameterSocket[] {
  if (variant === "field") return Object.freeze([])
  const socketKind = SOCKET_KIND_BY_PARAMETER[kind]
  const input: ParameterSocket = Object.freeze({
    id: `${kind}-${variant}-input`,
    side: "left",
    kind: socketKind,
    direction: "input",
    label: `${NODE_PARAMETER_LABELS[kind]} input`,
    title: `${NODE_PARAMETER_LABELS[kind]} input Socket`,
    selected: variant === "connected",
    disabled: false,
  })
  const output: ParameterSocket = Object.freeze({
    id: `${kind}-${variant}-output`,
    side: "right",
    kind: socketKind,
    direction: "output",
    label: `${NODE_PARAMETER_LABELS[kind]} output`,
    title: `${NODE_PARAMETER_LABELS[kind]} output Socket`,
    selected: false,
    disabled: false,
  })
  if (variant === "input" || variant === "connected") return Object.freeze([input])
  if (variant === "output") return Object.freeze([output])
  return Object.freeze([input, output])
}

function standardControl(kind: NodeParameterKind): Omit<
  ParameterControl,
  "id" | "valueKind" | "variant" | "label" | "title" | "controlVisible" |
    "connected" | "disabled" | "sockets"
> {
  const base = {
    checked: false,
    options: Object.freeze([]) as readonly ParameterControlOption[],
    placeholder: "",
    min: "",
    max: "",
    step: "",
    readOnly: false,
  }
  if (kind === "text") return Object.freeze({...base, type: "text", value: "MetaFor"})
  if (kind === "number") return Object.freeze({...base, type: "number", value: "0.625", min: "0", max: "1", step: "0.025"})
  if (kind === "integer") return Object.freeze({...base, type: "number", value: "3", min: "0", max: "100", step: "1"})
  if (kind === "boolean") return Object.freeze({...base, type: "checkbox", value: "true", checked: true})
  if (kind === "enum") return Object.freeze({
    ...base,
    type: "select",
    value: "multiply",
    options: options([
      ["add", "Сложение"],
      ["multiply", "Умножение"],
      ["power", "Степень"],
    ]),
  })
  if (kind === "collection") return Object.freeze({
    ...base,
    type: "select",
    value: "rotation",
    options: options([
      ["position", "Позиция"],
      ["normal", "Нормаль"],
      ["rotation", "Вращение"],
    ]),
  })
  if (kind === "color") return Object.freeze({...base, type: "text", value: "rgba(0.18, 0.58, 0.92, 1)"})
  if (kind === "vector") return Object.freeze({...base, type: "text", value: "1, 2, 3"})
  if (kind === "rotation") return Object.freeze({...base, type: "text", value: "0°, 45°, 90°"})
  if (kind === "matrix") return Object.freeze({...base, type: "text", value: "[[1, 0], [0, 1]]"})
  if (kind === "reference") return Object.freeze({...base, type: "text", value: "Material.001", placeholder: "Не выбрано"})
  if (kind === "path") return Object.freeze({...base, type: "text", value: "/textures/source.exr", placeholder: "Выберите файл"})
  return Object.freeze({...base, type: "text", value: "Готово", readOnly: true})
}

function options(values: readonly (readonly [string, string])[]): readonly ParameterControlOption[] {
  return Object.freeze(values.map(([value, label]) => Object.freeze({value, label, disabled: false})))
}
function props(title: string, parameters: readonly ParameterControl[]): ParameterSocketProps {
  return Object.freeze({title, width: 620, parameters: Object.freeze(parameters)})
}
function isParameterKind(value: string | undefined): value is NodeParameterKind {
  return value !== undefined && (NODE_PARAMETER_KINDS as readonly string[]).includes(value)
}
function isVariant(value: string | undefined): value is NodeParameterVariant {
  return value !== undefined && (NODE_PARAMETER_VARIANTS as readonly string[]).includes(value)
}
