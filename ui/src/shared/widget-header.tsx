import {Badge, type BadgeTone} from "../../badge.tsx"
import {Button, type ButtonTone} from "../../buttons/button.tsx"
import {Divider} from "../../divider.tsx"

export type WidgetAction = Readonly<{
  id: string
  label: string
  iconSrc?: string | undefined
  badge?: string | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  tone?: ButtonTone | undefined
  badgeTone?: BadgeTone | undefined
  dividerAfter?: boolean | undefined
  onAction?: ((event: Event) => void) | undefined
}>

export function WidgetActionButton(props: Readonly<{action: WidgetAction; stopPropagation?: boolean}>) {
  const action = props.action
  return <div
    style={css`
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 3px;
    `}
  >
    <Button
      label={action.label}
      iconSrc={action.iconSrc}
      iconOnly={action.iconSrc !== undefined}
      title={action.label}
      disabled={action.disabled === true}
      selected={action.selected}
      tone={action.tone}
      onClick={event => {
        if (props.stopPropagation) event.stopPropagation()
        action.onAction?.(event)
      }}
      size="small"
    />
    <span
      hidden={action.badge === undefined}
      style={css`
        display: flex;

        &[hidden] {
          display: none;
        }
      `}
    >
      <Badge
        label={action.badge ?? ""}
        tone={action.badgeTone}
      />
    </span>
    {action.dividerAfter ? <Divider
      style={css`
        width: 1px;
        height: 18px;
        margin: 0 2px;
      `}
    /> : null}
  </div>
}
export type WidgetHeaderProps = Readonly<{
  title: string
  subtitle?: string | undefined
  status?: string | undefined
  statusTone?: BadgeTone | undefined
  actions?: readonly WidgetAction[] | undefined
}>

export function WidgetHeader(props: WidgetHeaderProps) {
  return <header
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      min-width: 0;
      height: 36px;
      min-height: 36px;
      gap: 6px;
      padding: 6px 16px;
      background: var(--widget-toolbar-background);
      color: var(--widget-toolbar-content);
      user-select: none;
    `}
  >
    <strong
      title={props.title}
      style={css`
        min-width: 0;
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: var(--font-size-sm);
      `}
    >
      {props.title}
    </strong>
    <span
      style={css`
        font-size: var(--font-size-xs);
        color: var(--widget-text-content-readonly);
        white-space: nowrap;
      `}
    >
      {props.subtitle ?? ""}
    </span>
    <span
      hidden={!props.status}
      style={css`
        display: flex;

        &[hidden] {
          display: none;
        }
      `}
    >
      <Badge
        label={props.status ?? ""}
        tone={props.statusTone}
      />
    </span>
    <nav
      aria-label={`${props.title} actions`}
      style={css`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 3px;
      `}
    >
      {(props.actions ?? []).map(action => <WidgetActionButton
        key={action.id}
        action={action}
      />)}
    </nav>
  </header>
}
