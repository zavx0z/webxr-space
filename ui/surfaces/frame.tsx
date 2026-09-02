import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {
  assertSurfaceActions,
  SurfaceBody,
  SurfaceButton,
  SurfaceHeader,
  SurfaceNavigation,
  SurfaceOwner,
  SurfaceTitle,
} from "../src/shared/surface-chrome.tsx"

export type FrameEdge = "floating" | "left" | "right" | "top" | "bottom"

export type FrameHandle = Readonly<{
  key: string
  label: string
  iconSrc?: string | undefined
  disabled: boolean
}>

export type FrameProps = Readonly<{
  title: string
  edge: FrameEdge
  handles: readonly FrameHandle[]
  children: JsxSourceElement | null
  style?: CssStyle | undefined
  onHandle?: ((key: string, event: Event) => void) | undefined
}>

export type FrameDefaultProps = Pick<FrameProps, "title" | "edge" | "handles">

export const frameDefaultProps: FrameDefaultProps = Object.freeze({
  title: "Frame",
  edge: "right",
  handles: Object.freeze([
    Object.freeze({key: "move", label: "Move", disabled: false}),
    Object.freeze({key: "resize", label: "Resize", disabled: false}),
    Object.freeze({key: "dock", label: "Dock", disabled: false}),
  ]),
})

type FrameHandleButtonProps = Readonly<{
  handle: FrameHandle
  onHandle?: FrameProps["onHandle"]
}>

function FrameHandleButton(props: FrameHandleButtonProps) {
  const onClick = (event: Event) => props.onHandle?.(props.handle.key, event)
  return <SurfaceButton
    label={props.handle.label}
    iconSrc={props.handle.iconSrc}
    iconOnly={props.handle.iconSrc !== undefined}
    iconAction={props.handle.iconSrc !== undefined}
    title={props.handle.label}
    ariaLabel={props.handle.label}
    disabled={props.handle.disabled}
    onClick={onClick}
  />
}

function FrameEdgeIndicator(props: Readonly<{edge: FrameEdge}>) {
  return <span
    aria-hidden="true"
    data-edge={props.edge}
    style={css`
      position: absolute;
      display: block;
      background: var(--widget-toolbar-background-selected);

      &[data-edge="floating"] {
        display: none;
      }

      &[data-edge="left"] {
        left: 0;
        top: 0;
        width: 1px;
        height: 100%;
      }

      &[data-edge="right"] {
        right: 0;
        top: 0;
        width: 1px;
        height: 100%;
      }

      &[data-edge="top"] {
        left: 0;
        top: 0;
        width: 100%;
        height: 1px;
      }

      &[data-edge="bottom"] {
        left: 0;
        bottom: 0;
        width: 100%;
        height: 1px;
      }
    `}
  >
  </span>
}

export function Frame(props: FrameProps) {
  if (typeof props.title !== "string") throw new TypeError("Frame title must be a string")
  assertEdge(props.edge)
  assertSurfaceActions(props.handles, "Frame handle")
  return <SurfaceOwner
    label={props.title}
    style={css`
      width: 300px;
      min-height: 140px;

      ${props.style}
    `}
  >
    <FrameEdgeIndicator key="edge" edge={props.edge} />
    <SurfaceHeader key="header">
      <SurfaceTitle key="title" text={props.title} />
      <SurfaceNavigation key="navigation" label="Frame handles">
        {props.handles.map(handle => <FrameHandleButton
          key={handle.key}
          handle={handle}
          onHandle={props.onHandle}
        />)}
      </SurfaceNavigation>
    </SurfaceHeader>
    <SurfaceBody key="body">{props.children}</SurfaceBody>
  </SurfaceOwner>
}

function assertEdge(edge: FrameEdge): void {
  if (edge !== "floating" && edge !== "left" && edge !== "right" && edge !== "top" && edge !== "bottom") {
    throw new Error(`Unknown Frame edge: ${String(edge)}`)
  }
}
