import {useId} from "@zavx0z/react"
import {NumberControl} from "../controls/number-control.tsx"
import {SliderControl} from "../controls/slider-control.tsx"

export type NumberFieldPresentation = "control" | "slider"
export type NumberFieldProps = Readonly<{id: string; label: string; value: number; presentation?: NumberFieldPresentation | undefined; min?: number | undefined; max?: number | undefined; softMin?: number | undefined; softMax?: number | undefined; step?: number | undefined; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onChange?: ((value: number) => void) | undefined}>
const controlStyle: CssStyle = css`& { width: 100%; }`

export function NumberField(props: NumberFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  const presentation = props.presentation ?? "control"
  if (presentation !== "control" && presentation !== "slider") throw new Error(`Unknown NumberField presentation: ${presentation}`)
  return <div data-field-id={props.id} data-field-kind="number" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      {presentation === "control" ? <NumberControl value={props.value} min={props.min} max={props.max} softMin={props.softMin} softMax={props.softMax} step={props.step} disabled={props.disabled === true} readOnly={props.readOnly === true} title={props.description} style={controlStyle} onInput={props.onChange} /> : null}
      {presentation === "slider" ? <SliderControl value={props.value} min={props.min ?? 0} max={props.max ?? 100} step={props.step ?? 0.1} disabled={props.disabled === true || props.readOnly === true} title={props.description} style={controlStyle} onInput={props.onChange} /> : null}
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("NumberField id must not be empty")
  if (!label) throw new TypeError("NumberField label must not be empty")
}
