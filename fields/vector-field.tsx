import {useId} from "@zavx0z/react"
import {VectorControl} from "../controls/vector-control.tsx"

export type VectorFieldNumberKind = "float" | "integer"
export type VectorFieldProps = Readonly<{id: string; label: string; value: readonly number[]; axes?: readonly string[] | undefined; numberKind?: VectorFieldNumberKind | undefined; min?: number | undefined; max?: number | undefined; step?: number | undefined; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onChange?: ((value: readonly number[]) => void) | undefined}>
const controlStyle: CssStyle = css`& { width: 100%; }`
export function VectorField(props: VectorFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  const onInput = (value: readonly number[]): void => props.onChange?.(props.numberKind === "integer" ? Object.freeze(value.map(Math.round)) : value)
  return <div data-field-id={props.id} data-field-kind="vector" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      <VectorControl value={props.value} axes={props.axes} min={props.min} max={props.max} step={props.numberKind === "integer" ? props.step ?? 1 : props.step} disabled={props.disabled === true} readOnly={props.readOnly === true} title={props.description} style={controlStyle} onInput={onInput} />
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("VectorField id must not be empty")
  if (!label) throw new TypeError("VectorField label must not be empty")
}
