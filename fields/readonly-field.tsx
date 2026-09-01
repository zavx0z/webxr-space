import {useId} from "@zavx0z/react"
import {ReadonlyControl} from "../controls/readonly-control.tsx"

export type ReadonlyFieldProps = Readonly<{id: string; label: string; value: string | number; description?: string | undefined; disabled?: boolean | undefined; style?: CssStyle | undefined}>
export function ReadonlyField(props: ReadonlyFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  return <div data-field-id={props.id} data-field-kind="readonly" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      <ReadonlyControl value={props.value} title={props.description} />
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("ReadonlyField id must not be empty")
  if (!label) throw new TypeError("ReadonlyField label must not be empty")
}
