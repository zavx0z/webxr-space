import {useCallback, useState} from "@zavx0z/react"
import {Button} from "../button.tsx"
import {formatColorValue, normalizeColorValue, type ColorValue} from "../src/color/value.ts"
import {ColorPickerField} from "./color-picker-field.tsx"

export type ColorFieldValue = ColorValue
export type ColorFieldProps = Readonly<{
  label?: string | undefined
  value: ColorFieldValue
  open?: boolean | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: ColorFieldValue, event: Event) => void) | undefined
  onChange?: ((value: ColorFieldValue, event: Event) => void) | undefined
  onOpenChange?: ((open: boolean, event: Event) => void) | undefined
}>

export function ColorField(props: ColorFieldProps) {
  if (!props.value || typeof props.value !== "object") throw new TypeError("ColorField value must be an object")
  const value = normalizeColorValue(props.value)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = props.open ?? internalOpen
  const hasLabel = props.label !== undefined
  const setOpen = (next: boolean, event: Event) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next, event)
  }
  const bindPicker = useCallback((element: HTMLDivElement | null) => {
    if (!element?.isConnected) return
    const trigger = element.parentElement?.querySelector("button")
    if (!trigger?.isConnected) return
    if (open) element.showPopover({source: trigger})
    else if (element.popover !== null) element.hidePopover()
  }, [open])
  const onToggle = (event: PointerEvent) => {
    if (props.disabled !== true) setOpen(!open, event)
  }
  const onPickerToggle = (event: ToggleEvent) => {
    const showing = event.newState === "open"
    if (showing !== open) setOpen(showing, event)
  }
  return <div
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      width: auto;
      min-width: 0;
      padding: 0;
      color: var(--widget-list-content);

      &[data-has-label="true"] {
        width: 100%;
        min-height: 28px;
        gap: 4px;
      }

      ${props.style}
    `}
  >
    <span
      hidden={!hasLabel}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 40%;
        min-width: 0;
        height: 28px;
        color: var(--widget-list-content);
        font-size: var(--font-size-sm);

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.label ?? ""}
    </span>
    <div
      data-labelled={hasLabel ? "true" : undefined}
      data-readonly={props.readOnly === true ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 280px;
        min-width: 0;

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }

        &[data-readonly="true"] {
          color: var(--widget-text-content-readonly);
        }
      `}
    >
      <Button
        label={formatColorValue(value)}
        disabled={props.disabled === true}
        selected={open}
        aria-expanded={String(open)}
        style={css`
          width: 100%;
          height: 28px;
          justify-content: flex-start;
          padding: 3px 7px;

          ${open && css`
            background: var(--widget-active-background);
          `}
        `}
        onClick={onToggle}
      />
      <div
        ref={bindPicker}
        popover="auto"
        onToggle={onPickerToggle}
        style={css`
          box-sizing: border-box;
          display: block;
          width: 280px;
        `}
      >
        <ColorPickerField
          value={value}
          disabled={props.disabled}
          readOnly={props.readOnly}
          title={props.title}
          style={css`
            width: 280px;
          `}
          onInput={props.onInput}
          onChange={props.onChange}
        />
      </div>
    </div>
  </div>
}
