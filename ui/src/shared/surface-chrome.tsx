import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button, type ButtonProps} from "../../buttons/button.tsx"

export type SurfaceOwnerProps = Readonly<{
  label: string
  active?: boolean | undefined
  timeline?: boolean | undefined
  frameStart?: number | undefined
  frameEnd?: number | undefined
  frameCurrent?: number | undefined
  children: readonly JsxSourceElement[]
  style?: CssStyle | undefined
}>

export function SurfaceOwner(props: SurfaceOwnerProps) {
  return <section
    aria-label={props.label}
    data-active={props.active === true ? "true" : undefined}
    data-timeline={props.timeline === true ? "" : undefined}
    data-frame-start={props.frameStart === undefined ? undefined : String(props.frameStart)}
    data-frame-end={props.frameEnd === undefined ? undefined : String(props.frameEnd)}
    data-frame-current={props.frameCurrent === undefined ? undefined : String(props.frameCurrent)}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
      border: var(--border-width-control) solid var(--widget-toolbar-outline);
      border-radius: 6px;
      background: var(--space-node-navigation-background);
      color: var(--widget-toolbar-content);
      overflow: clip;

      &[data-active="true"] {
        border-color: var(--material-editor-outline-active);
      }

      ${props.style}
    `}
  >
    {props.children}
  </section>
}

export type SurfaceHeaderProps = Readonly<{
  children: readonly JsxSourceElement[]
  style?: CssStyle | undefined
}>

export function SurfaceHeader(props: SurfaceHeaderProps) {
  return <header
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      height: 28px;
      gap: 4px;
      padding: 3px 6px;
      background: var(--space-node-header-background);

      ${props.style}
    `}
  >
    {props.children}
  </header>
}

export type SurfaceTitleProps = Readonly<{
  text: string
  variant?: "title" | "subtitle" | undefined
  style?: CssStyle | undefined
}>

export function SurfaceTitle(props: SurfaceTitleProps) {
  const variant = props.variant ?? "title"
  return <span
    style={css`
      display: inline;

      ${variant === "title" && css`
        min-width: 0;
        flex-grow: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: var(--font-size-sm);
      `}

      ${variant === "subtitle" && css`
        color: var(--widget-text-content-readonly);
        font-size: var(--font-size-2xs);
      `}

      ${props.style}
    `}
  >
    {props.text}
  </span>
}

export type SurfaceNavigationProps = Readonly<{
  label: string
  children: readonly JsxSourceElement[]
  style?: CssStyle | undefined
}>

export function SurfaceNavigation(props: SurfaceNavigationProps) {
  return <nav
    aria-label={props.label}
    style={css`
      display: flex;
      flex-direction: row;
      gap: 4px;

      ${props.style}
    `}
  >
    {props.children}
  </nav>
}

export type SurfaceBodyProps = Readonly<{
  id?: string | undefined
  hidden?: boolean | undefined
  children: JsxSourceElement | null
  style?: CssStyle | undefined
}>

export function SurfaceBody(props: SurfaceBodyProps) {
  return <section
    id={props.id}
    hidden={props.hidden === true}
    style={css`
      box-sizing: border-box;
      display: block;
      flex-grow: 1;
      padding: 6px;

      ${props.style}
    `}
  >
    {props.children}
  </section>
}

export type SurfaceButtonProps = Readonly<{
  label: string
  iconSrc?: string | undefined
  iconOnly?: boolean | undefined
  iconAction?: boolean | undefined
  title?: string | undefined
  ariaLabel?: string | undefined
  expanded?: boolean | string | undefined
  controls?: string | undefined
  disabled?: boolean | undefined
  style?: CssStyle | undefined
  onClick?: ButtonProps["onClick"]
}>

export function SurfaceButton(props: SurfaceButtonProps) {
  return <Button
    label={props.label}
    iconSrc={props.iconSrc}
    iconOnly={props.iconOnly}
    title={props.title}
    aria-label={props.ariaLabel}
    aria-expanded={props.expanded}
    aria-controls={props.controls}
    disabled={props.disabled}
    style={css`
      width: 52px;
      min-width: 22px;
      height: 22px;
      padding: 2px 6px;
      font-size: 10px;

      ${props.iconAction === true && css`
        width: 22px;
        padding: 2px;
      `}

      ${props.style}
    `}
    onClick={props.onClick}
  />
}

export function assertSurfaceActions(
  items: readonly Readonly<{key: string; label: string; disabled: boolean}>[],
  owner: string,
): void {
  if (!Array.isArray(items)) throw new TypeError(`${owner}s must be an array`)
  const keys = new Set<string>()
  for (const item of items) {
    if (!item || typeof item !== "object") throw new TypeError(`${owner} must be an object`)
    if (typeof item.key !== "string") throw new TypeError(`${owner} key must be a string`)
    if (item.key.length === 0) throw new Error(`${owner} key must not be empty`)
    if (keys.has(item.key)) throw new Error(`${owner} key must be unique: ${item.key}`)
    keys.add(item.key)
    if (typeof item.label !== "string") throw new TypeError(`${owner} ${item.key} label must be a string`)
    if (typeof item.disabled !== "boolean") throw new TypeError(`${owner} ${item.key} disabled must be a boolean`)
  }
}
