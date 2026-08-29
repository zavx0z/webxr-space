/** Package-owned external Storybook story support. */
import {
  Field,
  type FieldDefinition,
} from "@ui/components/field"
import {
  Inspector,
  InspectorSection,
  InspectorSections,
} from "@ui/components/inspector"
import type {Document, HTMLElement} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import {PROPS_INSPECTOR_COPY} from "./props-inspector-copy.ts"

export type StoryProps = Readonly<Record<string, unknown>>

export type StoryPropsInspector = Readonly<{
  element: HTMLElement
  update(context: Readonly<{label: string; title: string}>, props: StoryProps): void
  dispose(): void
}>

type PropsInspectorViewProps = Readonly<{
  context: Readonly<{label: string; title: string}>
  fields: readonly FieldDefinition[]
}>

export type StoryPropsFieldsProps = Readonly<{
  fields: readonly FieldDefinition[]
}>

const inspectorSections = Object.freeze([{id: "props"}] as const)

export function StoryPropsFields(props: StoryPropsFieldsProps) {
  return <div>{props.fields.map(field => <Field key={field.id} definition={field} />)}</div>
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
    categories={[{id: "props", label: "P", title: PROPS_INSPECTOR_COPY.categoryTitle, sectionIds: ["props"]}]}
    selectedCategoryId="props"
    query={query}
    searchLabel={PROPS_INSPECTOR_COPY.searchLabel}
    searchPlaceholder={PROPS_INSPECTOR_COPY.searchLabel}
    context={props.context}
    onQueryChange={setQuery}
  >
    <InspectorSections>{inspectorSections.map(section => <InspectorSection
      key={section.id}
      id={section.id}
      label={PROPS_INSPECTOR_COPY.sectionLabel}
      title={PROPS_INSPECTOR_COPY.sectionTitle}
      expanded={expanded}
      onToggle={(_id, next) => setExpanded(next)}
    >
      <StoryPropsFields fields={fields} />
    </InspectorSection>)}</InspectorSections>
  </Inspector>
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

export function fieldsFromProps(props: StoryProps): readonly FieldDefinition[] {
  const entries = Object.entries(props)
  if (entries.length === 0) {
    return Object.freeze([Object.freeze({
      id: "prop-empty",
      label: "Props",
      kind: "readonly",
      value: PROPS_INSPECTOR_COPY.empty,
      readOnly: true,
    })])
  }
  return Object.freeze(entries.map(([key, value]) => fieldFromProp(key, value)))
}

function fieldFromProp(key: string, value: unknown): FieldDefinition {
  const base = Object.freeze({
    id: `prop-${key}`,
    label: key,
    readOnly: true,
  })
  if (typeof value === "boolean") {
    return Object.freeze({...base, kind: "boolean", value, presentation: "checkbox"})
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Object.freeze({...base, kind: Number.isInteger(value) ? "integer" : "number", value})
  }
  if (typeof value === "string") {
    return Object.freeze({...base, kind: "text", value})
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
