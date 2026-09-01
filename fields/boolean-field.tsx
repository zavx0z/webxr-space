import {useId} from "@zavx0z/react"
import {Checkbox} from "../controls/checkbox.tsx"
import {Switcher} from "../controls/switcher.tsx"

export type BooleanFieldPresentation = "checkbox" | "switch"
export type BooleanFieldProps = Readonly<{id: string; label: string; value: boolean; presentation?: BooleanFieldPresentation | undefined; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onChange?: ((value: boolean) => void) | undefined}>
const controlStyle: CssStyle = css`& { margin-top: 5px; }`
export function BooleanField(props: BooleanFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  const presentation = props.presentation ?? "checkbox"
  if (presentation !== "checkbox" && presentation !== "switch") throw new Error(`Unknown BooleanField presentation: ${presentation}`)
  const locked = props.disabled === true || props.readOnly === true
  return <div data-field-id={props.id} data-field-kind="boolean" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      {presentation === "checkbox" ? <Checkbox checked={props.value} disabled={locked} title={props.description} style={controlStyle} onChange={props.onChange} /> : null}
      {presentation === "switch" ? <Switcher checked={props.value} disabled={locked} title={props.description} style={controlStyle} onChange={props.onChange} /> : null}
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("BooleanField id must not be empty")
  if (!label) throw new TypeError("BooleanField label must not be empty")
}
