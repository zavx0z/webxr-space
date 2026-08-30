import {useId} from "@zavx0z/react"
import {Checkbox} from "./checkbox.tsx"
import {CollectionInput} from "./collection-input.tsx"
import {ColorInput} from "./color-input.tsx"
import {EnumInput} from "./enum-input.tsx"
import {IntegerInput} from "./integer-input.tsx"
import {MatrixInput} from "./matrix-input.tsx"
import {NumberInput} from "./number-input.tsx"
import {PathInput} from "./path-input.tsx"
import {ReferenceInput} from "./reference-input.tsx"
import {SliderControl} from "./slider-control.tsx"
import {Switcher} from "./switcher.tsx"
import {TextField} from "./text-field.tsx"
import {VectorInput} from "./vector-input.tsx"

export const FIELD_KINDS = Object.freeze([
  "text",
  "number",
  "integer",
  "boolean",
  "enum",
  "color",
  "vector",
  "rotation",
  "matrix",
  "reference",
  "collection",
  "path",
  "readonly"
] as const)

export type FieldKind = typeof FIELD_KINDS[number]
export type FieldNumberKind = "float" | "integer"
export type FieldVectorDimension = 2 | 3 | 4
export type FieldMatrixSize = 2 | 3 | 4
export type FieldCollectionMoveDirection = "up" | "down"

export type FieldColor = Readonly<{r: number; g: number; b: number; a: number}>
export type FieldReference = Readonly<{id: string; label: string; kind?: string}>
export type FieldCollectionItem = Readonly<{
  id: string
  label: string
  description?: string
  disabled?: boolean
}>

export type FieldBase = Readonly<{
  id: string
  label: string
  description?: string
  disabled?: boolean
  readOnly?: boolean
}>

export type TextFieldDefinition = FieldBase & Readonly<{
  kind: "text"
  value: string
  placeholder?: string
  onChange?(value: string): void
}>

export type NumberFieldDefinition = FieldBase & Readonly<{
  kind: "number"
  value: number
  presentation?: "input" | "slider"
  min?: number
  max?: number
  step?: number
  onChange?(value: number): void
}>

export type IntegerFieldDefinition = FieldBase & Readonly<{
  kind: "integer"
  value: number
  min?: number
  max?: number
  step?: number
  onChange?(value: number): void
}>

export type BooleanFieldDefinition = FieldBase & Readonly<{
  kind: "boolean"
  value: boolean
  presentation?: "checkbox" | "switch"
  onChange?(value: boolean): void
}>

export type FieldOption = Readonly<{value: string; label: string; disabled?: boolean}>

export type EnumFieldDefinition = FieldBase & Readonly<{
  kind: "enum"
  value: string
  options: readonly FieldOption[]
  onChange?(value: string): void
}>

export type ColorFieldDefinition = FieldBase & Readonly<{
  kind: "color"
  value: FieldColor
  onChange?(value: FieldColor): void
}>

export type VectorFieldDefinition = FieldBase & Readonly<{
  kind: "vector"
  value: readonly number[]
  dimensions?: FieldVectorDimension
  axes?: readonly string[]
  numberKind?: FieldNumberKind
  min?: number
  max?: number
  step?: number
  onChange?(value: readonly number[]): void
}>

export type RotationFieldDefinition = Omit<VectorFieldDefinition, "kind"> & Readonly<{kind: "rotation"}>

export type MatrixFieldDefinition = FieldBase & Readonly<{
  kind: "matrix"
  value: readonly (readonly number[])[]
  onChange?(value: readonly (readonly number[])[]): void
}>

export type ReferenceFieldDefinition = FieldBase & Readonly<{
  kind: "reference"
  value: FieldReference | null
  placeholder?: string
  onActivate?(): void
  onPick?(): void
  onClear?(): void
}>

export type CollectionFieldDefinition = FieldBase & Readonly<{
  kind: "collection"
  items: readonly FieldCollectionItem[]
  selectedId: string | null
  visibleRows?: number
  emptyLabel?: string
  onSelect?(id: string): void
  onAdd?(): void
  onRemove?(id: string): void
  onMove?(id: string, direction: FieldCollectionMoveDirection): void
}>

export type PathFieldDefinition = FieldBase & Readonly<{
  kind: "path"
  value: string
  placeholder?: string
  onChange?(value: string): void
  onBrowse?(): void
}>

export type ReadonlyFieldDefinition = FieldBase & Readonly<{
  kind: "readonly"
  value: string | number
}>

export type FieldDefinition =
  | TextFieldDefinition
  | NumberFieldDefinition
  | IntegerFieldDefinition
  | BooleanFieldDefinition
  | EnumFieldDefinition
  | ColorFieldDefinition
  | VectorFieldDefinition
  | RotationFieldDefinition
  | MatrixFieldDefinition
  | ReferenceFieldDefinition
  | CollectionFieldDefinition
  | PathFieldDefinition
  | ReadonlyFieldDefinition

export type FieldProps = Readonly<{
  definition: FieldDefinition
  style?: CssStyle | undefined
}>

const fullWidthStyle: CssStyle = css`& { width: 100%; }`
const booleanStyle: CssStyle = css`& { margin-top: 5px; }`

function ReadonlyFieldControl(props: Readonly<{definition: ReadonlyFieldDefinition}>) {
  return <div title={props.definition.description} style={css`
    & {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 28px;
      padding: 3px 7px;
      border: var(--border-width-control) solid var(--widget-regular-outline);
      border-radius: 4px;
      background: var(--widget-number-background-readonly);
      color: var(--widget-text-content-readonly);
      font-size: var(--font-size-sm);
    }
  `}>{String(props.definition.value)}</div>
}

function FieldControlView(props: Readonly<{definition: FieldDefinition; labelId: string}>) {
  const definition = props.definition
  const vectorInput = (value: readonly number[]): void => {
    if (definition.kind !== "vector" && definition.kind !== "rotation") return
    definition.onChange?.(
      definition.numberKind === "integer" ? Object.freeze(value.map(Math.round)) : value
    )
  }
  return <div
    role="group"
    aria-labelledby={props.labelId}
    style={css`
      & { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }
    `}
  >
    {definition.kind === "text" ? <TextField
      value={definition.value}
      placeholder={definition.placeholder}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
    /> : null}
    {definition.kind === "number" && (definition.presentation ?? "input") !== "slider" ? <NumberInput
      value={definition.value}
      min={definition.min}
      max={definition.max}
      step={definition.step}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
    /> : null}
    {definition.kind === "number" && definition.presentation === "slider" ? <SliderControl
      value={definition.value}
      min={definition.min ?? 0}
      max={definition.max ?? 100}
      step={definition.step ?? 0.1}
      disabled={definition.disabled === true || definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
    /> : null}
    {definition.kind === "integer" ? <IntegerInput
      value={definition.value}
      min={definition.min}
      max={definition.max}
      step={definition.step}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
    /> : null}
    {definition.kind === "boolean" && (definition.presentation ?? "checkbox") !== "switch" ? <Checkbox
      checked={definition.value}
      disabled={definition.disabled === true || definition.readOnly === true}
      title={definition.description}
      style={booleanStyle}
      onChange={definition.onChange}
    /> : null}
    {definition.kind === "boolean" && definition.presentation === "switch" ? <Switcher
      checked={definition.value}
      disabled={definition.disabled === true || definition.readOnly === true}
      title={definition.description}
      style={booleanStyle}
      onChange={definition.onChange}
    /> : null}
    {definition.kind === "enum" ? <EnumInput
      value={definition.value}
      options={definition.options.map(option => ({...option, key: option.value}))}
      disabled={definition.disabled === true || definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onChange={definition.onChange}
    /> : null}
    {definition.kind === "color" ? <ColorInput
      value={definition.value}
      label={definition.label}
      presentation="expanded"
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
    /> : null}
    {definition.kind === "vector" || definition.kind === "rotation" ? <VectorInput
      value={definition.value}
      axes={definition.axes}
      min={definition.min}
      max={definition.max}
      step={definition.numberKind === "integer" ? definition.step ?? 1 : definition.step}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={vectorInput}
    /> : null}
    {definition.kind === "matrix" ? <MatrixInput
      value={definition.value}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
    /> : null}
    {definition.kind === "reference" ? <ReferenceInput
      value={definition.value}
      placeholder={definition.placeholder}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onActivate={definition.onActivate}
      onPick={definition.onPick}
      onClear={definition.onClear}
    /> : null}
    {definition.kind === "collection" ? <CollectionInput
      items={definition.items}
      selectedId={definition.selectedId}
      visibleRows={definition.visibleRows}
      emptyLabel={definition.emptyLabel}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onSelect={definition.onSelect}
      onAdd={definition.onAdd}
      onRemove={definition.onRemove}
      onMove={definition.onMove}
    /> : null}
    {definition.kind === "path" ? <PathInput
      value={definition.value}
      placeholder={definition.placeholder}
      disabled={definition.disabled === true}
      readOnly={definition.readOnly === true}
      title={definition.description}
      style={fullWidthStyle}
      onInput={definition.onChange}
      onBrowse={definition.onBrowse}
    /> : null}
    {definition.kind === "readonly" ? <ReadonlyFieldControl definition={definition} /> : null}
  </div>
}

export function Field(props: FieldProps) {
  assertFieldIdentity(props.definition)
  const labelId = useId()
  return <div
    data-field-id={props.definition.id}
    data-field-kind={props.definition.kind}
    aria-disabled={String(props.definition.disabled === true)}
    title={props.definition.description}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          width: 100%;
          min-width: 0;
          min-height: 28px;
          gap: 4px;
          padding: 0;
          color: var(--widget-list-content);
        }
        &[aria-disabled="true"] { opacity: 0.5; }
        ${props.style}
      `}
  >
    <span id={labelId} style={css`
      & { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }
    `}>{props.definition.label}</span>
    <FieldControlView definition={props.definition} labelId={labelId} />
  </div>
}

function assertFieldIdentity(definition: FieldDefinition): void {
  if (!definition || typeof definition !== "object") throw new TypeError("Field definition must be an object")
  if (typeof definition.id !== "string" || definition.id.length === 0) throw new TypeError("Field id must not be empty")
  if (typeof definition.label !== "string" || definition.label.length === 0) throw new TypeError("Field label must not be empty")
}
