/** Package-owned external Storybook story support. */
import {CheckboxField} from "@ui/components/fields/checkbox-field"
import {NumberField} from "@ui/components/fields/number-field"
import {TextField} from "@ui/components/fields/text-field"
import {Inspector} from "@ui/components/inspector"
import {Panel} from "@ui/components/panel"
import type {Document, HTMLElement} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import {PROPS_INSPECTOR_COPY} from "./props-inspector-copy.ts"

export type StoryProps = Readonly<Record<string, unknown>>

export type StoryPropsInspector = Readonly<{
  element: HTMLElement
  update(context: Readonly<{label: string; title: string}>, props: StoryProps): void
  dispose(): void
}>

/** Storybook-private descriptor for the bounded props projection. */
export type StoryPropsFieldDescriptor =
  | Readonly<{kind: "boolean"; id: string; label: string; value: boolean; readOnly: true}>
  | Readonly<{kind: "integer"; id: string; label: string; value: number; readOnly: true}>
  | Readonly<{kind: "number"; id: string; label: string; value: number; readOnly: true}>
  | Readonly<{kind: "text"; id: string; label: string; value: string; readOnly: true}>
  | Readonly<{kind: "readonly"; id: string; label: string; value: string}>

type PropsInspectorViewProps = Readonly<{
  context: Readonly<{label: string; title: string}>
  fields: readonly StoryPropsFieldDescriptor[]
}>

export type StoryPropsFieldsProps = Readonly<{
  fields: readonly StoryPropsFieldDescriptor[]
}>

const inspectorPanels = Object.freeze([{id: "props"}] as const)

export function StoryPropsFields(props: StoryPropsFieldsProps) {
  return <div>{props.fields.map(field =>
    <StoryPropsField key={field.id} field={field} />
  )}</div>
}

function StoryPropsField(props: Readonly<{field: StoryPropsFieldDescriptor}>) {
  const field = props.field
  return <div data-storybook-prop-field={field.id} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; min-width: 0; }
  `}>
    {field.kind === "boolean" ? <CheckboxField
      label={field.label}
      checked={field.value}
      readOnly={field.readOnly}
    /> : null}
    {field.kind === "integer" ? <NumberField
      label={field.label}
      value={field.value}
      readOnly={field.readOnly}
      step={1}
    /> : null}
    {field.kind === "number" ? <NumberField
      label={field.label}
      value={field.value}
      readOnly={field.readOnly}
    /> : null}
    {field.kind === "text" ? <TextField
      label={field.label}
      value={field.value}
      readOnly={field.readOnly}
    /> : null}
    {field.kind === "readonly" ? <TextField
      label={field.label}
      value={field.value}
      readOnly={true}
    /> : null}
  </div>
}

function PropsInspectorView(props: PropsInspectorViewProps) {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(true)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const fields = normalizedQuery.length === 0
    ? props.fields
    : props.fields.filter(field =>
      field.label.toLocaleLowerCase().includes(normalizedQuery) ||
      field.id.toLocaleLowerCase().includes(normalizedQuery)
    )
  return <Inspector
    ariaLabel={PROPS_INSPECTOR_COPY.ariaLabel}
    categoriesLabel={PROPS_INSPECTOR_COPY.categoriesLabel}
    categories={[{id: "props", label: "P", title: PROPS_INSPECTOR_COPY.categoryTitle, panelIds: ["props"]}]}
    selectedCategoryId="props"
    query={query}
    searchLabel={PROPS_INSPECTOR_COPY.searchLabel}
    searchPlaceholder={PROPS_INSPECTOR_COPY.searchLabel}
    context={props.context}
    onQueryChange={setQuery}
  >{inspectorPanels.map(panel => <Panel
      key={panel.id}
      label={PROPS_INSPECTOR_COPY.panelLabel}
      title={PROPS_INSPECTOR_COPY.panelTitle}
      expanded={expanded}
      onToggle={setExpanded}
    >
      <StoryPropsFields fields={fields} />
    </Panel>)}</Inspector>
}

export function createStoryPropsInspector(
  document: Document,
  context: Readonly<{label: string; title: string}>,
  props: StoryProps,
): StoryPropsInspector {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  const render = (nextContext: Readonly<{label: string; title: string}>, nextProps: StoryProps): void => {
    root.render(PropsInspectorView as any, {
      context: nextContext,
      fields: fieldsFromProps(nextProps),
    })
  }
  render(context, props)
  const element = staging.querySelector("aside") as HTMLElement | null
  if (!element) {
    root.unmount()
    throw new Error("Props Inspector mounted no aside")
  }
  staging.removeChild(element)
  element.setAttribute("data-ui-storybook-inspector", "props")
  return Object.freeze({
    element,
    update(nextContext, nextProps) {
      render(nextContext, nextProps)
    },
    dispose() {
      root.unmount()
    },
  })
}

export function fieldsFromProps(props: StoryProps): readonly StoryPropsFieldDescriptor[] {
  const entries = Object.entries(props)
  if (entries.length === 0) {
    return Object.freeze([Object.freeze({
      id: "prop-empty",
      label: "Props",
      kind: "readonly",
      value: PROPS_INSPECTOR_COPY.empty,
    })])
  }
  return Object.freeze(entries.map(([key, value]) => fieldFromProp(key, value)))
}

function fieldFromProp(key: string, value: unknown): StoryPropsFieldDescriptor {
  const base = Object.freeze({
    id: `prop-${key}`,
    label: key,
  })
  if (typeof value === "boolean") {
    return Object.freeze({...base, kind: "boolean", value, readOnly: true})
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value)
      ? Object.freeze({...base, kind: "integer", value, readOnly: true})
      : Object.freeze({...base, kind: "number", value, readOnly: true})
  }
  if (typeof value === "string") {
    return Object.freeze({...base, kind: "text", value, readOnly: true})
  }
  return Object.freeze({...base, kind: "readonly", value: displayValue(value)})
}

function displayValue(value: unknown): string {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  if (typeof value === "function") return `ƒ ${value.name || "anonymous"}`
  if (typeof value === "symbol") return String(value)
  if (typeof value === "bigint") return `${value}n`
  try {
    const serialized = JSON.stringify(value, (_key, entry) => {
      if (typeof entry === "function") return `ƒ ${entry.name || "anonymous"}`
      if (typeof entry === "bigint") return `${entry}n`
      return entry
    })
    if (serialized === undefined) return String(value)
    return serialized.length <= 160 ? serialized : `${serialized.slice(0, 157)}…`
  } catch {
    return Object.prototype.toString.call(value)
  }
}
