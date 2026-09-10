/**
Проецирует переданный Store параметра без копирования значения.
Одна функция выбирает готовый компонент параметра и его числовую высоту;
Node использует тот же выбор перед Layout. Адаптер передаёт данные и обработчики,
а разметка и UI-поля принадлежат конкретным компонентам параметров.

@packageDocumentation
*/

import {
  checkboxFieldLayout,
} from "@zavx0z/ui/fields/checkbox-field"
import {
  collectionFieldLayout,
  type CollectionFieldProps,
} from "@zavx0z/ui/fields/collection-field"
import {
  colorFieldLayout,
  type ColorFieldValue,
} from "@zavx0z/ui/fields/color-field"
import {
  cycleFieldLayout,
} from "@zavx0z/ui/fields/cycle-field"
import {
  matrixFieldLayout,
} from "@zavx0z/ui/fields/matrix-field"
import {
  numberFieldLayout,
} from "@zavx0z/ui/fields/number-field"
import {
  toggleButtonGroupLayout,
} from "@zavx0z/ui/buttons/toggle-button-group"
import {
  pathFieldLayout,
} from "@zavx0z/ui/fields/path-field"
import {
  referenceFieldLayout,
  type ReferenceFieldValue,
} from "@zavx0z/ui/fields/reference-field"
import {
  selectFieldLayout,
  type SelectFieldOption,
} from "@zavx0z/ui/fields/select-field"
import {
  sliderFieldLayout,
} from "@zavx0z/ui/fields/slider-field"
import {
  switchFieldLayout,
} from "@zavx0z/ui/fields/switch-field"
import {
  textFieldLayout,
} from "@zavx0z/ui/fields/text-field"
import {
  vectorFieldLayout,
} from "@zavx0z/ui/fields/vector-field"
import type {
  NodeJsonObject,
  NodeJsonValue,
  ParameterSnapshot,
  Socket as CoreSocket,
} from "@nodes/tree"
import {
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/component"
import {metadata, metadataBoolean, metadataNumber, metadataObjectArray, metadataString, metadataStringArray} from "../src/metadata.ts"
import {socketKey, socketSide} from "@nodes/sockets/shared"
import {NODE_PARAMETER_SPACING_MEDIUM, NODE_PARAMETER_SPACING_SMALL, PARAMETER_OUTPUT_HEIGHT} from "../src/metrics.ts"
import {resolveSocketKind, resolveSocketShape} from "@nodes/sockets/presets"
import type {ParameterProps, ParameterEndpoint} from "../src/contracts.ts"
import {CheckboxParameter} from "../../boolean/checkbox/index.tsx"
import {CollectionParameter} from "../../collections/collection/index.tsx"
import {ColorParameter} from "../../composite/color/index.tsx"
import {CycleParameter} from "../../choice/cycle/index.tsx"
import {MatrixParameter} from "../../composite/matrix/index.tsx"
import {NumberParameter} from "../../numeric/number/index.tsx"
import {OptionGroupParameter} from "../../choice/option-group/index.tsx"
import {OutputParameter} from "../../output/output/index.tsx"
import {PathParameter} from "../../references/path/index.tsx"
import {ReferenceParameter} from "../../references/reference/index.tsx"
import {SelectParameter} from "../../choice/select/index.tsx"
import {SliderParameter} from "../../numeric/slider/index.tsx"
import {SwitchParameter} from "../../boolean/switch/index.tsx"
import {TextParameter} from "../../text/text/index.tsx"
import {VectorParameter} from "../../composite/vector/index.tsx"

export type {ParameterProps, ParameterInput, ParameterEndpoint, ParameterBaseProps} from "../src/contracts.ts"
export {metadata, metadataBoolean, metadataNumber, metadataObjectArray, metadataString, metadataStringArray} from "../src/metadata.ts"
export {NODE_PARAMETER_SPACING_MEDIUM, NODE_PARAMETER_SPACING_SMALL} from "../src/metrics.ts"

export type ProjectedParameterKind =
  | "checkbox"
  | "collection"
  | "color"
  | "cycle"
  | "matrix"
  | "number"
  | "option-group"
  | "output"
  | "path"
  | "reference"
  | "select"
  | "slider"
  | "switch"
  | "text"
  | "vector"

export type ProjectedParameterPresentation = Readonly<{
  kind: ProjectedParameterKind
  label: string
  disabled: boolean
  readOnly: boolean
  labelHidden: boolean
  title: string | undefined
  min: number | undefined
  max: number | undefined
  rawStep: number | undefined
  step: number
  precision: number | undefined
  options: readonly SelectFieldOption[] | undefined
  placeholder: string | undefined
  axes: readonly string[] | undefined
  booleanValue: boolean
  numberValue: number
  stringValue: string
  vector: readonly number[] | null
  matrix: readonly (readonly number[])[] | null
  color: ColorFieldValue | null
  reference: ReferenceFieldValue | null | undefined
  collection: Readonly<{
    items: CollectionFieldProps["items"]
    selectedId: string | null
    visibleRows: number | undefined
  }> | null
}>

/** Проецирует переданный Store параметра модели без копирования его значения. */
export function Parameter(props: ParameterProps) {
  const fallbackStore = useMemo(() => Object.freeze({
    subscribe: (_listener: () => void) => () => {},
    getSnapshot: () => props.snapshot,
  }), [props.snapshot])
  const store = props.store ?? fallbackStore
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const resolved = resolveProjectedParameterPresentation(snapshot)
  const {
    kind,
    label,
    disabled,
    readOnly,
    labelHidden,
    title,
    min,
    max,
    rawStep,
    step,
    precision,
    options,
    placeholder,
    axes,
    booleanValue,
    numberValue,
    stringValue,
    vector,
    matrix,
    color,
    reference,
    collection,
  } = resolved
  const sockets = props.sockets.map(socket => parameterSocket(
    socket,
    props.nodeId,
    props.connectedSocketKeys,
    props.resolvedSocketSides,
  ))
  const connected = sockets.some(socket => socket.connected === true)
  const input = (value: NodeJsonValue, event: Event) => props.onInput?.(Object.freeze({
    nodeId: props.nodeId,
    parameterId: snapshot.id,
    value,
  }), event)
  const change = (value: NodeJsonValue, event: Event) => props.onChange?.(Object.freeze({
    nodeId: props.nodeId,
    parameterId: snapshot.id,
    value,
  }), event)
  return <>
    {kind === "checkbox" ? <CheckboxParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      checked={booleanValue}
      onChange={change}
    /> : null}
    {kind === "collection" ? <CollectionParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      items={collection?.items ?? []}
      selectedId={collection?.selectedId ?? null}
      visibleRows={collection?.visibleRows}
    /> : null}
    {kind === "color" ? <ColorParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={color!}
      onInput={input}
      onChange={change}
    /> : null}
    {kind === "cycle" ? <CycleParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={stringValue}
      options={options ?? []}
      onChange={change}
    /> : null}
    {kind === "matrix" ? <MatrixParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={matrix!}
      step={rawStep}
      onInput={input}
      onChange={change}
    /> : null}
    {kind === "number" ? <NumberParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={numberValue}
      min={min}
      max={max}
      step={step}
      precision={precision}
      onInput={input}
      onChange={change}
    /> : null}
    {kind === "option-group" ? <OptionGroupParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={stringValue}
      options={options ?? []}
      onChange={change}
    /> : null}
    {kind === "output" ? <OutputParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={snapshot.value}
    /> : null}
    {kind === "path" ? <PathParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={stringValue}
      placeholder={placeholder}
      onInput={input}
      onChange={change}
    /> : null}
    {kind === "reference" ? <ReferenceParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={reference ?? null}
    /> : null}
    {kind === "select" ? <SelectParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={stringValue}
      options={options}
      onChange={change}
    /> : null}
    {kind === "slider" ? <SliderParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={numberValue}
      min={min!}
      max={max!}
      step={step}
      onInput={input}
      onChange={change}
    /> : null}
    {kind === "switch" ? <SwitchParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      checked={booleanValue}
      onChange={change}
    /> : null}
    {kind === "text" ? <TextParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={stringValue}
      placeholder={placeholder}
      onInput={input}
      onChange={change}
    /> : null}
    {kind === "vector" ? <VectorParameter
      id={snapshot.id}
      nodeId={props.nodeId}
      label={label}
      labelHidden={labelHidden}
      sockets={sockets}
      connected={connected}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      spacingBefore={props.spacingBefore}
      style={props.style}
      onSocketActivate={props.onSocketActivate}
      value={vector!}
      axes={axes}
      min={min}
      max={max}
      step={rawStep}
      onInput={input}
      onChange={change}
    /> : null}
  </>
}

export type ParameterComponent = FunctionComponent<ParameterProps>

function parameterSocket(
  socket: CoreSocket,
  nodeId: string,
  connectedSocketKeys?: ReadonlySet<string>,
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right">,
): ParameterEndpoint {
  const kind = resolveSocketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))
  return Object.freeze({
    id: socket.id,
    kind,
    direction: socket.direction,
    side: resolvedSocketSides?.get(socketKey(nodeId, socket.id)) ?? socketSide(socket),
    label: metadataString(socket.metadata, "label", socket.id),
    title: metadataString(socket.metadata, "description", "") || undefined,
    shape: resolveSocketShape(metadataString(socket.metadata, "shape", "")),
    connected: connectedSocketKeys?.has(socketKey(nodeId, socket.id)) === true,
    disabled: metadataBoolean(socket.metadata, "disabled", false),
  })
}

function selectionOptions(value: NodeJsonValue): readonly SelectFieldOption[] | undefined {
  const candidates = metadataObjectArray(value, "options")
  if (candidates === undefined) return undefined
  return Object.freeze(candidates.flatMap((candidate, index) => {
    if (typeof candidate.value !== "string" || typeof candidate.label !== "string") return []
    return [Object.freeze({
      key: typeof candidate.key === "string" ? candidate.key : `${index}:${candidate.value}`,
      value: candidate.value,
      label: candidate.label,
      description: typeof candidate.description === "string" ? candidate.description : undefined,
      disabled: candidate.disabled === true,
      title: typeof candidate.title === "string" ? candidate.title : undefined,
    })]
  }))
}

function numericVector(value: NodeJsonValue): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4 ||
    !value.every(entry => typeof entry === "number" && Number.isFinite(entry))) return null
  return value as readonly number[]
}

function numericMatrix(value: NodeJsonValue): readonly (readonly number[])[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4 ||
    !value.every(row => Array.isArray(row) && row.length === value.length &&
      row.every(entry => typeof entry === "number" && Number.isFinite(entry)))) return null
  return value as readonly (readonly number[])[]
}

function colorValue(value: NodeJsonValue): ColorFieldValue | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as NodeJsonObject
  if (typeof record.r !== "number" || typeof record.g !== "number" ||
    typeof record.b !== "number" || typeof record.a !== "number") return null
  return Object.freeze({r: record.r, g: record.g, b: record.b, a: record.a})
}

function referenceValue(value: NodeJsonValue): ReferenceFieldValue | null | undefined {
  if (value === null) return null
  if (typeof value !== "object" || Array.isArray(value)) return undefined
  const record = value as NodeJsonObject
  if (typeof record.id !== "string" || typeof record.label !== "string") return undefined
  return Object.freeze({
    id: record.id,
    label: record.label,
    kind: typeof record.kind === "string" ? record.kind : undefined,
  })
}

function isReferenceType(valueType: string | undefined): boolean {
  return valueType === "object" || valueType === "image" || valueType === "material" || valueType === "texture"
}

function collectionValue(
  value: NodeJsonValue,
  presentation: NodeJsonValue,
): ProjectedParameterPresentation["collection"] {
  const candidates = metadataObjectArray(presentation, "items")
  if (candidates === undefined) return null
  const items = candidates.flatMap(candidate => {
    if (typeof candidate.id !== "string" || typeof candidate.label !== "string") return []
    return [Object.freeze({
      id: candidate.id,
      label: candidate.label,
      description: typeof candidate.description === "string" ? candidate.description : undefined,
      disabled: candidate.disabled === true,
    })]
  })
  const selectedId = typeof value === "string" ? value : metadata(presentation, "selectedId")
  return Object.freeze({
    items: Object.freeze(items),
    selectedId: typeof selectedId === "string" ? selectedId : null,
    visibleRows: metadataNumber(presentation, "visibleRows"),
  })
}

/**
Одним чистым проходом выбирает готовый компонент параметра и готовит
те же данные, которые затем использует и отрисовка, и числовая геометрия.
*/
export function resolveProjectedParameterPresentation(
  snapshot: ParameterSnapshot,
): ProjectedParameterPresentation {
  const presentation = snapshot.presentation
  const valueType = snapshot.valueType?.id
  const interaction = metadataString(presentation, "interaction", "")
  const min = metadataNumber(presentation, "min")
  const max = metadataNumber(presentation, "max")
  const rawStep = metadataNumber(presentation, "step")
  const options = selectionOptions(presentation)
  const vector = numericVector(snapshot.value)
  const matrix = numericMatrix(snapshot.value)
  const color = colorValue(snapshot.value)
  const reference = referenceValue(snapshot.value)
  const collection = collectionValue(snapshot.value, presentation)

  let kind: ProjectedParameterKind = "output"
  if ((valueType === "vector" || valueType === "rotation") && vector !== null) {
    kind = "vector"
  } else if (valueType === "matrix" && matrix !== null) {
    kind = "matrix"
  } else if (valueType === "color" && color !== null) {
    kind = "color"
  } else if (reference !== undefined || isReferenceType(valueType)) {
    kind = "reference"
  } else if (collection !== null || valueType === "collection") {
    kind = "collection"
  } else if (typeof snapshot.value === "boolean") {
    kind = interaction === "switch" ? "switch" : "checkbox"
  } else if (typeof snapshot.value === "number") {
    kind = interaction === "slider" && min !== undefined && max !== undefined ? "slider" : "number"
  } else if (typeof snapshot.value === "string") {
    const selection = options !== undefined || valueType === "menu" || valueType === "enum"
    kind = selection
      ? interaction === "cycle" ? "cycle" : interaction === "option-group" ? "option-group" : "select"
      : valueType === "path" ? "path" : "text"
  }

  return Object.freeze({
    kind,
    label: metadataString(presentation, "label", snapshot.id),
    disabled: metadataBoolean(presentation, "disabled", false),
    readOnly: metadataBoolean(presentation, "readOnly", false),
    labelHidden: metadataBoolean(presentation, "labelHidden", false),
    title: metadataString(presentation, "description", "") || undefined,
    min,
    max,
    rawStep,
    step: rawStep ?? (valueType === "integer" ? 1 : .1),
    precision: metadataNumber(presentation, "precision"),
    options,
    placeholder: metadataString(presentation, "placeholder", "") || undefined,
    axes: metadataStringArray(presentation, "axes") ??
      (valueType === "rotation" ? Object.freeze(["X", "Y", "Z"]) : undefined),
    booleanValue: typeof snapshot.value === "boolean" ? snapshot.value : false,
    numberValue: typeof snapshot.value === "number" ? snapshot.value : 0,
    stringValue: typeof snapshot.value === "string" ? snapshot.value : "",
    vector,
    matrix,
    color,
    reference,
    collection,
  })
}

/** Числовая высота ровно того публичного UI Field, который выбрала функция проекции. */
export function projectedParameterFieldHeight(
  resolved: ProjectedParameterPresentation,
): number {
  switch (resolved.kind) {
    case "checkbox": return checkboxFieldLayout.height()
    case "collection": return collectionFieldLayout.height({
      visibleRows: resolved.collection?.visibleRows,
      movable: false,
    })
    case "color": return colorFieldLayout.height()
    case "cycle": return cycleFieldLayout.height({density: "compact"})
    case "matrix": {
      if (resolved.matrix === null) throw new Error("Projected Matrix Parameter must have a resolved matrix")
      return matrixFieldLayout.height({size: resolved.matrix.length, density: "compact"})
    }
    case "number": return numberFieldLayout.height()
    case "option-group": return toggleButtonGroupLayout.height()
    case "output": return PARAMETER_OUTPUT_HEIGHT
    case "path": return pathFieldLayout.height({density: "compact"})
    case "reference": return referenceFieldLayout.height({density: "compact"})
    case "select": return selectFieldLayout.height({density: "compact"})
    case "slider": return sliderFieldLayout.height({density: "compact"})
    case "switch": return switchFieldLayout.height()
    case "text": return textFieldLayout.height()
    case "vector": return vectorFieldLayout.height({density: "compact"})
  }
}
