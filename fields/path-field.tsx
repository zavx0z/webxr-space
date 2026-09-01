import {useId} from "@zavx0z/react"
import {PathControl} from "../controls/path-control.tsx"

export type PathFieldProps = Readonly<{id: string; label: string; value: string; placeholder?: string | undefined; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onChange?: ((value: string) => void) | undefined; onBrowse?: (() => void) | undefined}>
const controlStyle: CssStyle = css`& { width: 100%; }`
export function PathField(props: PathFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  return <div data-field-id={props.id} data-field-kind="path" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      <PathControl value={props.value} placeholder={props.placeholder} disabled={props.disabled === true} readOnly={props.readOnly === true} title={props.description} style={controlStyle} onInput={props.onChange} onBrowse={props.onBrowse} />
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("PathField id must not be empty")
  if (!label) throw new TypeError("PathField label must not be empty")
}
