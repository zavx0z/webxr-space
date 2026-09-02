/** Package-owned external Storybook story support. */
import {CheckboxField} from "@ui/components/fields/checkbox-field"
import {CollectionField} from "@ui/components/fields/collection-field"
import {ColorField} from "@ui/components/fields/color-field"
import {ColorPickerField} from "@ui/components/fields/color-picker-field"
import {CycleField} from "@ui/components/fields/cycle-field"
import {FieldGroup} from "@ui/components/fields/field-group"
import {MatrixField} from "@ui/components/fields/matrix-field"
import {NumberField} from "@ui/components/fields/number-field"
import {OptionGroupField} from "@ui/components/fields/option-group-field"
import {PathField} from "@ui/components/fields/path-field"
import {ReferenceField} from "@ui/components/fields/reference-field"
import {SelectField} from "@ui/components/fields/select-field"
import {SliderField} from "@ui/components/fields/slider-field"
import {SwitchField} from "@ui/components/fields/switch-field"
import {TextField} from "@ui/components/fields/text-field"
import {VectorField} from "@ui/components/fields/vector-field"
import {uiIcons} from "@ui/components/icons"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode
} from "@zavx0z/dom"
import {createRoot, useState, type ComponentRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

type CheckboxFieldProps = Parameters<typeof CheckboxField>[0]
type CollectionFieldProps = Parameters<typeof CollectionField>[0]
type ColorFieldProps = Parameters<typeof ColorField>[0]
type ColorPickerFieldProps = Parameters<typeof ColorPickerField>[0]
type CycleFieldProps = Parameters<typeof CycleField>[0]
type MatrixFieldProps = Parameters<typeof MatrixField>[0]
type NumberFieldProps = Parameters<typeof NumberField>[0]
type OptionGroupFieldProps = Parameters<typeof OptionGroupField>[0]
type PathFieldProps = Parameters<typeof PathField>[0]
type ReferenceFieldProps = Parameters<typeof ReferenceField>[0]
type SelectFieldProps = Parameters<typeof SelectField>[0]
type SliderFieldProps = Parameters<typeof SliderField>[0]
type SwitchFieldProps = Parameters<typeof SwitchField>[0]
type TextFieldProps = Parameters<typeof TextField>[0]
type VectorFieldProps = Parameters<typeof VectorField>[0]

export type FieldGroupStoryItem = Readonly<{
  key: string
  label: string
  value: number
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
}>
export type FieldGroupStoryProps = Readonly<{
  label?: string | undefined
  items: readonly FieldGroupStoryItem[]
  title?: string | undefined
}>

function FieldGroupStory(props: Readonly<{initial: FieldGroupStoryProps}>) {
  const [items, setItems] = useState(props.initial.items)
  const update = (key: string, value: number) => {
    setItems(current => current.map(item => item.key === key ? {...item, value} : item))
  }
  return <FieldGroup label={props.initial.label} title={props.initial.title}>
    {items.map(item => <NumberField
      key={item.key}
      value={item.value}
      min={item.min}
      max={item.max}
      step={item.step}
      title={item.label}
      onInput={value => update(item.key, value)}
    />)}
  </FieldGroup>
}

function TextFieldStory(props: Readonly<{initial: TextFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput: NonNullable<TextFieldProps["onInput"]> = (next, event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <TextField
    label={props.initial.label}
    value={value}
    type={props.initial.type}
    placeholder={props.initial.placeholder}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function NumberFieldStory(props: Readonly<{initial: NumberFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: number, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: number, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <NumberField
    label={props.initial.label}
    value={value}
    min={props.initial.min}
    max={props.initial.max}
    softMin={props.initial.softMin}
    softMax={props.initial.softMax}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function SliderFieldStory(props: Readonly<{initial: SliderFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: number, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: number, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <SliderField
    label={props.initial.label}
    value={value}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function CheckboxFieldStory(props: Readonly<{initial: CheckboxFieldProps}>) {
  const [state, setState] = useState({checked: props.initial.checked, indeterminate: props.initial.indeterminate === true})
  const onChange = (checked: boolean, event: Event) => {
    setState({checked, indeterminate: false})
    props.initial.onChange?.(checked, event)
  }
  return <CheckboxField
    label={props.initial.label}
    checked={state.checked}
    indeterminate={state.indeterminate}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onChange={onChange}
  />
}

function SwitchFieldStory(props: Readonly<{initial: SwitchFieldProps}>) {
  const [checked, setChecked] = useState(props.initial.checked)
  const onChange = (next: boolean, event: Event) => {
    setChecked(next)
    props.initial.onChange?.(next, event)
  }
  return <SwitchField
    label={props.initial.label}
    checked={checked}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onChange={onChange}
  />
}

function SelectFieldStory(props: Readonly<{initial: SelectFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <SelectField
    label={props.initial.label}
    value={value}
    options={props.initial.options}
    state={props.initial.state}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onChange={onChange}
  />
}

function CycleFieldStory(props: Readonly<{initial: CycleFieldProps; presented: boolean}>) {
  const [value, setValue] = useState(props.initial.value)
  const [open, setOpen] = useState(props.initial.open ?? false)
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  const onOpenChange = (next: boolean, event: Event) => {
    setOpen(next)
    props.initial.onOpenChange?.(next, event)
  }
  return <CycleField
    label={props.initial.label}
    value={value}
    options={props.initial.options}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    open={!props.presented && props.initial.open === true ? false : open}
    title={props.initial.title}
    onChange={onChange}
    onOpenChange={onOpenChange}
  />
}

function OptionGroupFieldStory(props: Readonly<{initial: OptionGroupFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <OptionGroupField
    label={props.initial.label}
    value={value}
    options={props.initial.options}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onChange={onChange}
  />
}

function ColorFieldStory(props: Readonly<{initial: ColorFieldProps; presented: boolean}>) {
  const [value, setValue] = useState(props.initial.value)
  const [open, setOpen] = useState(props.initial.open ?? false)
  const onInput = (next: ColorFieldProps["value"], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: ColorFieldProps["value"], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  const onOpenChange = (next: boolean, event: Event) => {
    setOpen(next)
    props.initial.onOpenChange?.(next, event)
  }
  return <ColorField
    label={props.initial.label}
    value={value}
    open={!props.presented && props.initial.open === true ? false : open}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
    onOpenChange={onOpenChange}
  />
}

function ColorPickerFieldStory(props: Readonly<{initial: ColorPickerFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: ColorPickerFieldProps["value"], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: ColorPickerFieldProps["value"], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <ColorPickerField
    label={props.initial.label}
    value={value}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function VectorFieldStory(props: Readonly<{initial: VectorFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: readonly number[], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: readonly number[], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <VectorField
    label={props.initial.label}
    value={value}
    axes={props.initial.axes}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function MatrixFieldStory(props: Readonly<{initial: MatrixFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: readonly (readonly number[])[], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: readonly (readonly number[])[], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <MatrixField
    label={props.initial.label}
    value={value}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function ReferenceFieldStory(props: Readonly<{initial: ReferenceFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onPick = (event: Event) => {
    setValue({id: "viewport", label: "Viewport", kind: "view"})
    props.initial.onPick?.(event)
  }
  const onClear = (event: Event) => {
    setValue(null)
    props.initial.onClear?.(event)
  }
  return <ReferenceField
    label={props.initial.label}
    value={value}
    placeholder={props.initial.placeholder}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onActivate={props.initial.onActivate}
    onPick={onPick}
    onClear={onClear}
  />
}

function PathFieldStory(props: Readonly<{initial: PathFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: string, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  const onBrowse = (event: Event) => {
    setValue("/project/selected.exr")
    props.initial.onBrowse?.(event)
  }
  return <PathField
    label={props.initial.label}
    value={value}
    placeholder={props.initial.placeholder}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    browseTitle={props.initial.browseTitle}
    onInput={onInput}
    onChange={onChange}
    onBrowse={onBrowse}
  />
}

type CollectionItem = CollectionFieldProps["items"][number]
type MoveDirection = Parameters<NonNullable<CollectionFieldProps["onMove"]>>[1]

function CollectionFieldStory(props: Readonly<{initial: CollectionFieldProps}>) {
  const [state, setState] = useState({items: props.initial.items, selectedId: props.initial.selectedId})
  const onSelect = (selectedId: string, event: Event) => {
    setState(current => ({...current, selectedId}))
    props.initial.onSelect?.(selectedId, event)
  }
  const onAdd = (event: Event) => {
    setState(current => {
      const index = current.items.length + 1
      return {...current, items: [...current.items, {id: `item-${index}`, label: `Item ${index}`}]}
    })
    props.initial.onAdd?.(event)
  }
  const onRemove = (id: string, event: Event) => {
    setState(current => {
      const items = current.items.filter(item => item.id !== id)
      return {items, selectedId: items[0]?.id ?? null}
    })
    props.initial.onRemove?.(id, event)
  }
  const onMove = (id: string, direction: MoveDirection, event: Event) => {
    setState(current => ({...current, items: moveItem(current.items, id, direction)}))
    props.initial.onMove?.(id, direction, event)
  }
  return <CollectionField
    label={props.initial.label}
    items={state.items}
    selectedId={state.selectedId}
    visibleRows={props.initial.visibleRows}
    emptyLabel={props.initial.emptyLabel}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onSelect={onSelect}
    onAdd={onAdd}
    onRemove={onRemove}
    onMove={onMove}
  />
}

export function createCompiledFieldGroupProductionStory(document: SemanticDocument, props: FieldGroupStoryProps) {
  return mountCompiledStory(document, FieldGroupStory, {initial: props}, "field-group", fieldGroupSource(props))
}
export function createCompiledTextFieldProductionStory(document: SemanticDocument, props: TextFieldProps) {
  return mountCompiledStory(document, TextFieldStory, {initial: props}, "text-field", componentSource("TextField", "text-field", props, "value", "onInput"))
}
export function createCompiledNumberFieldProductionStory(document: SemanticDocument, props: NumberFieldProps) {
  return mountCompiledStory(document, NumberFieldStory, {initial: props}, "number-field", componentSource("NumberField", "number-field", props, "value", "onInput"))
}
export function createCompiledSliderFieldProductionStory(document: SemanticDocument, props: SliderFieldProps) {
  return mountCompiledStory(document, SliderFieldStory, {initial: props}, "slider-field", componentSource("SliderField", "slider-field", props, "value", "onInput"))
}
export function createCompiledCheckboxFieldProductionStory(document: SemanticDocument, props: CheckboxFieldProps) {
  return mountCompiledStory(document, CheckboxFieldStory, {initial: props}, "checkbox-field", componentSource("CheckboxField", "checkbox-field", props, "checked", "onChange"))
}
export function createCompiledSwitchFieldProductionStory(document: SemanticDocument, props: SwitchFieldProps) {
  return mountCompiledStory(document, SwitchFieldStory, {initial: props}, "switch-field", componentSource("SwitchField", "switch-field", props, "checked", "onChange"))
}
export function createCompiledSelectFieldProductionStory(document: SemanticDocument, props: SelectFieldProps) {
  return mountCompiledStory(document, SelectFieldStory, {initial: props}, "select-field", componentSource("SelectField", "select-field", props, "value", "onChange"))
}
export function createCompiledCycleFieldProductionStory(document: SemanticDocument, props: CycleFieldProps) {
  return mountCompiledStory(
    document,
    CycleFieldStory,
    {initial: props, presented: false},
    "cycle-field",
    popupSource("CycleField", "cycle-field", props),
    root => root.render(CycleFieldStory as any, {initial: props, presented: true}),
  )
}
export function createCompiledOptionGroupFieldProductionStory(document: SemanticDocument, props: OptionGroupFieldProps) {
  return mountCompiledStory(document, OptionGroupFieldStory, {initial: props}, "option-group-field", componentSource("OptionGroupField", "option-group-field", props, "value", "onChange"))
}
export function createCompiledColorFieldProductionStory(document: SemanticDocument, props: ColorFieldProps) {
  return mountCompiledStory(
    document,
    ColorFieldStory,
    {initial: props, presented: false},
    "color-field",
    popupSource("ColorField", "color-field", props, "onInput"),
    root => root.render(ColorFieldStory as any, {initial: props, presented: true}),
  )
}
export function createCompiledColorPickerFieldProductionStory(document: SemanticDocument, props: ColorPickerFieldProps) {
  return mountCompiledStory(document, ColorPickerFieldStory, {initial: props}, "color-picker-field", componentSource("ColorPickerField", "color-picker-field", props, "value", "onInput"))
}
export function createCompiledVectorFieldProductionStory(document: SemanticDocument, props: VectorFieldProps) {
  return mountCompiledStory(document, VectorFieldStory, {initial: props}, "vector-field", componentSource("VectorField", "vector-field", props, "value", "onInput"))
}
export function createCompiledMatrixFieldProductionStory(document: SemanticDocument, props: MatrixFieldProps) {
  return mountCompiledStory(document, MatrixFieldStory, {initial: props}, "matrix-field", componentSource("MatrixField", "matrix-field", props, "value", "onInput"))
}
export function createCompiledReferenceFieldProductionStory(document: SemanticDocument, props: ReferenceFieldProps) {
  return mountCompiledStory(document, ReferenceFieldStory, {initial: props}, "reference-field", referenceSource(props))
}
export function createCompiledPathFieldProductionStory(document: SemanticDocument, props: PathFieldProps) {
  return mountCompiledStory(document, PathFieldStory, {initial: props}, "path-field", componentSource("PathField", "path-field", props, "value", "onInput"))
}
export function createCompiledCollectionFieldProductionStory(document: SemanticDocument, props: CollectionFieldProps) {
  return mountCompiledStory(document, CollectionFieldStory, {initial: props}, "collection-field", collectionSource(props))
}

function moveItem(items: readonly CollectionItem[], id: string, direction: MoveDirection): readonly CollectionItem[] {
  const next = [...items]
  const source = next.findIndex(item => item.id === id)
  const target = source + (direction === "up" ? -1 : 1)
  if (source < 0 || target < 0 || target >= next.length) return items
  const [item] = next.splice(source, 1)
  next.splice(target, 0, item!)
  return next
}

function mountCompiledStory(
  document: SemanticDocument,
  component: unknown,
  props: unknown,
  name: string,
  typescript: string,
  afterPresent?: (root: ComponentRoot) => void,
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(component as any, props as any)
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as SemanticHTMLElement | undefined
  if (!owner) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  let presented = false
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      get source() {
        return Object.freeze({html: serialize(owner), typescript})
      },
      ...(afterPresent === undefined ? {} : {
        afterPresent() {
          if (presented) return
          presented = true
          afterPresent(root)
        }
      }),
      dispose() {
        root.unmount()
      },
    }),
  })
}

function componentSource(
  component: string,
  subpath: string,
  props: Readonly<Record<string, unknown>>,
  stateKey: string,
  callback: string,
): string {
  const state = props[stateKey]
  const lines = Object.entries(props)
    .filter(([key, value]) => key !== stateKey && key !== "style" && typeof value !== "function")
    .map(([key, value]) => `    ${key}={${literal(value)}}`)
  const iconImport = lines.some(line => line.includes("uiIcons."))
    ? ['import {uiIcons} from "@ui/components/icons"']
    : []
  return [
    `import {${component}} from "@ui/components/fields/${subpath}"`,
    ...iconImport,
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [${stateKey}, setState] = useState(${literal(state)})`,
    `  return <${component}`,
    ...lines,
    `    ${stateKey}={${stateKey}}`,
    `    ${callback}={setState}`,
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function popupSource(
  component: "CycleField" | "ColorField",
  subpath: "cycle-field" | "color-field",
  props: Readonly<Record<string, unknown>>,
  valueCallback = "onChange",
): string {
  const lines = Object.entries(props)
    .filter(([key, value]) => key !== "value" && key !== "open" && key !== "style" && typeof value !== "function")
    .map(([key, value]) => `    ${key}={${literal(value)}}`)
  const iconImport = lines.some(line => line.includes("uiIcons."))
    ? ['import {uiIcons} from "@ui/components/icons"']
    : []
  return [
    `import {${component}} from "@ui/components/fields/${subpath}"`,
    ...iconImport,
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${literal(props.value)})`,
    `  const [open, setOpen] = useState(${String(props.open === true)})`,
    `  return <${component}`,
    ...lines,
    "    value={value}",
    "    open={open}",
    `    ${valueCallback}={setValue}`,
    "    onOpenChange={setOpen}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function fieldGroupSource(props: FieldGroupStoryProps): string {
  return [
    'import {FieldGroup} from "@ui/components/fields/field-group"',
    'import {NumberField} from "@ui/components/fields/number-field"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [items, setItems] = useState(${literal(props.items)})`,
    `  return <FieldGroup label={${literal(props.label)}}>`,
    "    {items.map(item => <NumberField",
    "      key={item.key}",
    "      value={item.value}",
    "      min={item.min}",
    "      max={item.max}",
    "      step={item.step}",
    "      title={item.label}",
    "      onInput={value => setItems(current => current.map(entry =>",
    "        entry.key === item.key ? {...entry, value} : entry",
    "      ))}",
    "    />)}",
    "  </FieldGroup>",
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function referenceSource(props: ReferenceFieldProps): string {
  return [
    'import {ReferenceField} from "@ui/components/fields/reference-field"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${literal(props.value)})`,
    `  return <ReferenceField label={${literal(props.label)}} value={value}`,
    '    onPick={() => setValue({id: "viewport", label: "Viewport", kind: "view"})}',
    "    onClear={() => setValue(null)}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function collectionSource(props: CollectionFieldProps): string {
  return [
    'import {CollectionField} from "@ui/components/fields/collection-field"',
    'import {uiIcons} from "@ui/components/icons"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [selectedId, setSelectedId] = useState(${literal(props.selectedId)})`,
    `  return <CollectionField label={${literal(props.label)}} items={${literal(props.items)}} selectedId={selectedId} onSelect={setSelectedId} />`,
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function literal(value: unknown): string {
  let source = JSON.stringify(value, (_key, entry) => typeof entry === "function" ? undefined : entry, 2) ?? "undefined"
  for (const [name, icon] of Object.entries(uiIcons)) {
    source = source.replaceAll(JSON.stringify(icon), `uiIcons.${name}`)
  }
  return source
}

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
