import {defineStyles, useId, type StyleValue} from "@zavx0z/react"
import {Checkbox, checkboxCss} from "./checkbox.tsx"
import {CollectionInput, collectionInputCss} from "./collection-input.tsx"
import {ColorInput, colorInputCss} from "./color-input.tsx"
import {EnumInput, enumInputCss} from "./enum-input.tsx"
import {IntegerInput, integerInputCss} from "./integer-input.tsx"
import {MatrixInput, matrixInputCss} from "./matrix-input.tsx"
import {NumberInput, numberInputCss} from "./number-input.tsx"
import {PathInput, pathInputCss} from "./path-input.tsx"
import {ReferenceInput, referenceInputCss} from "./reference-input.tsx"
import {SliderControl, sliderControlCss} from "./slider-control.tsx"
import {Switcher, switcherCss} from "./switcher.tsx"
import {TextField, textFieldCss} from "./text-field.tsx"
import {VectorInput, vectorInputCss} from "./vector-input.tsx"

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
  style?: StyleValue
}>

export const fieldStyles = defineStyles("@ui/components/field", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    minWidth: 0,
    minHeight: 28,
    gap: 4,
    padding: 0,
    color: "rgb(204 204 204)"
  },
  disabled: {opacity: 0.5},
  label: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    width: "40%",
    minWidth: 0,
    height: 28,
    color: "rgb(204 204 204)",
    fontSize: 12
  },
  controlSlot: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "flex-start",
    minWidth: 0,
    minHeight: 28,
    flexGrow: 1
  },
  fullWidth: {width: "100%"},
  boolean: {marginTop: 5},
  readonly: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    width: "100%",
    minHeight: 28,
    padding: "3px 7px",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(48 48 48)",
    color: "rgb(153 153 153)",
    fontSize: 12
  }
})

export const fieldCss = [
  checkboxCss,
  collectionInputCss,
  colorInputCss,
  enumInputCss,
  integerInputCss,
  matrixInputCss,
  numberInputCss,
  pathInputCss,
  referenceInputCss,
  sliderControlCss,
  switcherCss,
  textFieldCss,
  vectorInputCss,
  fieldStyles.cssText
].join("\n")

function TextFieldControl(props: Readonly<{definition: TextFieldDefinition}>) {
  const onInput = (value: string) => props.definition.onChange?.(value)
  return <TextField
    value={props.definition.value}
    placeholder={props.definition.placeholder}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function NumberFieldControl(props: Readonly<{definition: NumberFieldDefinition}>) {
  const onInput = (value: number) => props.definition.onChange?.(value)
  return <NumberInput
    value={props.definition.value}
    min={props.definition.min}
    max={props.definition.max}
    step={props.definition.step}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function SliderFieldControl(props: Readonly<{definition: NumberFieldDefinition}>) {
  const onInput = (value: number) => props.definition.onChange?.(value)
  return <SliderControl
    value={props.definition.value}
    min={props.definition.min ?? 0}
    max={props.definition.max ?? 100}
    step={props.definition.step ?? 0.1}
    disabled={props.definition.disabled === true || props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function IntegerFieldControl(props: Readonly<{definition: IntegerFieldDefinition}>) {
  const onInput = (value: number) => props.definition.onChange?.(value)
  return <IntegerInput
    value={props.definition.value}
    min={props.definition.min}
    max={props.definition.max}
    step={props.definition.step}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function CheckboxFieldControl(props: Readonly<{definition: BooleanFieldDefinition}>) {
  return <Checkbox
    checked={props.definition.value}
    disabled={props.definition.disabled === true || props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.boolean}
    onChange={props.definition.onChange}
  />
}

function SwitchFieldControl(props: Readonly<{definition: BooleanFieldDefinition}>) {
  return <Switcher
    checked={props.definition.value}
    disabled={props.definition.disabled === true || props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.boolean}
    onChange={props.definition.onChange}
  />
}

function EnumFieldControl(props: Readonly<{definition: EnumFieldDefinition}>) {
  return <EnumInput
    value={props.definition.value}
    options={props.definition.options.map(option => ({...option, key: option.value}))}
    disabled={props.definition.disabled === true || props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onChange={props.definition.onChange}
  />
}

function ColorFieldControl(props: Readonly<{definition: ColorFieldDefinition}>) {
  const onInput = (value: ColorFieldDefinition["value"]) => props.definition.onChange?.(value)
  return <ColorInput
    value={props.definition.value}
    label={props.definition.label}
    presentation="expanded"
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function VectorFieldControl(props: Readonly<{definition: VectorFieldDefinition | RotationFieldDefinition}>) {
  const onInput = (value: readonly number[]) => props.definition.onChange?.(
    props.definition.numberKind === "integer" ? Object.freeze(value.map(Math.round)) : value
  )
  return <VectorInput
    value={props.definition.value}
    axes={props.definition.axes}
    min={props.definition.min}
    max={props.definition.max}
    step={props.definition.numberKind === "integer" ? props.definition.step ?? 1 : props.definition.step}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function MatrixFieldControl(props: Readonly<{definition: MatrixFieldDefinition}>) {
  const onInput = (value: readonly (readonly number[])[]) => props.definition.onChange?.(value)
  return <MatrixInput
    value={props.definition.value}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
  />
}

function ReferenceFieldControl(props: Readonly<{definition: ReferenceFieldDefinition}>) {
  return <ReferenceInput
    value={props.definition.value}
    placeholder={props.definition.placeholder}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onActivate={props.definition.onActivate}
    onPick={props.definition.onPick}
    onClear={props.definition.onClear}
  />
}

function CollectionFieldControl(props: Readonly<{definition: CollectionFieldDefinition}>) {
  return <CollectionInput
    items={props.definition.items}
    selectedId={props.definition.selectedId}
    visibleRows={props.definition.visibleRows}
    emptyLabel={props.definition.emptyLabel}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onSelect={props.definition.onSelect}
    onAdd={props.definition.onAdd}
    onRemove={props.definition.onRemove}
    onMove={props.definition.onMove}
  />
}

function PathFieldControl(props: Readonly<{definition: PathFieldDefinition}>) {
  const onInput = (value: string) => props.definition.onChange?.(value)
  return <PathInput
    value={props.definition.value}
    placeholder={props.definition.placeholder}
    disabled={props.definition.disabled === true}
    readOnly={props.definition.readOnly === true}
    title={props.definition.description}
    style={fieldStyles.fullWidth}
    onInput={onInput}
    onBrowse={props.definition.onBrowse}
  />
}

function ReadonlyFieldControl(props: Readonly<{definition: ReadonlyFieldDefinition}>) {
  return <div title={props.definition.description} style={fieldStyles.readonly}>{String(props.definition.value)}</div>
}

function FieldControlView(props: Readonly<{definition: FieldDefinition; labelId: string}>) {
  const definition = props.definition
  return <div
    role="group"
    aria-labelledby={props.labelId}
    style={fieldStyles.controlSlot}
  >
    {definition.kind === "text" ? <TextFieldControl definition={definition} /> : null}
    {definition.kind === "number" && (definition.presentation ?? "input") !== "slider" ? <NumberFieldControl definition={definition} /> : null}
    {definition.kind === "number" && definition.presentation === "slider" ? <SliderFieldControl definition={definition} /> : null}
    {definition.kind === "integer" ? <IntegerFieldControl definition={definition} /> : null}
    {definition.kind === "boolean" && (definition.presentation ?? "checkbox") !== "switch" ? <CheckboxFieldControl definition={definition} /> : null}
    {definition.kind === "boolean" && definition.presentation === "switch" ? <SwitchFieldControl definition={definition} /> : null}
    {definition.kind === "enum" ? <EnumFieldControl definition={definition} /> : null}
    {definition.kind === "color" ? <ColorFieldControl definition={definition} /> : null}
    {definition.kind === "vector" || definition.kind === "rotation" ? <VectorFieldControl definition={definition} /> : null}
    {definition.kind === "matrix" ? <MatrixFieldControl definition={definition} /> : null}
    {definition.kind === "reference" ? <ReferenceFieldControl definition={definition} /> : null}
    {definition.kind === "collection" ? <CollectionFieldControl definition={definition} /> : null}
    {definition.kind === "path" ? <PathFieldControl definition={definition} /> : null}
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
    style={[
      fieldStyles.root,
      props.definition.disabled === true && fieldStyles.disabled,
      props.style
    ]}
  >
    <span id={labelId} style={fieldStyles.label}>{props.definition.label}</span>
    <FieldControlView definition={props.definition} labelId={labelId} />
  </div>
}

function assertFieldIdentity(definition: FieldDefinition): void {
  if (!definition || typeof definition !== "object") throw new TypeError("Field definition must be an object")
  if (typeof definition.id !== "string" || definition.id.length === 0) throw new TypeError("Field id must not be empty")
  if (typeof definition.label !== "string" || definition.label.length === 0) throw new TypeError("Field label must not be empty")
}
