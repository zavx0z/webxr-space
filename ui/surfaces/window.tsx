import {useId} from "@zavx0z/component"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {closeIcon, minusIcon, pinIcon, plusIcon} from "../src/shared/icon-assets.ts"
import {
  assertSurfaceActions,
  SurfaceBody,
  SurfaceButton,
  SurfaceHeader,
  SurfaceNavigation,
  SurfaceOwner,
  SurfaceTitle,
} from "../src/shared/surface-chrome.tsx"

export type WindowAction = Readonly<{
  key: string
  label: string
  iconSrc?: string | undefined
  disabled: boolean
}>

export type WindowProps = Readonly<{
  title: string
  subtitle: string
  active: boolean
  minimized: boolean
  actions: readonly WindowAction[]
  children: JsxSourceElement | null
  style?: CssStyle | undefined
  onMinimizedChange?: ((minimized: boolean, event: Event) => void) | undefined
  onAction?: ((key: string, event: Event) => void) | undefined
}>

export type WindowDefaultProps = Pick<
  WindowProps,
  "title" | "subtitle" | "active" | "minimized" | "actions"
>

export const windowDefaultProps: WindowDefaultProps = Object.freeze({
  title: "Output",
  subtitle: "HUD window",
  active: true,
  minimized: false,
  actions: Object.freeze([
    Object.freeze({key: "pin", label: "Pin", iconSrc: pinIcon, disabled: false}),
    Object.freeze({key: "close", label: "Close", iconSrc: closeIcon, disabled: false}),
  ]),
})

type WindowActionButtonProps = Readonly<{
  action: WindowAction
  onAction?: WindowProps["onAction"]
}>

function WindowActionButton(props: WindowActionButtonProps) {
  const onClick = (event: Event) => props.onAction?.(props.action.key, event)
  return <SurfaceButton
    label={props.action.label}
    iconSrc={props.action.iconSrc}
    iconOnly={props.action.iconSrc !== undefined}
    iconAction={props.action.iconSrc !== undefined}
    title={props.action.label}
    ariaLabel={props.action.label}
    disabled={props.action.disabled}
    onClick={onClick}
  />
}

export function Window(props: WindowProps) {
  assertWindow(props)
  assertSurfaceActions(props.actions, "Window action")
  const bodyId = useId()
  const onMinimize = (event: Event) => props.onMinimizedChange?.(!props.minimized, event)
  return <SurfaceOwner
    label={props.title}
    active={props.active}
    style={css`
      width: 320px;
      min-height: 160px;

      ${props.style}
    `}
  >
    <SurfaceHeader key="header">
      <SurfaceButton
        key="minimize"
        label={props.minimized ? "Restore" : "Minimize"}
        iconSrc={props.minimized ? plusIcon : minusIcon}
        iconOnly={true}
        title={props.minimized ? "Restore" : "Minimize"}
        ariaLabel={props.minimized ? "Restore" : "Minimize"}
        expanded={String(!props.minimized)}
        controls={bodyId}
        style={css`
          width: 22px;
        `}
        onClick={onMinimize}
      />
      <SurfaceTitle key="title" text={props.title} />
      <SurfaceTitle key="subtitle" text={props.subtitle} variant="subtitle" />
      <SurfaceNavigation key="navigation" label="Window actions">
        {props.actions.map(action => <WindowActionButton
          key={action.key}
          action={action}
          onAction={props.onAction}
        />)}
      </SurfaceNavigation>
    </SurfaceHeader>
    <SurfaceBody
      key="body"
      id={bodyId}
      hidden={props.minimized}
      style={css`
        ${props.minimized && css`
          display: none;
        `}
      `}
    >
      {props.children}
    </SurfaceBody>
  </SurfaceOwner>
}

function assertWindow(props: WindowProps): void {
  if (typeof props.title !== "string") throw new TypeError("Window title must be a string")
  if (typeof props.subtitle !== "string") throw new TypeError("Window subtitle must be a string")
  if (typeof props.active !== "boolean") throw new TypeError("Window active must be a boolean")
  if (typeof props.minimized !== "boolean") throw new TypeError("Window minimized must be a boolean")
}
