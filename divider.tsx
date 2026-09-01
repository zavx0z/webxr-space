export type DividerVariant = "full-width" | "inset" | "middle"

export type DividerProps = Readonly<{
  variant?: DividerVariant | undefined
  title?: string | undefined
  style?: CssStyle | undefined
}>

export function Divider(props: DividerProps) {
  const variant = props.variant ?? "full-width"
  return <hr
    title={props.title}
    data-variant={variant}
    style={css`
      box-sizing: border-box;
      display: block;
      width: 100%;
      height: 1px;
      margin: 4px 0;
      border: 0;
      background: var(--material-editor-border);

      &[data-variant="inset"] {
        width: 96%;
        margin-left: 16px;
      }

      &[data-variant="middle"] {
        width: 90%;
        margin-left: 16px;
      }

      ${props.style}
    `}
  />
}
