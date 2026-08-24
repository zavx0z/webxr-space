import {
  div,
  type DivProps,
} from "@ui/elements/div"
import {uiShapeMetrics} from "@ui/elements/shape"
import {type StyleProps} from "@ui/elements/style"
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
  sx?: StyleProps
}

export function Pane(host: UiSurface, x: number, y: number, width: number, height: number, props: PaneProps = {}): void {
  const appearance = paneAppearanceStyle(props)
  const divProps: DivProps = {
    children: props.children,
    style: {
      background: props.variant === "filled" ? "bgElevated" : "glass",
      borderColor: props.variant === "outlined" ? "borderBright" : "borderDim",
      borderRadius: 30,
      padding: 20,
      zIndex: Z.CONTAINER,
      ...appearance,
      ...props.sx,
    },
  }
  if (props.key !== undefined) divProps.key = props.key
  if (props.scrollContentWidth !== undefined) divProps.scrollContentWidth = props.scrollContentWidth
  if (props.scrollContentHeight !== undefined) divProps.scrollContentHeight = props.scrollContentHeight
  div(host, x, y, width, height, {
    ...divProps,
  })
  if (props.appearance === "panel" && props.sx?.borderColor === undefined) {
    div(host, x, y, width, height, {
      style: {
        background: null,
        borderColor: rgba8ToColor(
          props.active === true ? uiTheme.material.editorOutlineActive : uiTheme.material.editorOutline,
        ),
        borderRadius: uiShapeMetrics.lowRadius,
        borderWidth: uiShapeMetrics.borderWidth,
        zIndex: (props.sx?.zIndex ?? Z.CONTAINER) + 0.01,
      },
    })
  }
}

function paneAppearanceStyle(props: PaneProps): StyleProps {
  if (props.appearance === "panel") {
    return {
      background: rgba8ToColor(uiTheme.spaceNode.panel.back),
      borderColor: rgba8ToColor(uiTheme.material.editorBorder),
      borderRadius: uiShapeMetrics.lowRadius,
      borderWidth: uiShapeMetrics.borderWidth,
    }
  }
  if (props.appearance === "box") {
    const colors = resolveWidgetColors("box")
    return {
      background: rgba8ToColor(colors.inner),
      borderColor: rgba8ToColor(colors.outline),
      borderRadius: uiShapeMetrics.lowRadius,
      borderWidth: uiShapeMetrics.borderWidth,
    }
  }
  return {}
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
