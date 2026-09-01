import {useId} from "@zavx0z/react"
import {EnumControl} from "../controls/enum-control.tsx"

export type EnumFieldOption = Readonly<{value: string; label: string; iconSrc?: string | undefined; description?: string | undefined; disabled?: boolean | undefined}>
export type EnumFieldProps = Readonly<{id: string; label: string; value: string; options: readonly EnumFieldOption[]; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onChange?: ((value: string) => void) | undefined}>
const controlStyle: CssStyle = css`& { width: 100%; }`
export function EnumField(props: EnumFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  return <div data-field-id={props.id} data-field-kind="enum" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      <EnumControl value={props.value} options={props.options.map(option => ({...option, key: option.value}))} disabled={props.disabled === true} readOnly={props.readOnly === true} title={props.description} style={controlStyle} onChange={props.onChange} />
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("EnumField id must not be empty")
  if (!label) throw new TypeError("EnumField label must not be empty")
}
