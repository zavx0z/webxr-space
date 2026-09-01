/** Package-owned external Storybook story support. */
import {Inspector, type InspectorCategory} from "@ui/components/inspector"
import {uiIcons} from "@ui/components/icons"
import {Panel} from "@ui/components/panel"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"
import {PROPS_INSPECTOR_COPY} from "./props-inspector-copy.ts"
import {StoryPropsFields, type StoryPropsFieldDescriptor} from "./props-inspector.tsx"

const categories: readonly InspectorCategory[] = Object.freeze([
  Object.freeze({id: "props", label: "P", iconSrc: uiIcons.settings, title: "Props", panelIds: Object.freeze(["props"])})
])
const inspectorPanels = Object.freeze([{id: "props"}] as const)
const inspectorStoryProps = Object.freeze({
  ariaLabel: "Инспектор свойств",
  selectedCategoryId: "props",
  query: "",
  context: Object.freeze({label: "Button", title: "Кнопка Output"})
})
const propFields: readonly StoryPropsFieldDescriptor[] = Object.freeze([
  Object.freeze({id: "label", label: "label", kind: "text", value: "Output", readOnly: true}),
  Object.freeze({id: "variant", label: "variant", kind: "enum", value: "contained", readOnly: true, options: Object.freeze([
    Object.freeze({value: "contained", label: "Contained"}),
    Object.freeze({value: "outlined", label: "Outlined"}),
    Object.freeze({value: "text", label: "Text"})
  ])}),
  Object.freeze({id: "disabled", label: "disabled", kind: "boolean", value: false, readOnly: true})
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
  >{inspectorPanels.map(panel => <Panel
    key={panel.id}
    label={PROPS_INSPECTOR_COPY.panelLabel}
    title={PROPS_INSPECTOR_COPY.panelTitle}
    expanded={expanded}
    actions={[{id: "copy", label: "Копировать панель", iconSrc: uiIcons.copy}]}
    onToggle={setExpanded}
  ><StoryPropsFields fields={fields} /></Panel>)}</Inspector>
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
    'import {Inspector} from "@ui/components/inspector"',
    'import {Panel} from "@ui/components/panel"',
    'import {uiIcons} from "@ui/components/icons"',
    'import {CheckboxField} from "@ui/components/fields/checkbox-field"',
    'import {SelectField} from "@ui/components/fields/select-field"',
    'import {TextField} from "@ui/components/fields/text-field"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    'const categories = [{id: "props", label: "P", iconSrc: uiIcons.settings, title: "Props", panelIds: ["props"]}] as const',
    "",
    "function Story() {",
    '  const [query, setQuery] = useState("")',
    "  const [expanded, setExpanded] = useState(true)",
    '  return <Inspector categories={categories} selectedCategoryId="props" query={query} context={{label: "Button", iconSrc: uiIcons.resource}} onQueryChange={setQuery}>',
    '    <Panel label="Свойства" expanded={expanded} onToggle={setExpanded}>',
    "      <div>",
    '        <TextField label="label" value="Output" readOnly />',
    '        <SelectField label="variant" value="contained" options={[{key: "contained", value: "contained", label: "Contained"}]} readOnly />',
    '        <CheckboxField label="disabled" checked={false} readOnly />',
    "      </div>",
    "    </Panel>",
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
