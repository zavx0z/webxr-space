import {useState} from "@zavx0z/react"
import {TextField} from "./fields/text-field.tsx"
import {uiIcons} from "./icons.ts"
import {
  Inspector,
  isInspectorPanelVisible,
  type InspectorCategory
} from "./inspector.tsx"
import {Panel} from "./panel.tsx"

export type InspectorFixturePanel = Readonly<{
  id: string
  label: string
  content: string
  expanded: boolean
}>

export type InspectorFixtureProps = Readonly<{
  categories: readonly InspectorCategory[]
  selectedCategoryId: string
  query: string
  panels: readonly InspectorFixturePanel[]
}>

function InspectorFixturePanelContent(props: Readonly<{content: string}>) {
  return <span>{props.content}</span>
}

export function InspectorFixture(props: InspectorFixtureProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(props.selectedCategoryId)
  const [query, setQuery] = useState(props.query)
  const [panels, setPanels] = useState(props.panels)
  const onToggle = (id: string, expanded: boolean) => setPanels(current => current.map(panel =>
    panel.id === id ? {...panel, expanded} : panel
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
  >{panels.map(panel => <Panel
    key={panel.id}
    label={panel.label}
    title={panel.id}
    expanded={panel.expanded}
    hidden={!isInspectorPanelVisible(props.categories, selectedCategoryId, query, panel)}
    actions={[{id: "copy", label: "Copy panel", iconSrc: uiIcons.copy}]}
    onToggle={expanded => onToggle(panel.id, expanded)}
  ><InspectorFixturePanelContent content={panel.content} /></Panel>)}</Inspector>
}

export function InspectorFieldFixture() {
  const panels = [{id: "value", label: "Value"}] as const
  return <Inspector
    categories={[{id: "node", label: "N", panelIds: ["value"]}]}
    selectedCategoryId="node"
    query=""
  >{panels.map(panel => <Panel key={panel.id} label={panel.label} title={panel.id} expanded={true}>
    <TextField label="Output" value="Ready" />
  </Panel>)}</Inspector>
}
