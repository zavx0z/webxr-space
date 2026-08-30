/** Package-owned external Storybook story support. */
import {
  Checkbox,
  type CheckboxProps
} from "@ui/components/checkbox"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function CheckboxStoryComponent(props: Readonly<{initial: CheckboxProps}>) {
  const [checked, setChecked] = useState(props.initial.checked)
  const onChange = (next: boolean, event: Event) => {
    setChecked(next)
    props.initial.onChange?.(next, event)
  }
  return <Checkbox
    checked={checked}
    indeterminate={props.initial.indeterminate}
    disabled={props.initial.disabled}
    title={props.initial.title}
    onChange={onChange}
  />
}

export function createCompiledCheckboxProductionStory(
  document: Document,
  props: CheckboxProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<CheckboxStoryComponent initial={props} />)
  const input = staging.querySelector("input") as HTMLInputElement | null
  if (!input) {
    root.unmount()
    throw new Error("Compiled Checkbox story mounted no input")
  }
  staging.removeChild(input)
  input.setAttribute("data-story-component", "checkbox")

  const story = Object.freeze({
    element: input,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(input),
        typescript: source(props, input.checked)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(props: CheckboxProps, checked: boolean): string {
  return [
    'import {Checkbox} from "@ui/components/checkbox"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [checked, setChecked] = useState(${String(checked)})`,
    "  return <Checkbox",
    "    checked={checked}",
    `    indeterminate={${String(props.indeterminate === true)}}`,
    `    disabled={${String(props.disabled === true)}}`,
    "    onChange={setChecked}",
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
