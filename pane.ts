import {
  div,
  type DivProps,
} from "@ui/elements/div"
import {uiShapeMetrics} from "@ui/elements/shape"
import {type StyleProps, type StyleStateTable} from "@ui/elements/style"
import {h2} from "@ui/elements/text"
import {rgba8ToColor, resolveWidgetColors, uiTheme} from "@ui/elements/theme-reference"
import {Z, type UiSurface} from "@layout/core/surface"

export type PaneVariant = "glass" | "outlined" | "filled"
export type PaneAppearance = "panel" | "box"
export type PaneProps = {
  children?: DivProps["children"]
  key?: string
  variant?: PaneVariant
  elevation?: 0 | 1 | 2 | 3
  appearance?: PaneAppearance
  active?: boolean
  scrollContentWidth?: number
  scrollContentHeight?: number
  style?: StyleProps
  stateStyles?: StyleStateTable<"idle" | "active">
}

export function Pane(host: UiSurface, x: number, y: number, width: number, height: number, props: PaneProps = {}): void {
  const borderRadius = paneRadius(props.appearance)
  const appearance = paneAppearanceStyle(props, borderRadius)
  const defaults: StyleProps = {
    background: props.variant === "filled" ? "bgElevated" : "glass",
    borderColor: props.variant === "outlined" ? "borderBright" : "borderDim",
    borderRadius,
    padding: 20,
    zIndex: Z.CONTAINER,
    ...appearance,
  }
  const state = props.active === true ? "active" : "idle"
  const style: StyleProps = {...defaults, ...props.style, ...props.stateStyles?.[state]}
  const callerStyle: StyleProps = {...props.style, ...props.stateStyles?.[state]}
  const divProps: DivProps = {
    children: props.children,
    style,
  }
  if (props.key !== undefined) divProps.key = props.key
  if (props.scrollContentWidth !== undefined) divProps.scrollContentWidth = props.scrollContentWidth
  if (props.scrollContentHeight !== undefined) divProps.scrollContentHeight = props.scrollContentHeight
  div(host, x, y, width, height, {
    ...divProps,
  })
  if (props.appearance === "panel" && callerStyle.borderColor === undefined) {
    div(host, x, y, width, height, {
      style: {
        background: null,
        borderColor: rgba8ToColor(
          props.active === true ? uiTheme.material.editorOutlineActive : uiTheme.material.editorOutline,
        ),
        borderRadius: style.borderRadius ?? borderRadius,
        borderWidth: uiShapeMetrics.borderWidth,
        zIndex: (style.zIndex ?? Z.CONTAINER) + 0.01,
      },
    })
  }
}

function paneAppearanceStyle(props: PaneProps, borderRadius: number): StyleProps {
  if (props.appearance === "panel") {
    return {
      background: rgba8ToColor(uiTheme.spaceNode.panel.back),
      borderColor: rgba8ToColor(uiTheme.material.editorBorder),
      borderRadius,
      borderWidth: uiShapeMetrics.borderWidth,
    }
  }
  if (props.appearance === "box") {
    const colors = resolveWidgetColors("box")
    return {
      background: rgba8ToColor(colors.inner),
      borderColor: rgba8ToColor(colors.outline),
      borderRadius,
      borderWidth: uiShapeMetrics.borderWidth,
    }
  }
  return {}
}

function paneRadius(appearance: PaneAppearance | undefined): number {
  return appearance === "panel" ? 6 : 4
}

export function Paper(host: UiSurface, x: number, y: number, width: number, height: number, props: PaneProps = {}): void {
  Pane(host, x, y, width, height, props)
}

export function PaneTitle(host: UiSurface, x: number, y: number, width: number, height: number, label: string): void {
  h2(host, x, y, width, height, {
    children: label,
    style: {color: rgba8ToColor(resolveWidgetColors("box").text), fontSize: 14},
  })
}
