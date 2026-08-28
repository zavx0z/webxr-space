import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {checkboxCss, createCheckbox, type CheckboxController} from "./checkbox.ts"
import type {CheckboxProps} from "./checkbox-component.tsx"

import type {ProgressCheckboxProps} from "./progress-checkbox-component.tsx"
export type ProgressCheckboxController = Readonly<{element: HTMLInputElement; refs: Readonly<{input: HTMLInputElement}>; props: ProgressCheckboxProps; update(props: ProgressCheckboxProps): void; dispose(): void}>
export const progressCheckboxCss = `${checkboxCss}\n.ui-progress-checkbox[aria-checked="mixed"] { background: rgb(71 114 179); }`

export function createProgressCheckbox(document: Document, initialProps: ProgressCheckboxProps): ProgressCheckboxController {
  let current = initialProps
  const base: CheckboxController = createCheckbox(document, withClass(initialProps))
  const update = (props: ProgressCheckboxProps): void => {
    base.update(withClass(props))
    base.element.className = "ui-checkbox ui-progress-checkbox"
    current = props
  }
  const controller: ProgressCheckboxController = Object.freeze({element: base.element, refs: base.refs, get props() { return current }, update, dispose: base.dispose})
  update(initialProps)
  return controller
}

function withClass(props: ProgressCheckboxProps): CheckboxProps {
  return props
}
