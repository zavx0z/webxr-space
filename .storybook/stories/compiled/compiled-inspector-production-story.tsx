/** Package-owned external Storybook story support. */
import {
  Inspector,
  InspectorSection,
  InspectorSections,
  InspectorTextSection,
  type InspectorCategory
} from "@ui/components/inspector"
import {uiIcons} from "@ui/components/icons"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"
import {PROPS_INSPECTOR_COPY} from "./props-inspector-copy.ts"
import {
  StoryPropsFields,
  type StoryPropsFieldDescriptor,
} from "./props-inspector.tsx"

const categories: readonly InspectorCategory[] = Object.freeze([
  Object.freeze({id: "props", label: "P", iconSrc: uiIcons.settings, title: "Props", sectionIds: Object.freeze(["props"])})
])

const inspectorSections = Object.freeze([{id: "props"}] as const)
const inspectorParts = Object.freeze([
  Object.freeze({id: "props", label: "Свойства", content: "label · variant · disabled"}),
  Object.freeze({id: "events", label: "События", content: "click · focus · input"})
])

const inspectorStoryProps = Object.freeze({
  ariaLabel: "Инспектор свойств",
  selectedCategoryId: "props",
  query: "",
  context: Object.freeze({label: "Button", title: "Кнопка Output"}),
})

const propFields: readonly StoryPropsFieldDescriptor[] = Object.freeze([
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
    toolbarLeadingActions={[{id: "manual", label: "Справка", iconSrc: uiIcons.manual}]}
    toolbarActions={[{id: "copy", label: "Копировать", iconSrc: uiIcons.copy}]}
    context={{label: "Button", iconSrc: uiIcons.resource, title: "Inspected element"}}
    onQueryChange={setQuery}
  >
    <InspectorSections>{inspectorSections.map(section => <InspectorSection
      key={section.id}
      id={section.id}
      label={PROPS_INSPECTOR_COPY.sectionLabel}
      title={PROPS_INSPECTOR_COPY.sectionTitle}
      expanded={expanded}
      actions={[{id: "copy", label: "Копировать секцию", iconSrc: uiIcons.copy}]}
      onToggle={(_id, next) => setExpanded(next)}
    ><StoryPropsFields fields={fields} /></InspectorSection>)}</InspectorSections>
  </Inspector>
}

function InspectorSectionsStoryComponent() {
  return <InspectorSections>{inspectorParts.map(section => <InspectorTextSection
    key={section.id}
    id={section.id}
    label={section.label}
    expanded={true}
    content={section.content}
  />)}</InspectorSections>
}

function InspectorSectionContent() {
  return <span>Содержимое секции</span>
}

function InspectorSectionStoryComponent() {
  return <InspectorSection
    id="properties"
    label="Свойства"
    expanded={true}
  ><InspectorSectionContent /></InspectorSection>
}

function InspectorTextSectionStoryComponent() {
  return <InspectorTextSection
    id="source"
    label="Исходный код"
    expanded={true}
    content="const value = 42"
  />
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

export function createCompiledInspectorSectionsProductionStory(
  document: Document
): RoutedProductionComponentStory {
  return mountInspectorPart(
    document,
    InspectorSectionsStoryComponent,
    "inspector-sections",
    [
      'import {InspectorSections, InspectorTextSection} from "@ui/components/inspector"',
      "",
      "createRoot(container).render(",
      "  <InspectorSections>",
      "    <InspectorTextSection id=\"props\" label=\"Свойства\" expanded content=\"label · variant · disabled\" />",
      "    <InspectorTextSection id=\"events\" label=\"События\" expanded content=\"click · focus · input\" />",
      "  </InspectorSections>",
      ")"
    ].join("\n"),
    Object.freeze({sections: 2})
  )
}

export function createCompiledInspectorSectionProductionStory(
  document: Document
): RoutedProductionComponentStory {
  return mountInspectorPart(
    document,
    InspectorSectionStoryComponent,
    "inspector-section",
    [
      'import {InspectorSection} from "@ui/components/inspector"',
      "",
      "createRoot(container).render(",
      "  <InspectorSection id=\"properties\" label=\"Свойства\" expanded>",
      "    <span>Содержимое секции</span>",
      "  </InspectorSection>",
      ")"
    ].join("\n"),
    Object.freeze({id: "properties", label: "Свойства", expanded: true})
  )
}

export function createCompiledInspectorTextSectionProductionStory(
  document: Document
): RoutedProductionComponentStory {
  return mountInspectorPart(
    document,
    InspectorTextSectionStoryComponent,
    "inspector-text-section",
    [
      'import {InspectorTextSection} from "@ui/components/inspector"',
      "",
      "createRoot(container).render(",
      "  <InspectorTextSection id=\"source\" label=\"Исходный код\" expanded content=\"const value = 42\" />",
      ")"
    ].join("\n"),
    Object.freeze({id: "source", label: "Исходный код", expanded: true})
  )
}

function mountInspectorPart(
  document: Document,
  component: unknown,
  name: string,
  typescript: string,
  props: Readonly<Record<string, unknown>>
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(component as any, {})
  const owner = staging.firstElementChild as HTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      props,
      get source() {
        return Object.freeze({html: serialize(owner), typescript})
      },
      dispose() {
        root.unmount()
      }
    })
  })
}

function source(): string {
  return [
    'import {Inspector, InspectorSection, InspectorSections} from "@ui/components/inspector"',
    'import {uiIcons} from "@ui/components/icons"',
    'import {BooleanField} from "@ui/components/fields/boolean-field"',
    'import {EnumField} from "@ui/components/fields/enum-field"',
    'import {TextField} from "@ui/components/fields/text-field"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    'const categories = [{id: "props", label: "P", iconSrc: uiIcons.settings, title: "Props", sectionIds: ["props"]}] as const',
    "",
    "function Story() {",
    '  const [query, setQuery] = useState("")',
    "  const [expanded, setExpanded] = useState(true)",
    '  return <Inspector categories={categories} selectedCategoryId="props" query={query} context={{label: "Button", iconSrc: uiIcons.resource}} onQueryChange={setQuery}>',
    "    <InspectorSections><InspectorSection id=\"props\" label=\"Свойства\" expanded={expanded}",
    "      onToggle={(_id, next) => setExpanded(next)}>",
    '      <div>',
    '        <TextField id="label" label="label" value="Output" readOnly />',
    '        <EnumField id="variant" label="variant" value="contained" options={[{value: "contained", label: "Contained"}]} readOnly />',
    '        <BooleanField id="disabled" label="disabled" value={false} readOnly />',
    '      </div>',
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
