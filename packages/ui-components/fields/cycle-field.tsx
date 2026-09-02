import {useCallback, useId, useState} from "@zavx0z/react"
import {Button} from "../button.tsx"
import {chevronDownIcon} from "../icon-assets.ts"
import {findSelectionOption, validateSelectionOptions} from "../src/selection/options.ts"

export type CycleFieldOption = Readonly<{
  key: string
  value: string
  label: string
  iconSrc?: string | undefined
  description?: string | undefined
  disabled?: boolean | undefined
  title?: string | undefined
}>
export type CycleFieldDensity = "regular" | "compact"
export type CycleFieldProps = Readonly<{
  label?: string | undefined
  value: string
  options: readonly CycleFieldOption[]
  density?: CycleFieldDensity | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  open?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
  onOpenChange?: ((open: boolean, event: Event) => void) | undefined
}>

type CycleOptionProps = Readonly<{
  option: CycleFieldOption
  selected: boolean
  focusable: boolean
  disabled: boolean
  onSelect(key: string, event: PointerEvent): void
  onKeyDown(key: string, event: KeyboardEvent, source: HTMLButtonElement): void
}>

function CycleOption(props: CycleOptionProps) {
  return <Button
    role="option"
    tabIndex={props.focusable ? 0 : -1}
    aria-selected={String(props.selected)}
    label={props.option.label}
    startIcon={props.option.iconSrc}
    title={props.option.title ?? props.option.description}
    variant={props.selected ? "contained" : "text"}
    tone={props.selected ? "primary" : "neutral"}
    disabled={props.disabled || props.option.disabled === true}
    style={css`
      width: 100%;
      height: 26px;
      justify-content: flex-start;
      border: 0;
      background: transparent;
      box-shadow: none;
    `}
    onClick={event => props.onSelect(props.option.key, event)}
    onKeyDown={event => props.onKeyDown(props.option.key, event, event.currentTarget)}
  />
}

export function CycleField(props: CycleFieldProps) {
  if (typeof props.value !== "string") throw new TypeError("CycleField value must be a string")
  const options = validateSelectionOptions(props.options)
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown CycleField density: ${density}`)
  const popupId = useId()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = props.open ?? internalOpen
  const selected = findSelectionOption(props.value, options)
  const focusKey = selected?.key ?? options.find(option => option.disabled !== true)?.key ?? null
  const hasLabel = props.label !== undefined
  const setOpen = (next: boolean, event: Event) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next, event)
  }
  const bindPopover = useCallback((element: HTMLDivElement | null) => {
    if (!element?.isConnected) return
    const trigger = element.parentElement?.querySelector("button")
    if (!trigger?.isConnected) return
    if (open) element.showPopover({source: trigger})
    else if (element.popover !== null) element.hidePopover()
  }, [open])
  const onToggle = (event: PointerEvent) => {
    if (props.disabled !== true) setOpen(!open, event)
  }
  const onPopoverToggle = (event: ToggleEvent) => {
    const showing = event.newState === "open"
    if (showing !== open) setOpen(showing, event)
  }
  const onSelect = (key: string, event: Event) => {
    const option = options.find(candidate => candidate.key === key)
    if (option === undefined || props.disabled === true || props.readOnly === true || option.disabled === true) return
    props.onChange?.(option.value, event)
    setOpen(false, event)
  }
  const onKeyDown = (key: string, event: KeyboardEvent, current: HTMLButtonElement) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(key, event)
      return
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    const optionButtons = [...(current.parentElement?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
      .filter(option => option.getAttribute("aria-disabled") !== "true")
    const currentIndex = optionButtons.indexOf(current)
    const target = optionButtons[(currentIndex + (event.key === "ArrowDown" ? 1 : -1) + optionButtons.length) % optionButtons.length]
    if (target === undefined) return
    event.preventDefault()
    target.focus()
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
      data-density={density}
      data-readonly={props.readOnly === true ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 180px;
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
        label={selected?.label ?? props.value}
        startIcon={selected?.iconSrc}
        endIcon={chevronDownIcon}
        title={selected?.description ?? props.title}
        disabled={props.disabled === true}
        aria-expanded={String(open)}
        aria-haspopup="listbox"
        aria-controls={popupId}
        style={css`
          width: 100%;
          height: var(--control-height-large);
          justify-content: flex-start;
          padding: 3px 7px;

          ${density === "compact" && css`
            height: var(--control-height-medium);
            padding: 2px 6px;
          `}

          ${open && css`
            background: var(--widget-regular-background-selected);
            color: var(--widget-regular-content-selected);
          `}
        `}
        onClick={onToggle}
      />
      <div
        ref={bindPopover}
        id={popupId}
        popover="auto"
        role="listbox"
        title={props.title}
        onToggle={onPopoverToggle}
        style={css`
          box-sizing: border-box;
          display: block;
          width: 180px;
          padding: 3px;
          border: var(--border-width-control) solid var(--widget-popup-outline);
          border-radius: 4px;
          background: var(--widget-popup-background);
        `}
      >
        {options.map(option => <CycleOption
          key={option.key}
          option={option}
          selected={option.value === props.value}
          focusable={option.key === focusKey}
          disabled={props.disabled === true}
          onSelect={onSelect}
          onKeyDown={onKeyDown}
        />)}
      </div>
    </div>
  </div>
}
