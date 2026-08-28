import type {Document, Event, HTMLElement, Text} from "@zavx0z/dom"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"

import type {ListItem, ListProps} from "./list-component.tsx"
export type ListController = Readonly<{element: HTMLElement; refs: Readonly<{root: HTMLElement; items: ReadonlyMap<string, HTMLElement>}>; props: ListProps; update(props: ListProps): void; dispose(): void}>

export const listCss = String.raw`
.ui-list { box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; width: 300px; max-height: 180px; gap: 0; padding: 2px; overflow-y: auto; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(29 29 29); }
.ui-list__item { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; min-height: 28px; padding: 3px 7px; border-radius: 3px; color: rgb(204 204 204); font-size: 11px; }
.ui-list__item[data-ui-state="hover"] { background: rgb(84 84 84); }
.ui-list__item[aria-selected="true"] { background: rgb(71 114 179); color: rgb(255 255 255); }
.ui-list__label { display: inline; min-width: 0; flex-grow: 1; }
.ui-list__detail { display: inline; color: rgb(153 153 153); font-size: 10px; }
.ui-list--dense .ui-list__item { min-height: 24px; padding: 2px 6px; }
.ui-list__item[aria-disabled="true"] { opacity: 0.5; }
`

type Entry = {element: HTMLElement; label: Text; detail: Text; listener: (event: Event) => void; state: VisualStateProjection}

export function createList(document: Document, initialProps: ListProps): ListController {
  const root = document.createElement("ul")
  const entries = new Map<string, Entry>()
  const items = new Map<string, HTMLElement>()
  root.setAttribute("role", "listbox")
  let current = normalize(initialProps)
  let disposed = false
  const removeEntry = (key: string, entry: Entry): void => {
    entry.element.removeEventListener("click", entry.listener)
    entry.state.dispose()
    entry.element.remove()
    entries.delete(key)
    items.delete(key)
  }
  const update = (props: ListProps): void => {
    if (disposed) throw new Error("List controller is disposed")
    const next = normalize(props)
    current = next
    root.className = ["ui-list", next.dense ? "ui-list--dense" : ""].filter(Boolean).join(" ")
    root.title = next.title ?? ""
    root.setAttribute("aria-disabled", String(next.disabled === true))
    const retained = new Set(next.items.map(({key}) => key))
    for (const [key, entry] of entries) if (!retained.has(key)) removeEntry(key, entry)
    const ordered: HTMLElement[] = []
    for (const item of next.items) {
      let entry = entries.get(item.key)
      if (entry === undefined) {
        const element = document.createElement("li")
        const labelSpan = document.createElement("span")
        const detailSpan = document.createElement("span")
        const label = document.createTextNode("")
        const detail = document.createTextNode("")
        element.className = "ui-list__item"
        element.setAttribute("role", "option")
        labelSpan.className = "ui-list__label"
        detailSpan.className = "ui-list__detail"
        labelSpan.appendChild(label)
        detailSpan.appendChild(detail)
        element.append(labelSpan, detailSpan)
        const listener = (event: Event): void => {
          const latest = current.items.find(({key}) => key === item.key)
          if (current.disabled !== true && latest?.disabled !== true) current.onSelect?.(item.key, event)
        }
        element.addEventListener("click", listener)
        const state = projectVisualState(element, () => current.disabled === true || current.items.find(({key}) => key === item.key)?.disabled === true)
        entry = {element, label, detail, listener, state}
        entries.set(item.key, entry)
        items.set(item.key, element)
      }
      entry.element.setAttribute("aria-selected", String(item.key === next.selectedKey))
      entry.element.setAttribute("aria-disabled", String(next.disabled === true || item.disabled === true))
      entry.element.title = item.detail ?? item.label
      if (entry.label.data !== item.label) entry.label.data = item.label
      if (entry.detail.data !== (item.detail ?? "")) entry.detail.data = item.detail ?? ""
      entry.state.sync()
      ordered.push(entry.element)
    }
    root.replaceChildren(...ordered)
  }
  const controller: ListController = Object.freeze({
    element: root,
    refs: Object.freeze({root, items}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      for (const [key, entry] of [...entries]) removeEntry(key, entry)
    },
  })
  update(current)
  return controller
}

function normalize(props: ListProps): ListProps {
  if (!Array.isArray(props.items)) throw new TypeError("List items must be an array")
  const keys = new Set<string>()
  const items = props.items.map((item) => {
    if (typeof item.key !== "string" || item.key.length === 0) throw new TypeError("List item key must not be empty")
    if (keys.has(item.key)) throw new Error(`List item key must be unique: ${item.key}`)
    keys.add(item.key)
    if (typeof item.label !== "string") throw new TypeError("List item label must be a string")
    return Object.freeze({...item, disabled: item.disabled ?? false})
  })
  const selectedKey = props.selectedKey ?? null
  if (selectedKey !== null && !keys.has(selectedKey)) throw new Error(`List selected key does not exist: ${selectedKey}`)
  return Object.freeze({...props, items: Object.freeze(items), selectedKey, disabled: props.disabled ?? false, dense: props.dense ?? false})
}
