export type ReadonlyControlProps = Readonly<{
  value: string | number
  title?: string | undefined
  style?: CssStyle | undefined
}>

export function ReadonlyControl(props: ReadonlyControlProps) {
  return <div title={props.title} style={css`
    & { box-sizing: border-box; display: flex; align-items: center; width: 100%; min-height: 28px; padding: 3px 7px; border: var(--border-width-control) solid var(--widget-regular-outline); border-radius: 4px; background: var(--widget-number-background-readonly); color: var(--widget-text-content-readonly); font-size: var(--font-size-sm); }
    ${props.style}
  `}>{String(props.value)}</div>
}
