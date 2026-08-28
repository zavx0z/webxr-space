import type {Document, Event, HTMLButtonElement, HTMLElement, Text} from "@zavx0z/dom"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"

import {
  normalizeCollectionInputVisibleRows,
  type CollectionInputItem,
  type CollectionInputProps
} from "./collection-input-component.tsx"
export type CollectionInputRefs = Readonly<{
  root: HTMLElement
  list: HTMLElement
  items: ReadonlyMap<string, HTMLElement>
  itemButtons: ReadonlyMap<string, HTMLButtonElement>
  addButton: HTMLButtonElement
  removeButton: HTMLButtonElement
  upButton: HTMLButtonElement
  downButton: HTMLButtonElement
}>
export type CollectionInputController = Readonly<{element: HTMLElement; refs: CollectionInputRefs; props: CollectionInputProps; update(props: CollectionInputProps): void; dispose(): void}>

export const collectionInputCss = String.raw`
.ui-collection-input { box-sizing: border-box; display: flex; flex-direction: row; width: 320px; min-height: 28px; gap: 4px; }
.ui-collection-input__list { box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; height: 84px; flex-grow: 1; gap: 0; padding: 2px; overflow-y: auto; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(29 29 29); }
.ui-collection-input[data-visible-rows="1"] .ui-collection-input__list { height: 30px; }
.ui-collection-input[data-visible-rows="2"] .ui-collection-input__list { height: 56px; }
.ui-collection-input[data-visible-rows="4"] .ui-collection-input__list { height: 110px; }
.ui-collection-input[data-visible-rows="5"] .ui-collection-input__list { height: 136px; }
.ui-collection-input[data-visible-rows="6"] .ui-collection-input__list { height: 162px; }
.ui-collection-input[data-visible-rows="7"] .ui-collection-input__list { height: 188px; }
.ui-collection-input[data-visible-rows="8"] .ui-collection-input__list { height: 214px; }
.ui-collection-input__item { display: block; width: 100%; min-height: 26px; }
.ui-collection-input__item-button { box-sizing: border-box; display: flex; align-items: center; justify-content: flex-start; width: 100%; height: 26px; padding: 3px 7px; border: 0; border-radius: 3px; background: transparent; color: rgb(204 204 204); font-size: 11px; }
.ui-collection-input__item-button[data-ui-state="hover"] { background: rgb(84 84 84); }
.ui-collection-input__item-button[aria-selected="true"] { background: rgb(71 114 179); color: rgb(255 255 255); }
.ui-collection-input__actions { display: flex; flex-direction: column; width: 28px; gap: 2px; }
.ui-collection-input__action { box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(84 84 84); color: rgb(230 230 230); font-size: 12px; }
.ui-collection-input__action[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-collection-input__action[data-ui-state="active"],
.ui-collection-input__action[data-ui-state="focus"] { background: rgb(71 114 179); }
.ui-collection-input--compact .ui-collection-input__item-button { height: 24px; }
.ui-collection-input button[disabled] { opacity: 0.5; }
.ui-collection-input [hidden] { display: none; }
`

type ItemEntry = {element: HTMLElement; button: HTMLButtonElement; text: Text; listener: (event: Event) => void; state: VisualStateProjection}
type ActionEntry = {button: HTMLButtonElement; listener: (event: Event) => void; state: VisualStateProjection}

export function createCollectionInput(document: Document, initialProps: CollectionInputProps): CollectionInputController {
  const root = document.createElement("div")
  const list = document.createElement("ul")
  const actions = document.createElement("div")
  const itemEntries = new Map<string, ItemEntry>()
  const items = new Map<string, HTMLElement>()
  const itemButtons = new Map<string, HTMLButtonElement>()
  list.className = "ui-collection-input__list"
  list.setAttribute("role", "listbox")
  actions.className = "ui-collection-input__actions"
  root.append(list, actions)
  let current = normalize(initialProps)
  let disposed = false
  const blocked = (): boolean => current.disabled === true || current.readOnly === true

  const createAction = (label: string, title: string, action: (event: Event) => void): ActionEntry => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "ui-collection-input__action"
    button.title = title
    button.appendChild(document.createTextNode(label))
    const listener = (event: Event): void => { if (!button.disabled) action(event) }
    button.addEventListener("click", listener)
    const state = projectVisualState(button, () => button.disabled)
    actions.appendChild(button)
    return {button, listener, state}
  }
  const add = createAction("+", "Add item", (event) => current.onAdd?.(event))
  const remove = createAction("−", "Remove selected item", (event) => { if (current.selectedId !== null) current.onRemove?.(current.selectedId, event) })
  const up = createAction("↑", "Move selected item up", (event) => { if (current.selectedId !== null) current.onMove?.(current.selectedId, "up", event) })
  const down = createAction("↓", "Move selected item down", (event) => { if (current.selectedId !== null) current.onMove?.(current.selectedId, "down", event) })
  const actionEntries = [add, remove, up, down]

  const removeItem = (id: string, entry: ItemEntry): void => {
    entry.button.removeEventListener("click", entry.listener)
    entry.state.dispose()
    entry.element.remove()
    itemEntries.delete(id)
    items.delete(id)
    itemButtons.delete(id)
  }
  const update = (props: CollectionInputProps): void => {
    if (disposed) throw new Error("CollectionInput controller is disposed")
    const next = normalize(props)
    current = next
    root.className = ["ui-collection-input", `ui-collection-input--${next.density}`].filter(Boolean).join(" ")
    root.title = next.title ?? ""
    root.setAttribute("data-visible-rows", String(next.visibleRows))
    list.setAttribute("aria-readonly", String(next.readOnly === true))
    list.setAttribute("aria-disabled", String(next.disabled === true))
    const retained = new Set(next.items.map(({id}) => id))
    for (const [id, entry] of itemEntries) if (!retained.has(id)) removeItem(id, entry)
    const ordered: HTMLElement[] = []
    for (const item of next.items) {
      let entry = itemEntries.get(item.id)
      if (entry === undefined) {
        const element = document.createElement("li")
        const button = document.createElement("button")
        const text = document.createTextNode("")
        button.type = "button"
        button.className = "ui-collection-input__item-button"
        button.appendChild(text)
        element.className = "ui-collection-input__item"
        element.setAttribute("role", "option")
        element.appendChild(button)
        const listener = (event: Event): void => {
          const latest = current.items.find(({id}) => id === item.id)
          if (!blocked() && latest?.disabled !== true) current.onSelect?.(item.id, event)
        }
        button.addEventListener("click", listener)
        const state = projectVisualState(button, () => button.disabled)
        entry = {element, button, text, listener, state}
        itemEntries.set(item.id, entry)
        items.set(item.id, element)
        itemButtons.set(item.id, button)
      }
      entry.button.disabled = blocked() || item.disabled === true
      entry.button.title = item.description ?? item.label
      entry.button.setAttribute("aria-selected", String(item.id === next.selectedId))
      entry.element.setAttribute("aria-selected", String(item.id === next.selectedId))
      entry.element.setAttribute("aria-disabled", String(item.disabled === true))
      if (entry.text.data !== item.label) entry.text.data = item.label
      entry.state.sync()
      ordered.push(entry.element)
    }
    if (ordered.length === 0) {
      const empty = document.createElement("li")
      empty.className = "ui-collection-input__item"
      empty.setAttribute("aria-disabled", "true")
      empty.appendChild(document.createTextNode(next.emptyLabel ?? "No items"))
      ordered.push(empty)
    }
    list.replaceChildren(...ordered)
    const selectedIndex = next.selectedId === null ? -1 : next.items.findIndex(({id}) => id === next.selectedId)
    const selected = selectedIndex < 0 ? undefined : next.items[selectedIndex]
    add.button.disabled = blocked() || next.onAdd === undefined
    remove.button.disabled = blocked() || selected === undefined || selected.disabled === true || next.onRemove === undefined
    up.button.disabled = blocked() || selectedIndex <= 0 || selected?.disabled === true || next.onMove === undefined
    down.button.disabled = blocked() || selectedIndex < 0 || selectedIndex >= next.items.length - 1 || selected?.disabled === true || next.onMove === undefined
    syncHidden(up.button, next.onMove === undefined)
    syncHidden(down.button, next.onMove === undefined)
    for (const entry of actionEntries) entry.state.sync()
  }
  const refs: CollectionInputRefs = Object.freeze({root, list, items, itemButtons, addButton: add.button, removeButton: remove.button, upButton: up.button, downButton: down.button})
  const controller: CollectionInputController = Object.freeze({
    element: root,
    refs,
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      for (const [id, entry] of [...itemEntries]) removeItem(id, entry)
      for (const entry of actionEntries) {
        entry.button.removeEventListener("click", entry.listener)
        entry.state.dispose()
      }
    },
  })
  update(current)
  return controller
}

function syncHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) element.setAttribute("hidden", "")
  else element.removeAttribute("hidden")
}

function normalize(props: CollectionInputProps): CollectionInputProps {
  if (!Array.isArray(props.items)) throw new TypeError("CollectionInput items must be an array")
  const ids = new Set<string>()
  const items = props.items.map((item) => {
    if (typeof item.id !== "string" || item.id.length === 0) throw new TypeError("CollectionInput item id must not be empty")
    if (ids.has(item.id)) throw new Error(`CollectionInput item id must be unique: ${item.id}`)
    ids.add(item.id)
    if (typeof item.label !== "string") throw new TypeError("CollectionInput item label must be a string")
    return Object.freeze({...item, disabled: item.disabled ?? false})
  })
  if (props.selectedId !== null && !ids.has(props.selectedId)) throw new Error(`CollectionInput selected id does not exist: ${props.selectedId}`)
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown CollectionInput density: ${density}`)
  return Object.freeze({...props, items: Object.freeze(items), visibleRows: normalizeCollectionInputVisibleRows(props.visibleRows), density, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}
