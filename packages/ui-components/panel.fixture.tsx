import {useState} from "@zavx0z/react"
import {settingsIcon} from "./icon-assets.ts"
import {Panel} from "./panel.tsx"

function PanelFixtureContent() {
  return <span>Panel content</span>
}

export function PanelFixture() {
  const [expanded, setExpanded] = useState(true)
  return <Panel
    label="Properties"
    expanded={expanded}
    actions={[{id: "settings", label: "Settings", iconSrc: settingsIcon}]}
    onToggle={setExpanded}
  ><PanelFixtureContent /></Panel>
}

export function HiddenPanelFixture() {
  return <Panel label="Hidden" expanded={true} hidden={true}>
    <PanelFixtureContent />
  </Panel>
}
