/** Package-owned external Storybook story support. */
import {
  Inspector,
  InspectorSection,
  InspectorSections,
  type InspectorCategory
} from "@ui/components/inspector"
import {type FieldDefinition} from "@ui/components/field"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"
import {PROPS_INSPECTOR_COPY} from "./props-inspector-copy.ts"
import {StoryPropsFields} from "./props-inspector.tsx"

const categories: readonly InspectorCategory[] = Object.freeze([
  Object.freeze({id: "props", label: "P", title: "Props", sectionIds: Object.freeze(["props"])})
])

const inspectorSections = Object.freeze([{id: "props"}] as const)

const inspectorStoryProps = Object.freeze({
  ariaLabel: "Инспектор свойств",
  selectedCategoryId: "props",
  query: "",
  context: Object.freeze({label: "Button", title: "Кнопка Output"}),
})

const propFields: readonly FieldDefinition[] = Object.freeze([
  Object.freeze({id: "label", label: "label", kind: "text", value: "Output", readOnly: true}),
  Object.freeze({id: "variant", label: "variant", kind: "enum", value: "contained", readOnly: true, options: Object.freeze([
    Object.freeze({value: "contained", label: "Contained"}),
    Object.freeze({value: "outlined", label: "Outlined"}),
    Object.freeze({value: "text", label: "Text"}),
  ])}),
  Object.freeze({id: "disabled", label: "disabled", kind: "boolean", value: false, readOnly: true}),
])

function InspectorStoryComponent() {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(true)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const fields = normalizedQuery.length === 0
    ? propFields
    : propFields.filter(field => field.label.toLocaleLowerCase().includes(normalizedQuery))
  return <Inspector
    ariaLabel="Inspector story"
    categoriesLabel="Story categories"
    categories={categories}
    selectedCategoryId="props"
    query={query}
    searchLabel={PROPS_INSPECTOR_COPY.searchLabel}
    searchPlaceholder={PROPS_INSPECTOR_COPY.searchLabel}
    context={{label: "Button", title: "Inspected element"}}
    onQueryChange={setQuery}
  >
    <InspectorSections>{inspectorSections.map(section => <InspectorSection
      key={section.id}
      id={section.id}
      label={PROPS_INSPECTOR_COPY.sectionLabel}
      title={PROPS_INSPECTOR_COPY.sectionTitle}
      expanded={expanded}
      onToggle={(_id, next) => setExpanded(next)}
    ><StoryPropsFields fields={fields} /></InspectorSection>)}</InspectorSections>
  </Inspector>
}

export function createCompiledInspectorProductionStory(document: Document): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(InspectorStoryComponent as any, {})
  const owner = staging.querySelector("aside") as HTMLElement | null
  if (!owner) {
    root.unmount()
    throw new Error("Compiled Inspector story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "inspector")
  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    props: inspectorStoryProps,
    get source() {
      return Object.freeze({html: serialize(owner), typescript: source()})
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(): string {
  return [
    'import {Inspector, InspectorSection, InspectorSections} from "@ui/components/inspector"',
    'import {Field} from "@ui/components/field"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    `const categories = ${JSON.stringify(categories, null, 2)} as const`,
    `const fields = ${JSON.stringify(propFields, null, 2)} as const`,
    "",
    "function Story() {",
    '  const [query, setQuery] = useState("")',
    "  const [expanded, setExpanded] = useState(true)",
    '  return <Inspector categories={categories} selectedCategoryId="props" query={query} onQueryChange={setQuery}>',
    "    <InspectorSections><InspectorSection id=\"props\" label=\"Свойства\" expanded={expanded}",
    "      onToggle={(_id, next) => setExpanded(next)}>",
    "      <div>{fields.map(field => <Field key={field.id} definition={field} />)}</div>",
    "    </InspectorSection></InspectorSections>",
    "  </Inspector>",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
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
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
