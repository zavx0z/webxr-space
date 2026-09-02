import {
  CheckboxField,
  checkboxFieldLayout,
  type CheckboxFieldProps,
} from "@zavx0z/ui/fields/checkbox-field"
import {
  CollectionField,
  collectionFieldLayout,
  type CollectionFieldProps,
} from "@zavx0z/ui/fields/collection-field"
import {
  ColorField,
  colorFieldLayout,
  type ColorFieldProps,
  type ColorFieldValue,
} from "@zavx0z/ui/fields/color-field"
import {
  CycleField,
  cycleFieldLayout,
  type CycleFieldProps,
} from "@zavx0z/ui/fields/cycle-field"
import {
  MatrixField,
  matrixFieldLayout,
  type MatrixFieldProps,
} from "@zavx0z/ui/fields/matrix-field"
import {
  NumberField,
  numberFieldLayout,
  type NumberFieldProps,
} from "@zavx0z/ui/fields/number-field"
import {
  ToggleButtonGroup,
  toggleButtonGroupLayout,
  type ToggleButtonGroupProps,
} from "@zavx0z/ui/buttons/toggle-button-group"
import {
  PathField,
  pathFieldLayout,
  type PathFieldProps,
} from "@zavx0z/ui/fields/path-field"
import {
  ReferenceField,
  referenceFieldLayout,
  type ReferenceFieldProps,
  type ReferenceFieldValue,
} from "@zavx0z/ui/fields/reference-field"
import {
  SelectField,
  selectFieldLayout,
  type SelectFieldOption,
  type SelectFieldProps,
} from "@zavx0z/ui/fields/select-field"
import {
  SliderField,
  sliderFieldLayout,
  type SliderFieldProps,
} from "@zavx0z/ui/fields/slider-field"
import {
  SwitchField,
  switchFieldLayout,
  type SwitchFieldProps,
} from "@zavx0z/ui/fields/switch-field"
import {
  TextField,
  textFieldLayout,
  type TextFieldProps,
} from "@zavx0z/ui/fields/text-field"
import {
  VectorField,
  vectorFieldLayout,
  type VectorFieldProps,
} from "@zavx0z/ui/fields/vector-field"
import type {
  ExternalStore,
  NodeJsonObject,
  NodeJsonValue,
  ParameterSnapshot,
  Socket as CoreSocket,
} from "@zavx0z/nodetree"
import {
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/component"
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
} from "./src/projection/geometry.ts"
import {
  NODE_PARAMETER_SPACING_MEDIUM,
  NODE_PARAMETER_SPACING_SMALL,
  NODE_ROW_HEIGHT,
} from "./src/projection/metrics.ts"
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
export type OptionGroupParameterProps = ParameterBaseProps & Omit<ToggleButtonGroupProps, "label" | "disabled" | "readOnly" | "title" | "style">
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
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  spacingBefore?: "small" | "medium" | undefined
  style?: CssStyle | undefined
  onInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>

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

type ParameterLayoutProps = ParameterBaseProps & Readonly<{
  kind: string
  fieldOwnsLabel?: boolean | undefined
  children: JsxSourceElement
}>

const PARAMETER_OUTPUT_HEIGHT = 20

const compactFieldStyle: CssStyle = css`
  width: 0;
  min-width: 0;
  flex-grow: 1;
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
  const leadingCheckbox = kind === "checkbox" && !connected
  const numberOwnsLabel = kind === "number" && !connected
  const insetNumberRow = numberOwnsLabel && left.length > 0 && right.length === 0
  return <div
    role="group"
    aria-label={label}
    data-parameter-id={snapshot.id}
    data-field-kind={kind}
    data-socket-count={sockets.length}
    data-connected={connected ? "true" : undefined}
    data-label-hidden={labelHidden ? "true" : undefined}
    data-leading-checkbox={leadingCheckbox ? "true" : undefined}
    data-inset-number-row={insetNumberRow ? "true" : undefined}
    data-spacing-before={props.spacingBefore}
    title={title}
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
      label={label}
      connected={connected}
      hidden={labelHidden || leadingCheckbox || numberOwnsLabel}
    />
    <span
      data-parameter-field=""
      data-leading={leadingCheckbox ? "true" : undefined}
      hidden={connected}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: ${leadingCheckbox ? "18px" : "0"};
        min-width: 0;
        min-height: ${NODE_ROW_HEIGHT}px;
        flex-grow: ${leadingCheckbox ? 0 : 1};

        &[hidden] {
          display: none;
        }
      `}
    >
      {kind === "switch" ? <SwitchField
        checked={booleanValue}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {kind === "checkbox" ? <CheckboxField
        checked={booleanValue}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        onChange={change}
      /> : null}
      {kind === "slider" ? <SliderField
        value={numberValue}
        min={min!}
        max={max!}
        step={step}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {kind === "number" ? <NumberField
        label={numberOwnsLabel ? label : undefined}
        value={numberValue}
        min={min}
        max={max}
        step={step}
        precision={precision}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        onInput={input}
        onChange={change}
      /> : null}
      {kind === "cycle" ? <CycleField
        value={stringValue}
        options={options ?? []}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {kind === "option-group" ? <ToggleButtonGroup
        value={stringValue}
        options={options ?? []}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onChange={change}
      /> : null}
      {kind === "select" ? <SelectField
        value={stringValue}
        options={options}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        onChange={change}
      /> : null}
      {kind === "path" ? <PathField
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
      {kind === "text" ? <TextField
        value={stringValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {kind === "vector" ? <VectorField
        value={vector!}
        axes={axes}
        min={min}
        max={max}
        step={rawStep}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {kind === "matrix" ? <MatrixField
        value={matrix!}
        step={rawStep}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {kind === "color" ? <ColorField
        value={color!}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
        onInput={input}
        onChange={change}
      /> : null}
      {kind === "reference" ? <ReferenceField
        value={reference ?? null}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
      /> : null}
      {kind === "collection" ? <CollectionField
        items={collection?.items ?? []}
        selectedId={collection?.selectedId ?? null}
        visibleRows={collection?.visibleRows}
        density="compact"
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        style={compactFieldStyle}
      /> : null}
      {kind === "output" ? <ParameterOutput value={snapshot.value} /> : null}
    </span>
    {leadingCheckbox ? <ParameterLabel
      label={label}
      connected={false}
      expanded
    /> : null}
    <ParameterEndpoints
      nodeId={props.nodeId}
      side="right"
      sockets={right}
      onActivate={props.onSocketActivate}
    />
  </div>
}


function ParameterLayout(props: ParameterLayoutProps) {
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

function ParameterLabel(props: Readonly<{
  label: string
  connected: boolean
  hidden?: boolean | undefined
  expanded?: boolean | undefined
}>) {
  return <span
    data-parameter-label=""
    data-connected={props.connected ? "true" : undefined}
    data-expanded={props.expanded === true ? "true" : undefined}
    hidden={props.hidden === true}
    style={css`
      display: block;
      min-width: 0;
      width: 40%;
      overflow: hidden;
      color: var(--widget-list-content);
      font-size: var(--font-size-xs);
      white-space: nowrap;
      text-overflow: ellipsis;

      &[data-connected="true"] {
        width: 0;
        flex-grow: 1;
      }

      &[data-expanded="true"] {
        width: 0;
        flex-grow: 1;
      }

      &[hidden] {
        display: none;
      }
    `}
  >
    {props.label}
  </span>
}

function ParameterOutput(props: Readonly<{value: NodeJsonValue}>) {
  return <output
    data-parameter-output=""
    style={css`
      box-sizing: border-box;
      display: block;
      width: 100%;
      min-width: 0;
      height: ${PARAMETER_OUTPUT_HEIGHT}px;
      padding: 2px 5px;
      overflow: hidden;
      border: var(--border-width-control) solid var(--widget-text-outline);
      border-radius: var(--radius-small);
      background: var(--widget-text-background-readonly);
      color: var(--widget-text-content-readonly);
      font-size: var(--font-size-xs);
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
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right">,
): ParameterEndpoint {
  const kind = socketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))
  return Object.freeze({
    id: socket.id,
    kind,
    direction: socket.direction,
    side: resolvedSocketSides?.get(socketKey(nodeId, socket.id)) ?? socketSide(socket),
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
 * Одним чистым проходом выбирает UI-владельца projected Parameter и готовит
 * те же данные, которые затем использует и отрисовка, и числовая геометрия.
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

/** Числовая высота ровно того публичного UI Field, который выбрал resolver. */
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

export function TextParameter(props: TextParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="text"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <TextField
      value={props.value}
      type={props.type}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function NumberParameter(props: NumberParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="number"
    fieldOwnsLabel
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <NumberField
      label={props.label}
      value={props.value}
      min={props.min}
      max={props.max}
      softMin={props.softMin}
      softMax={props.softMax}
      step={props.step}
      precision={props.precision}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function SliderParameter(props: SliderParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="slider"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <SliderField
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step}
      density={props.density ?? "compact"}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function CheckboxParameter(props: CheckboxParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="checkbox"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CheckboxField
      checked={props.checked}
      indeterminate={props.indeterminate}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function SwitchParameter(props: SwitchParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="switch"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <SwitchField
      checked={props.checked}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function SelectParameter(props: SelectParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="select"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <SelectField
      value={props.value}
      options={props.options}
      state={props.state}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function CycleParameter(props: CycleParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="cycle"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CycleField
      value={props.value}
      options={props.options}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      open={props.open}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
      onOpenChange={props.onOpenChange}
    />
  </ParameterLayout>
}

export function OptionGroupParameter(props: OptionGroupParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="option-group"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ToggleButtonGroup
      value={props.value}
      options={props.options}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function ColorParameter(props: ColorParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="color"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ColorField
      value={props.value}
      open={props.open}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
      onOpenChange={props.onOpenChange}
    />
  </ParameterLayout>
}

export function VectorParameter(props: VectorParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="vector"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <VectorField
      value={props.value}
      axes={props.axes}
      min={props.min}
      max={props.max}
      step={props.step}
      density={props.density ?? "compact"}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function MatrixParameter(props: MatrixParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="matrix"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <MatrixField
      value={props.value}
      step={props.step}
      density={props.density ?? "compact"}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function PathParameter(props: PathParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="path"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <PathField
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      density="compact"
      title={props.title}
      browseTitle={props.browseTitle}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
      onBrowse={props.onBrowse}
    />
  </ParameterLayout>
}

export function ReferenceParameter(props: ReferenceParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="reference"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ReferenceField
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      density="compact"
      title={props.title}
      style={compactFieldStyle}
      onActivate={props.onActivate}
      onPick={props.onPick}
      onClear={props.onClear}
    />
  </ParameterLayout>
}

export function CollectionParameter(props: CollectionParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="collection"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CollectionField
      items={props.items}
      selectedId={props.selectedId}
      visibleRows={props.visibleRows}
      emptyLabel={props.emptyLabel}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onRemove={props.onRemove}
      onMove={props.onMove}
    />
  </ParameterLayout>
}

export function OutputParameter(props: OutputParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="output"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ParameterOutput value={props.value} />
  </ParameterLayout>
}
