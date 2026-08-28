import {useState} from "@zavx0z/react"
import {Pane} from "./pane.tsx"
import {
  HudFrame,
  HudWindow,
  type HudFrameProps,
  type HudWindowProps
} from "./hud.tsx"

export function HudWindowFixture(props: Omit<HudWindowProps, "children">) {
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

export function HudFrameFixture(props: Omit<HudFrameProps, "children">) {
  return <HudFrame
    title={props.title}
    edge={props.edge}
    handles={props.handles}
    style={props.style}
    onHandle={props.onHandle}
  ><Pane content="Frame body" variant="transparent" /></HudFrame>
}
