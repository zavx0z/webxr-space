/** Package-owned external Storybook story support. */
import {BooleanField, type BooleanFieldProps} from "@ui/components/fields/boolean-field"
import {CollectionField, type CollectionFieldProps} from "@ui/components/fields/collection-field"
import {ColorField, type ColorFieldProps, type ColorFieldValue} from "@ui/components/fields/color-field"
import {EnumField, type EnumFieldProps} from "@ui/components/fields/enum-field"
import {IntegerField, type IntegerFieldProps} from "@ui/components/fields/integer-field"
import {MatrixField, type MatrixFieldProps} from "@ui/components/fields/matrix-field"
import {NumberField, type NumberFieldProps} from "@ui/components/fields/number-field"
import {PathField, type PathFieldProps} from "@ui/components/fields/path-field"
import {ReadonlyField, type ReadonlyFieldProps} from "@ui/components/fields/readonly-field"
import {ReferenceField, type ReferenceFieldProps} from "@ui/components/fields/reference-field"
import {RotationField, type RotationFieldProps} from "@ui/components/fields/rotation-field"
import {TextField, type TextFieldProps} from "@ui/components/fields/text-field"
import {VectorField, type VectorFieldProps} from "@ui/components/fields/vector-field"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function TextFieldStory(props: Readonly<{initial: TextFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <TextField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    placeholder={props.initial.placeholder}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function NumberFieldStory(props: Readonly<{initial: NumberFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <NumberField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    presentation={props.initial.presentation}
    min={props.initial.min}
    max={props.initial.max}
    softMin={props.initial.softMin}
    softMax={props.initial.softMax}
    step={props.initial.step}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function IntegerFieldStory(props: Readonly<{initial: IntegerFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <IntegerField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    min={props.initial.min}
    max={props.initial.max}
    softMin={props.initial.softMin}
    softMax={props.initial.softMax}
    step={props.initial.step}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function BooleanFieldStory(props: Readonly<{initial: BooleanFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <BooleanField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    presentation={props.initial.presentation}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function EnumFieldStory(props: Readonly<{initial: EnumFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <EnumField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    options={props.initial.options}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function ColorFieldStory(props: Readonly<{initial: ColorFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <ColorField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={(next: ColorFieldValue) => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function VectorFieldStory(props: Readonly<{initial: VectorFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <VectorField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    axes={props.initial.axes}
    numberKind={props.initial.numberKind}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function RotationFieldStory(props: Readonly<{initial: RotationFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <RotationField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    axes={props.initial.axes}
    numberKind={props.initial.numberKind}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function MatrixFieldStory(props: Readonly<{initial: MatrixFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <MatrixField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    step={props.initial.step}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
  />
}

function ReferenceFieldStory(props: Readonly<{initial: ReferenceFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <ReferenceField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    placeholder={props.initial.placeholder}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onActivate={props.initial.onActivate}
    onPick={props.initial.onPick}
    onClear={() => {
      setValue(null)
      props.initial.onClear?.()
    }}
  />
}

function CollectionFieldStory(props: Readonly<{initial: CollectionFieldProps}>) {
  const [selectedId, setSelectedId] = useState(props.initial.selectedId)
  return <CollectionField
    id={props.initial.id}
    label={props.initial.label}
    items={props.initial.items}
    selectedId={selectedId}
    visibleRows={props.initial.visibleRows}
    emptyLabel={props.initial.emptyLabel}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onSelect={next => {
      setSelectedId(next)
      props.initial.onSelect?.(next)
    }}
    onAdd={props.initial.onAdd}
    onRemove={props.initial.onRemove}
    onMove={props.initial.onMove}
  />
}

function PathFieldStory(props: Readonly<{initial: PathFieldProps}>) {
  const [value, setValue] = useState(props.initial.value)
  return <PathField
    id={props.initial.id}
    label={props.initial.label}
    value={value}
    placeholder={props.initial.placeholder}
    description={props.initial.description}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    onChange={next => {
      setValue(next)
      props.initial.onChange?.(next)
    }}
    onBrowse={props.initial.onBrowse}
  />
}

function ReadonlyFieldStory(props: Readonly<{initial: ReadonlyFieldProps}>) {
  return <ReadonlyField
    id={props.initial.id}
    label={props.initial.label}
    value={props.initial.value}
    description={props.initial.description}
    disabled={props.initial.disabled}
  />
}

export function createCompiledTextFieldProductionStory(
  document: Document,
  props: TextFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "text-field", TextFieldStory, props, source("TextField", "text-field", props, "value", "onChange"))
}

export function createCompiledNumberFieldProductionStory(
  document: Document,
  props: NumberFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "number-field", NumberFieldStory, props, source("NumberField", "number-field", props, "value", "onChange"))
}

export function createCompiledIntegerFieldProductionStory(
  document: Document,
  props: IntegerFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "integer-field", IntegerFieldStory, props, source("IntegerField", "integer-field", props, "value", "onChange"))
}

export function createCompiledBooleanFieldProductionStory(
  document: Document,
  props: BooleanFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "boolean-field", BooleanFieldStory, props, source("BooleanField", "boolean-field", props, "value", "onChange"))
}

export function createCompiledEnumFieldProductionStory(
  document: Document,
  props: EnumFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "enum-field", EnumFieldStory, props, source("EnumField", "enum-field", props, "value", "onChange"))
}

export function createCompiledColorFieldProductionStory(
  document: Document,
  props: ColorFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "color-field", ColorFieldStory, props, source("ColorField", "color-field", props, "value", "onChange"))
}

export function createCompiledVectorFieldProductionStory(
  document: Document,
  props: VectorFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "vector-field", VectorFieldStory, props, source("VectorField", "vector-field", props, "value", "onChange"))
}

export function createCompiledRotationFieldProductionStory(
  document: Document,
  props: RotationFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "rotation-field", RotationFieldStory, props, source("RotationField", "rotation-field", props, "value", "onChange"))
}

export function createCompiledMatrixFieldProductionStory(
  document: Document,
  props: MatrixFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "matrix-field", MatrixFieldStory, props, source("MatrixField", "matrix-field", props, "value", "onChange"))
}

export function createCompiledReferenceFieldProductionStory(
  document: Document,
  props: ReferenceFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "reference-field", ReferenceFieldStory, props, source("ReferenceField", "reference-field", props, "value", "onClear"))
}

export function createCompiledCollectionFieldProductionStory(
  document: Document,
  props: CollectionFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "collection-field", CollectionFieldStory, props, source("CollectionField", "collection-field", props, "selectedId", "onSelect"))
}

export function createCompiledPathFieldProductionStory(
  document: Document,
  props: PathFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "path-field", PathFieldStory, props, source("PathField", "path-field", props, "value", "onChange"))
}

export function createCompiledReadonlyFieldProductionStory(
  document: Document,
  props: ReadonlyFieldProps
): RoutedProductionComponentStory {
  return createFieldStory(document, "readonly-field", ReadonlyFieldStory, props, source("ReadonlyField", "readonly-field", props))
}

type StoryComponent<Props> = (props: Readonly<{initial: Props}>) => unknown

function createFieldStory<Props>(
  document: Document,
  component: string,
  Story: StoryComponent<Props>,
  initial: Props,
  typescript: string
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(Story as any, {initial})
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as HTMLElement | undefined
  if (!owner) {
    root.unmount()
    throw new Error(`Compiled ${component} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", component)
  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    get source() {
      return Object.freeze({html: serialize(owner), typescript})
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(
  component: string,
  subpath: string,
  props: Readonly<Record<string, unknown>>,
  stateKey?: string,
  callback?: string
): string {
  const initial = {...props}
  for (const [key, value] of Object.entries(initial)) {
    if (typeof value === "function" || key === "style") delete initial[key]
  }
  const propLines = Object.keys(initial)
    .filter(key => key !== stateKey)
    .map(key => `    ${key}={props.${key}}`)
  if (stateKey === undefined || callback === undefined) return [
    `import {${component}} from "@ui/components/fields/${subpath}"`,
    'import {createRoot} from "@zavx0z/react"',
    "",
    `const props = ${literal(initial)} as const`,
    "",
    "createRoot(container).render(",
    `  <${component}`,
    ...propLines,
    "  />",
    ")"
  ].join("\n")
  const state = initial[stateKey]
  delete initial[stateKey]
  const callbackValue = callback === "onClear"
    ? "() => setValue(null)"
    : "setValue"
  return [
    `import {${component}} from "@ui/components/fields/${subpath}"`,
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    `const props = ${literal(initial)} as const`,
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${literal(state)})`,
    `  return <${component}`,
    ...propLines,
    `    ${stateKey}={value}`,
    `    ${callback}={${callbackValue}}`,
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function literal(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
