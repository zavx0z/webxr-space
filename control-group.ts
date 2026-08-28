import type {Document, Event, HTMLInputElement, HTMLLabelElement, HTMLElement, Text} from "@zavx0z/dom"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"
import {rgba8ToColor, uiTheme} from "./theme.ts"

import type {ControlGroupItem, ControlGroupProps} from "./control-group-component.tsx"
export type ControlGroupRefs = Readonly<{
  root: HTMLElement
  cells: ReadonlyMap<string, HTMLLabelElement>
  inputs: ReadonlyMap<string, HTMLInputElement>
}>
export type ControlGroupController = Readonly<{element: HTMLElement; refs: ControlGroupRefs; props: ControlGroupProps; update(props: ControlGroupProps): void; dispose(): void}>

export const controlGroupCss = String.raw`
.ui-control-group { box-sizing: border-box; display: flex; flex-direction: row; min-width: 0; height: 28px; gap: 0; border: 1px solid rgb(61 61 61); border-radius: 4px; overflow: hidden; background: rgb(84 84 84); box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; }
.ui-control-group__cell { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; min-width: 0; height: 26px; flex-grow: 1; border-right: 1px solid rgb(61 61 61); background: rgb(84 84 84); }
.ui-control-group__cell[data-position="last"] { border-right: 0; }
.ui-control-group__label { display: inline; width: 18px; color: rgb(204 204 204); font-size: 10px; text-align: center; }
.ui-control-group__input { box-sizing: border-box; display: block; min-width: 0; height: 26px; flex-grow: 1; padding: 3px 5px; border: 0; border-radius: 0; background: transparent; color: rgb(230 230 230); font-size: 11px; text-align: right; }
.ui-control-group__cell[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-control-group__cell[data-ui-state="focus"] { background: rgb(34 34 34); }
.ui-control-group__input[readonly] { color: rgb(153 153 153); }
.ui-control-group__input[disabled] { opacity: 0.5; }
`

type Entry = {
  cell: HTMLLabelElement
  labelText: Text
  input: HTMLInputElement
  inputListener: (event: Event) => void
  changeListener: (event: Event) => void
  visualState: VisualStateProjection
}

export function createControlGroup(document: Document, initialProps: ControlGroupProps): ControlGroupController {
  const root = document.createElement("div")
  const entries = new Map<string, Entry>()
  const cells = new Map<string, HTMLLabelElement>()
  const inputs = new Map<string, HTMLInputElement>()
  let current = normalize(initialProps)
  let disposed = false

  const createEntry = (key: string): Entry => {
    const cell = document.createElement("label")
    const label = document.createElement("span")
    const labelText = document.createTextNode("")
    const input = document.createElement("input")
    cell.className = "ui-control-group__cell"
    label.className = "ui-control-group__label"
    input.className = "ui-control-group__input"
    label.appendChild(labelText)
    cell.append(label, input)
    const inputListener = (event: Event): void => current.onInput?.(key, input.value, event)
    const changeListener = (event: Event): void => current.onChange?.(key, input.value, event)
    input.addEventListener("input", inputListener)
    input.addEventListener("change", changeListener)
    const visualState = projectVisualState(cell, () => input.disabled)
    return {cell, labelText, input, inputListener, changeListener, visualState}
  }

  const removeEntry = (key: string, entry: Entry): void => {
    entry.input.removeEventListener("input", entry.inputListener)
    entry.input.removeEventListener("change", entry.changeListener)
    entry.visualState.dispose()
    entry.cell.remove()
    entries.delete(key)
    cells.delete(key)
    inputs.delete(key)
  }

  const update = (props: ControlGroupProps): void => {
    if (disposed) throw new Error("ControlGroup controller is disposed")
    const next = normalize(props)
    root.className = "ui-control-group"
    root.title = next.title ?? ""
    const retained = new Set(next.items.map(({key}) => key))
    for (const [key, entry] of entries) if (!retained.has(key)) removeEntry(key, entry)
    const ordered: HTMLLabelElement[] = []
    next.items.forEach((item, index) => {
      let entry = entries.get(item.key)
      if (entry === undefined) {
        entry = createEntry(item.key)
        entries.set(item.key, entry)
        cells.set(item.key, entry.cell)
        inputs.set(item.key, entry.input)
      }
      entry.cell.setAttribute("data-position", index === 0 ? "first" : index === next.items.length - 1 ? "last" : "middle")
      entry.input.type = item.type ?? "text"
      entry.input.value = item.value
      entry.input.disabled = next.disabled === true || item.disabled === true
      entry.input.readOnly = item.readOnly === true
      entry.input.title = item.title ?? item.label
      if (entry.labelText.data !== item.label) entry.labelText.data = item.label
      entry.visualState.sync()
      ordered.push(entry.cell)
    })
    root.replaceChildren(...ordered)
    current = next
  }
  const refs: ControlGroupRefs = Object.freeze({root, cells, inputs})
  const controller: ControlGroupController = Object.freeze({
    element: root,
    refs,
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

function normalize(props: ControlGroupProps): ControlGroupProps {
  if (!Array.isArray(props.items) || props.items.length === 0) throw new TypeError("ControlGroup items must be a non-empty array")
  const keys = new Set<string>()
  const items = props.items.map((item) => {
    if (typeof item.key !== "string" || item.key.length === 0) throw new TypeError("ControlGroup item key must not be empty")
    if (keys.has(item.key)) throw new Error(`ControlGroup item key must be unique: ${item.key}`)
    keys.add(item.key)
    if (typeof item.label !== "string" || typeof item.value !== "string") throw new TypeError("ControlGroup item label and value must be strings")
    const type = item.type ?? "text"
    if (type !== "text" && type !== "number") throw new Error(`Unknown ControlGroup item type: ${type}`)
    return Object.freeze({...item, type, disabled: item.disabled ?? false, readOnly: item.readOnly ?? false})
  })
  return Object.freeze({...props, items: Object.freeze(items), disabled: props.disabled ?? false})
}
