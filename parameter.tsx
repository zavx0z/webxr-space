import {CheckboxField, type CheckboxFieldProps} from "@ui/components/fields/checkbox-field"
import {CollectionField, type CollectionFieldProps} from "@ui/components/fields/collection-field"
import {ColorField, type ColorFieldProps, type ColorFieldValue} from "@ui/components/fields/color-field"
import {CycleField, type CycleFieldProps} from "@ui/components/fields/cycle-field"
import {MatrixField, type MatrixFieldProps} from "@ui/components/fields/matrix-field"
import {NumberField, type NumberFieldProps} from "@ui/components/fields/number-field"
import {OptionGroupField, type OptionGroupFieldProps} from "@ui/components/fields/option-group-field"
import {PathField, type PathFieldProps} from "@ui/components/fields/path-field"
import {ReferenceField, type ReferenceFieldProps, type ReferenceFieldValue} from "@ui/components/fields/reference-field"
import {SelectField, type SelectFieldOption, type SelectFieldProps} from "@ui/components/fields/select-field"
import {SliderField, type SliderFieldProps} from "@ui/components/fields/slider-field"
import {SwitchField, type SwitchFieldProps} from "@ui/components/fields/switch-field"
import {TextField, type TextFieldProps} from "@ui/components/fields/text-field"
import {VectorField, type VectorFieldProps} from "@ui/components/fields/vector-field"
import type {
  ExternalStore,
  NodeJsonObject,
  NodeJsonValue,
  ParameterSnapshot,
  Socket as CoreSocket,
} from "@nodes/core"
import {
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {
  metadata,
  metadataBoolean,
  metadataNumber,
  metadataObjectArray,
  metadataString,
  metadataStringArray,
  socketKey,
  socketSide,
} from "./geometry.ts"
import {
  Socket,
  SOCKET_KINDS,
  type SocketDirection,
  type SocketKind,
  type SocketShape,
  type SocketSide,
} from "./socket.tsx"

export type ParameterInput = Readonly<{
  nodeId: string
  parameterId: string
  value: NodeJsonValue
}>

export type ParameterEndpoint = Readonly<{
  id: string
  kind: SocketKind
  direction: SocketDirection
  side: SocketSide
  label: string
  title?: string | undefined
  shape?: SocketShape | undefined
  connected?: boolean | undefined
  selected?: boolean | undefined
  disabled?: boolean | undefined
}>

export type ParameterBaseProps = Readonly<{
  id: string
  nodeId: string
  label: string
  sockets?: readonly ParameterEndpoint[] | undefined
  connected?: boolean | undefined
  hidden?: boolean | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>

export type TextParameterProps = ParameterBaseProps & Omit<TextFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type NumberParameterProps = ParameterBaseProps & Omit<NumberFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type SliderParameterProps = ParameterBaseProps & Omit<SliderFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type CheckboxParameterProps = ParameterBaseProps & Omit<CheckboxFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type SwitchParameterProps = ParameterBaseProps & Omit<SwitchFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type SelectParameterProps = ParameterBaseProps & Omit<SelectFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type CycleParameterProps = ParameterBaseProps & Omit<CycleFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type OptionGroupParameterProps = ParameterBaseProps & Omit<OptionGroupFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type ColorParameterProps = ParameterBaseProps & Omit<ColorFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type VectorParameterProps = ParameterBaseProps & Omit<VectorFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type MatrixParameterProps = ParameterBaseProps & Omit<MatrixFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type PathParameterProps = ParameterBaseProps & Omit<PathFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type ReferenceParameterProps = ParameterBaseProps & Omit<ReferenceFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type CollectionParameterProps = ParameterBaseProps & Omit<CollectionFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">
export type OutputParameterProps = ParameterBaseProps & Readonly<{value: NodeJsonValue}>

export type ParameterProps = Readonly<{
  nodeId: string
  snapshot: ParameterSnapshot
  sockets: readonly CoreSocket[]
  store?: ExternalStore<ParameterSnapshot> | undefined
  connectedSocketKeys?: ReadonlySet<string> | undefined
  style?: CssStyle | undefined
  onInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>

type ParameterLayoutProps = ParameterBaseProps & Readonly<{
  kind: string
  children: JsxSourceElement
}>

const compactFieldStyle: CssStyle = css`
  width: 0;
  min-width: 0;
  min-height: 20px;
  flex-grow: 1;
  --control-height-medium: 20px;
  --control-height-large: 20px;
  --text-field-height: 20px;
  --number-field-height: 20px;
  --slider-field-height: 20px;
  --field-label-width: 18px;
`

/** Projects one exact Core Parameter Store without copying its value. */
export function Parameter(props: ParameterProps) {
  const fallbackStore = useMemo(() => Object.freeze({
    subscribe: (_listener: () => void) => () => {},
    getSnapshot: () => props.snapshot,
  }), [props.snapshot])
  const store = props.store ?? fallbackStore
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const presentation = snapshot.presentation
  const label = metadataString(presentation, "label", snapshot.id)
  const disabled = metadataBoolean(presentation, "disabled", false)
  const readOnly = metadataBoolean(presentation, "readOnly", false)
  const title = metadataString(presentation, "description", "") || undefined
  const sockets = props.sockets.map(socket => parameterSocket(socket, props.nodeId, props.connectedSocketKeys))
  const connected = sockets.some(socket => socket.connected === true)
  const left = sockets.filter(socket => socket.side === "left")
  const right = sockets.filter(socket => socket.side === "right")
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
  const valueType = snapshot.valueType?.id
  const interaction = metadataString(presentation, "interaction", "")
  const min = metadataNumber(presentation, "min")
  const max = metadataNumber(presentation, "max")
  const step = metadataNumber(presentation, "step") ?? (valueType === "integer" ? 1 : .1)
  const options = selectionOptions(presentation)
  const placeholder = metadataString(presentation, "placeholder", "") || undefined
  const vector = numericVector(snapshot.value)
  const matrix = numericMatrix(snapshot.value)
  const color = colorValue(snapshot.value)
  const reference = referenceValue(snapshot.value)
  const collection = collectionValue(snapshot.value, presentation)
  const axes = metadataStringArray(presentation, "axes") ?? (valueType === "rotation" ? ["X", "Y", "Z"] : undefined)
  const booleanValue = typeof snapshot.value === "boolean" ? snapshot.value : false
  const numberValue = typeof snapshot.value === "number" ? snapshot.value : 0
  const stringValue = typeof snapshot.value === "string" ? snapshot.value : ""
  const booleanSwitch = typeof snapshot.value === "boolean" && interaction === "switch"
  const booleanCheckbox = typeof snapshot.value === "boolean" && !booleanSwitch
  const numberSlider = typeof snapshot.value === "number" && interaction === "slider" && min !== undefined && max !== undefined
  const numberEditor = typeof snapshot.value === "number" && !numberSlider
  const stringSelection = typeof snapshot.value === "string" &&
    (options !== undefined || valueType === "menu" || valueType === "enum")
  const stringCycle = stringSelection && interaction === "cycle"
  const stringOptions = stringSelection && interaction === "option-group"
  const stringSelect = stringSelection && !stringCycle && !stringOptions
  const stringPath = typeof snapshot.value === "string" && !stringSelection && valueType === "path"
  const stringText = typeof snapshot.value === "string" && !stringSelection && !stringPath
  const vectorEditor = (valueType === "vector" || valueType === "rotation") && vector !== null
  const matrixEditor = valueType === "matrix" && matrix !== null
  const colorEditor = valueType === "color" && color !== null
  const referenceEditor = reference !== undefined || isReferenceType(valueType)
  const collectionEditor = !referenceEditor && (collection !== null || valueType === "collection")
  const outputEditor = !booleanSwitch && !booleanCheckbox && !numberSlider && !numberEditor &&
    !stringCycle && !stringOptions && !stringSelect && !stringPath && !stringText &&
    !vectorEditor && !matrixEditor && !colorEditor && !referenceEditor && !collectionEditor
  return <div
    role="group"
    aria-label={label}
    data-parameter-id={snapshot.id}
    data-field-kind={parameterKind(snapshot.value, valueType, interaction)}
    data-socket-count={sockets.length}
    data-connected={connected ? "true" : undefined}
    title={title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      min-width: 0;
      min-height: 20px;
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
      label={label}
      connected={connected}
    />
    <span
      data-parameter-field=""
      hidden={connected}
      style={css`
        box-sizing: border-box;
        display: flex;
        width: 0;
        min-width: 0;
        min-height: 20px;
        flex-grow: 1;

        &[hidden] {
          display: none;
        }
      `}
    >
      {booleanSwitch ? <SwitchField
        checked={booleanValue}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {booleanCheckbox ? <CheckboxField
        checked={booleanValue}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {numberSlider ? <SliderField
        value={numberValue}
        min={min!}
        max={max!}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {numberEditor ? <NumberField
        value={numberValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {stringCycle ? <CycleField
        value={stringValue}
        options={options ?? []}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {stringOptions ? <OptionGroupField
        value={stringValue}
        options={options ?? []}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {stringSelect ? <SelectField
        value={stringValue}
        options={options}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {stringPath ? <PathField
        value={stringValue}
        placeholder={placeholder}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {stringText ? <TextField
        value={stringValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {vectorEditor ? <VectorField
        value={vector!}
        axes={axes}
        min={min}
        max={max}
        step={metadataNumber(presentation, "step")}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {matrixEditor ? <MatrixField
        value={matrix!}
        step={metadataNumber(presentation, "step")}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {colorEditor ? <ColorField
        value={color!}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {referenceEditor ? <ReferenceField
        value={reference ?? null}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
      /> : null}
      {collectionEditor ? <CollectionField
        items={collection?.items ?? []}
        selectedId={collection?.selectedId ?? null}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
      /> : null}
      {outputEditor ? <ParameterOutput value={snapshot.value} /> : null}
    </span>
    <ParameterEndpoints
      nodeId={props.nodeId}
      side="right"
      sockets={right}
      onActivate={props.onSocketActivate}
    />
  </div>
}


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
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      min-width: 0;
      min-height: 20px;
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
    />
    <span
      data-parameter-field=""
      hidden={props.connected === true}
      style={css`
        box-sizing: border-box;
        display: flex;
        width: 0;
        min-width: 0;
        min-height: 20px;
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

function ParameterEndpoints(props: Readonly<{
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
      min-width: ${props.sockets.length === 0 ? "0" : "10px"};
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

function ParameterLabel(props: Readonly<{label: string; connected: boolean}>) {
  return <span
    data-parameter-label=""
    data-connected={props.connected ? "true" : undefined}
    style={css`
      display: block;
      min-width: 0;
      width: 40%;
      overflow: hidden;
      color: var(--widget-list-content);
      font-size: 10px;
      white-space: nowrap;
      text-overflow: ellipsis;

      &[data-connected="true"] {
        width: 0;
        flex-grow: 1;
      }
    `}
  >
    {props.label}
  </span>
}

export function ParameterOutput(props: Readonly<{value: NodeJsonValue}>) {
  return <output
    data-parameter-output=""
    style={css`
      box-sizing: border-box;
      display: block;
      width: 100%;
      min-width: 0;
      height: 20px;
      padding: 2px 5px;
      overflow: hidden;
      border: 1px solid var(--widget-text-outline);
      border-radius: 3px;
      background: var(--widget-text-background-readonly);
      color: var(--widget-text-content-readonly);
      font-size: 10px;
      white-space: nowrap;
      text-overflow: ellipsis;
    `}
  >
    {displayValue(props.value)}
  </output>
}

export type ParameterComponent = FunctionComponent<ParameterProps>
export type TextParameterComponent = FunctionComponent<TextParameterProps>
export type NumberParameterComponent = FunctionComponent<NumberParameterProps>
export type SliderParameterComponent = FunctionComponent<SliderParameterProps>
export type CheckboxParameterComponent = FunctionComponent<CheckboxParameterProps>
export type SwitchParameterComponent = FunctionComponent<SwitchParameterProps>
export type SelectParameterComponent = FunctionComponent<SelectParameterProps>
export type CycleParameterComponent = FunctionComponent<CycleParameterProps>
export type OptionGroupParameterComponent = FunctionComponent<OptionGroupParameterProps>
export type ColorParameterComponent = FunctionComponent<ColorParameterProps>
export type VectorParameterComponent = FunctionComponent<VectorParameterProps>
export type MatrixParameterComponent = FunctionComponent<MatrixParameterProps>
export type PathParameterComponent = FunctionComponent<PathParameterProps>
export type ReferenceParameterComponent = FunctionComponent<ReferenceParameterProps>
export type CollectionParameterComponent = FunctionComponent<CollectionParameterProps>
export type OutputParameterComponent = FunctionComponent<OutputParameterProps>

function parameterSocket(
  socket: CoreSocket,
  nodeId: string,
  connectedSocketKeys?: ReadonlySet<string>,
): ParameterEndpoint {
  const kind = socketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))
  return Object.freeze({
    id: socket.id,
    kind,
    direction: socket.direction,
    side: socketSide(socket),
    label: metadataString(socket.metadata, "label", socket.id),
    title: metadataString(socket.metadata, "description", "") || undefined,
    shape: socketShape(metadataString(socket.metadata, "shape", "")),
    connected: connectedSocketKeys?.has(socketKey(nodeId, socket.id)) === true,
    disabled: metadataBoolean(socket.metadata, "disabled", false),
  })
}

function socketKind(value: string): SocketKind {
  return SOCKET_KINDS.includes(value as SocketKind) ? value as SocketKind : "custom"
}

function socketShape(value: string): SocketShape | undefined {
  return value === "circle" || value === "square" || value === "diamond" ||
    value === "circle-dot" || value === "square-dot" || value === "diamond-dot" ||
    value === "line" || value === "volume-grid" ? value : undefined
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
): Readonly<{items: CollectionFieldProps["items"]; selectedId: string | null}> | null {
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
  })
}

function parameterKind(value: NodeJsonValue, valueType: string | undefined, interaction: string): string {
  if (typeof value === "boolean") return interaction === "switch" ? "switch" : "checkbox"
  if (typeof value === "number") return interaction === "slider" ? "slider" : "number"
  if (typeof value === "string") {
    if (valueType === "menu" || valueType === "enum") return interaction === "cycle" ? "cycle" : interaction === "option-group" ? "option-group" : "select"
    return valueType === "path" ? "path" : "text"
  }
  if (valueType === "rotation") return "vector"
  if (valueType === "vector" || valueType === "matrix" || valueType === "color") return valueType
  if (isReferenceType(valueType)) return "reference"
  if (valueType === "collection") return "collection"
  return "output"
}

function displayValue(value: NodeJsonValue): string {
  if (typeof value === "string") return value
  return JSON.stringify(value) ?? "null"
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
