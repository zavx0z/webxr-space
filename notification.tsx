import {IconButton} from "./button.tsx"
import {closeIcon} from "./icon-assets.ts"

export type NotificationTone = "info" | "success" | "warning" | "error"

export type NotificationProps = Readonly<{
  message: string
  heading?: string | undefined
  detail?: string | undefined
  tone?: NotificationTone | undefined
  dismissible?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onDismiss?: ((event: Event) => void) | undefined
}>

/** One compact semantic notification; delivery/queue policy remains caller-owned. */
export function Notification(props: NotificationProps) {
  assertNotificationProps(props)
  const tone = props.tone ?? "info"
  const dismissible = props.dismissible === true
  return <aside
    role={tone === "warning" || tone === "error" ? "alert" : "status"}
    aria-live={tone === "warning" || tone === "error" ? "assertive" : "polite"}
    data-tone={tone}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      width: 280px;
      min-height: 36px;
      gap: 6px;
      padding: 6px 7px;
      border: var(--border-width-control) solid var(--widget-regular-outline);
      border-left: 3px solid var(--state-info);
      border-radius: 3px;
      background: var(--widget-popup-background);
      color: var(--widget-regular-content);
      box-shadow: 0 2px 8px var(--notification-shadow);

      &[data-tone="success"] {
        border-left-color: var(--state-success);
      }

      &[data-tone="warning"] {
        border-left-color: var(--state-warning);
      }

      &[data-tone="error"] {
        border-left-color: var(--state-error);
      }

      ${props.style}
    `}
  >
    <span
      aria-hidden="true"
      style={css`
        display: block;
        width: 7px;
        min-width: 7px;
        height: 7px;
        margin-top: 5px;
        border-radius: 4px;
        background: var(--state-info);

        &[data-tone="success"] {
          background: var(--state-success);
        }

        &[data-tone="warning"] {
          background: var(--state-warning);
        }

        &[data-tone="error"] {
          background: var(--state-error);
        }
      `}
      data-tone={tone}
    >
    </span>
    <span
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex-grow: 1;
        gap: 1px;
      `}
    >
      <strong
        hidden={props.heading === undefined}
        style={css`
          display: block;
          font-size: var(--font-size-xs);
          line-height: 15px;

          &[hidden] {
            display: none;
          }
        `}
      >
        {props.heading ?? ""}
      </strong>
      <span
        style={css`
          display: block;
          font-size: var(--font-size-xs);
          line-height: 15px;
          overflow-wrap: break-word;
        `}
      >
        {props.message}
      </span>
      <span
        hidden={props.detail === undefined}
        style={css`
          display: block;
          color: var(--widget-text-content-readonly);
          font-size: var(--font-size-2xs);
          line-height: 14px;
          overflow-wrap: break-word;

          &[hidden] {
            display: none;
          }
        `}
      >
        {props.detail ?? ""}
      </span>
    </span>
    <span
      hidden={!dismissible}
      style={css`
        display: block;

        &[hidden] {
          display: none;
        }
      `}
    >
      <IconButton
        label="Dismiss"
        iconSrc={closeIcon}
        title="Dismiss"
        style={css`
          width: 20px;
          min-width: 20px;
          height: 20px;
          padding: 2px;
          border: 0 solid transparent;
          background: transparent;
          box-shadow: none;
        `}
        onClick={props.onDismiss}
      />
    </span>
  </aside>
}

function assertNotificationProps(props: NotificationProps): void {
  if (typeof props.message !== "string" || props.message.length === 0) invalidNotificationProps()
  if (props.heading !== undefined && typeof props.heading !== "string") invalidNotificationProps()
  if (props.detail !== undefined && typeof props.detail !== "string") invalidNotificationProps()
  if (props.tone !== undefined && props.tone !== "info" && props.tone !== "success" && props.tone !== "warning" && props.tone !== "error") {
    invalidNotificationProps()
  }
}

function invalidNotificationProps(): never {
  throw new TypeError("Invalid Notification props")
}
