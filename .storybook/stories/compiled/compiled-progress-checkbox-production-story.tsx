/** Package-owned external Storybook story support. */
import {
  ProgressCheckbox,
  type ProgressCheckboxProps
} from "@ui/components/progress-checkbox"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

type ProgressCheckboxState = Readonly<{
  checked: boolean
  indeterminate: boolean
}>

function ProgressCheckboxStoryComponent(props: Readonly<{initial: ProgressCheckboxProps}>) {
  const [state, setState] = useState<ProgressCheckboxState>({
    checked: props.initial.checked,
    indeterminate: props.initial.indeterminate === true
  })
  const onChange = (checked: boolean, event: Event) => {
    setState({checked, indeterminate: false})
    props.initial.onChange?.(checked, event)
  }
  return <ProgressCheckbox
    checked={state.checked}
    indeterminate={state.indeterminate}
    disabled={props.initial.disabled}
    title={props.initial.title}
    onChange={onChange}
  />
}

export function createCompiledProgressCheckboxProductionStory(
  document: Document,
  props: ProgressCheckboxProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<ProgressCheckboxStoryComponent initial={props} />)
  const input = staging.querySelector("input") as HTMLInputElement | null
  if (!input) {
    root.unmount()
    throw new Error("Compiled ProgressCheckbox story mounted no input")
  }
  staging.removeChild(input)
  input.setAttribute("data-story-component", "progress-checkbox")

  const story = Object.freeze({
    element: input,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(input),
        typescript: source(props, input.checked, input.indeterminate)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(
  props: ProgressCheckboxProps,
  checked: boolean,
  indeterminate: boolean
): string {
  return [
    'import {ProgressCheckbox} from "@ui/components/progress-checkbox"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [state, setState] = useState({checked: ${String(checked)}, indeterminate: ${String(indeterminate)}})`,
    "  const onChange = (checked: boolean) => setState({checked, indeterminate: false})",
    "  return <ProgressCheckbox",
    "    checked={state.checked}",
    "    indeterminate={state.indeterminate}",
    `    disabled={${String(props.disabled === true)}}`,
    "    onChange={onChange}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
