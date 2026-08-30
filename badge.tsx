
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error"

export type BadgeProps = Readonly<{
  label: string
  tone?: BadgeTone | undefined
  title?: string | undefined
  style?: CssStyle | undefined
}>

export function Badge(props: BadgeProps) {
  const tone = props.tone ?? "neutral"
  return <span
    title={props.title}
    data-tone={tone}
    style={css`
        & {
          box-sizing: border-box;
          display: inline;
          min-height: 20px;
          padding: 2px 6px;
          border: 1px solid var(--widget-regular-outline);
          border-radius: 3px;
          background: var(--widget-number-background-readonly);
          color: var(--widget-regular-content);
          font-size: var(--font-size-xs);
        }
        &[data-tone="info"] { background: var(--state-info); }
        &[data-tone="success"] { background: var(--state-success); }
        &[data-tone="warning"] { background: var(--state-warning); }
        &[data-tone="error"] { background: var(--state-error); }
        ${props.style}
      `}
  >{props.label}</span>
}
