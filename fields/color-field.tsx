import {useId} from "@zavx0z/react"
import {ColorControl, type ColorControlValue} from "../controls/color-control.tsx"

export type ColorFieldValue = ColorControlValue
export type ColorFieldProps = Readonly<{id: string; label: string; value: ColorFieldValue; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onChange?: ((value: ColorFieldValue) => void) | undefined}>
const controlStyle: CssStyle = css`& { width: 100%; }`
export function ColorField(props: ColorFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  return <div data-field-id={props.id} data-field-kind="color" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      <ColorControl value={props.value} label={props.label} presentation="expanded" disabled={props.disabled === true} readOnly={props.readOnly === true} title={props.description} style={controlStyle} onInput={props.onChange} />
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("ColorField id must not be empty")
  if (!label) throw new TypeError("ColorField label must not be empty")
}
