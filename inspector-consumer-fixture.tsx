import {useState} from "@zavx0z/react"
import {Field} from "./field-component.tsx"
import {
  Inspector,
  InspectorSection,
  InspectorSections,
  InspectorTextSection,
  isInspectorSectionVisible,
  type InspectorCategory
} from "./inspector-component.tsx"

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
    context={{label: "Scene"}}
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
        <Field definition={{id: "output", label: "Output", kind: "text", value: "Ready"}} />
      </InspectorSection>)}
    </InspectorSections>
  </Inspector>
}
