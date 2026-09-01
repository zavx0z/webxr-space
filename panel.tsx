import {useId} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button, IconButton} from "./button.tsx"
import {chevronDownIcon, chevronRightIcon} from "./icon-assets.ts"

export type PanelAction = Readonly<{
  id: string
  label: string
  iconSrc: string
  title?: string | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  action?: ((event: Event) => void) | undefined
}>

export type PanelProps = Readonly<{
  label: string
  title?: string | undefined
  expanded: boolean
  hidden?: boolean | undefined
  actions?: readonly PanelAction[] | undefined
  children: JsxSourceElement
  style?: CssStyle | undefined
  onToggle?: ((expanded: boolean, event: Event) => void) | undefined
}>

export function Panel(props: PanelProps) {
  if (props.label.length === 0) throw new Error("Panel label must not be empty")
  const contentId = useId()
  const onClick = (event: Event) => props.onToggle?.(!props.expanded, event)
  return <section
    data-panel=""
    hidden={props.hidden === true}
    title={props.title}
    style={css`
      display: flex;
      flex-direction: column;
      width: 100%;
      overflow: clip;
      border-radius: 4px;
      background: var(--widget-regular-outline);

      &[hidden] {
        display: none;
      }

      ${props.style}
    `}
  >
    <header
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 26px;
        gap: 2px;
        background: var(--widget-regular-outline);
      `}
    >
      <Button
        label={props.label}
        startIcon={props.expanded ? chevronDownIcon : chevronRightIcon}
        iconSize={14}
        title={props.title ?? props.label}
        aria-expanded={String(props.expanded)}
        aria-controls={contentId}
        style={css`
          width: 0;
          min-width: 0;
          height: 26px;
          flex-grow: 1;
          padding: 0 5px;
          border: 0;
          border-radius: 4px;
          background: transparent;
          box-shadow: none;
          justify-content: flex-start;

          ${props.expanded && css`
            border-radius: 4px 4px 0 0;
          `}
        `}
        onClick={onClick}
      />
      <nav
        aria-label={`${props.label} actions`}
        style={css`
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 2px;
          padding-right: 2px;
        `}
      >
        {(props.actions ?? []).map(action => <IconButton
          key={action.id}
          label={action.label}
          iconSrc={action.iconSrc}
          title={action.title ?? action.label}
          disabled={action.disabled === true}
          selected={action.selected}
          iconSize={14}
          style={css`
            width: 22px;
            min-width: 22px;
            height: 22px;
            padding: 2px;
            border: 0;
            background: transparent;
            box-shadow: none;
          `}
          onClick={action.action}
        />)}
      </nav>
    </header>
    <div
      id={contentId}
      hidden={!props.expanded}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 100%;
        padding: 6px;
        background: var(--widget-regular-outline);

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.children}
    </div>
  </section>
}
