import {useState} from "@zavx0z/react"
import {TextField} from "./fields/text-field.tsx"
import {uiIcons} from "./icons.ts"
import {
  Inspector,
  InspectorSection,
  InspectorSections,
  InspectorTextSection,
  isInspectorSectionVisible,
  type InspectorCategory
} from "./inspector.tsx"

export type InspectorFixtureSection = Readonly<{
  id: string
  label: string
  content: string
  expanded: boolean
}>

export type InspectorFixtureProps = Readonly<{
  categories: readonly InspectorCategory[]
  selectedCategoryId: string
  query: string
  sections: readonly InspectorFixtureSection[]
}>

export function InspectorFixture(props: InspectorFixtureProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(props.selectedCategoryId)
  const [query, setQuery] = useState(props.query)
  const [sections, setSections] = useState(props.sections)
  const onToggle = (id: string, expanded: boolean) => setSections(current => current.map(section =>
    section.id === id ? {...section, expanded} : section
  ))
  return <Inspector
    categories={props.categories}
    selectedCategoryId={selectedCategoryId}
    query={query}
    toolbarLeadingActions={[{id: "manual", label: "Manual", iconSrc: uiIcons.manual}]}
    toolbarActions={[{id: "copy", label: "Copy", iconSrc: uiIcons.copy}]}
    context={{label: "Scene", iconSrc: uiIcons.resource}}
    onCategoryChange={setSelectedCategoryId}
    onQueryChange={setQuery}
  >
    <InspectorSections>
      {sections.map(section => <InspectorTextSection
        key={section.id}
        id={section.id}
        label={section.label}
        content={section.content}
        expanded={section.expanded}
        hidden={!isInspectorSectionVisible(props.categories, selectedCategoryId, query, section)}
        actions={[{id: "copy", label: "Copy section", iconSrc: uiIcons.copy}]}
        onToggle={onToggle}
      />)}
    </InspectorSections>
  </Inspector>
}

export function InspectorFieldFixture() {
  const sections = [{id: "value", label: "Value"}] as const
  return <Inspector
    categories={[{id: "node", label: "N", sectionIds: ["value"]}]}
    selectedCategoryId="node"
    query=""
  >
    <InspectorSections>
      {sections.map(section => <InspectorSection key={section.id} id={section.id} label={section.label} expanded={true}>
        <TextField id="output" label="Output" value="Ready" />
      </InspectorSection>)}
    </InspectorSections>
  </Inspector>
}
