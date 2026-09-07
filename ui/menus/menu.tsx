import {useLayoutEffect, useRef} from "@zavx0z/component"
import {MenuItem} from "./menu-item.tsx"

export type MenuAction = Readonly<{
  key: string
  label: string
  disabled?: boolean
  shortcut?: string
  onSelect(): void
}>

export type MenuProps = Readonly<{
  open: boolean
  x: number
  y: number
  label?: string
  items: readonly MenuAction[]
  error?: string | null
  onClose(): void
}>

/** A same-Document top-layer menu. Flex owns its rows; CSS owns popup placement. */
export function Menu(props: MenuProps) {
  const element = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const menu = element.current
    if (menu === null) return
    if (props.open) menu.showPopover()
    else menu.hidePopover()
  }, [props.open])
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      props.onClose()
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const buttons = [...(element.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]') ?? [])]
      .filter(button => !button.disabled)
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
      (current + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length
    event.preventDefault()
    buttons[index]?.focus({preventScroll: true})
  }
  return <div
    ref={element}
    popover="auto"
    role="menu"
    aria-label={props.label ?? "Контекстное меню"}
    onKeyDown={onKeyDown}
    onContextMenu={event => event.preventDefault()}
    onToggle={event => {
      if (event.newState === "closed" && props.open) props.onClose()
    }}
    style={css`
      box-sizing: border-box;
      position: fixed;
      left: ${Math.max(0, props.x)}px;
      top: ${Math.max(0, props.y)}px;
      display: flex;
      flex-direction: column;
      width: 200px;
      max-width: 100%;
      margin: 0;
      padding: 4px;
      border: var(--border-width-control) solid var(--widget-popup-outline);
      border-radius: 4px;
      background: var(--widget-popup-background);
      color: var(--widget-regular-content);
      user-select: none;
    `}
  >
    {props.items.map(item => <MenuItem
      key={item.key}
      label={item.label}
      disabled={item.disabled}
      shortcut={item.shortcut}
      onSelect={item.onSelect}
    />)}
    <span
      role="status"
      hidden={!props.error}
      style={css`
        padding: 4px 8px;
        color: var(--widget-regular-content);
        font-size: var(--font-size-xs);

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.error ?? ""}
    </span>
  </div>
}
