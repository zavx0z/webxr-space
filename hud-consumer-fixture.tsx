import {useState} from "@zavx0z/react"
import {Pane} from "./pane-component.tsx"
import {
  HudFrame,
  HudWindow,
  type HudFrameComponentProps,
  type HudWindowComponentProps
} from "./hud-component.tsx"

export function HudWindowFixture(props: Omit<HudWindowComponentProps, "children">) {
  const [minimized, setMinimized] = useState(props.minimized)
  return <HudWindow
    title={props.title}
    subtitle={props.subtitle}
    active={props.active}
    minimized={minimized}
    actions={props.actions}
    style={props.style}
    onMinimizedChange={setMinimized}
    onAction={props.onAction}
  ><Pane content="Window body" variant="transparent" /></HudWindow>
}

export function HudFrameFixture(props: Omit<HudFrameComponentProps, "children">) {
  return <HudFrame
    title={props.title}
    edge={props.edge}
    handles={props.handles}
    style={props.style}
    onHandle={props.onHandle}
  ><Pane content="Frame body" variant="transparent" /></HudFrame>
}
