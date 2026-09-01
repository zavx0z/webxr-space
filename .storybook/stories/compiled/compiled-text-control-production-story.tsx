/** Package-owned external Storybook story support. */
import {
  TextControl,
  type TextControlProps
} from "@ui/components/controls/text-control"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function TextControlStoryComponent(props: Readonly<{initial: TextControlProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: string, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  return <TextControl
    value={value}
    type={props.initial.type}
    placeholder={props.initial.placeholder}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={props.initial.onChange}
  />
}

export function createCompiledTextControlProductionStory(
  document: Document,
  props: TextControlProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<TextControlStoryComponent initial={props} />)
  const input = staging.querySelector("input") as HTMLInputElement | null
  if (!input) {
    root.unmount()
    throw new Error("Compiled TextControl story mounted no input")
  }
  staging.removeChild(input)
  input.setAttribute("data-story-component", "text-control")

  const story = Object.freeze({
    element: input,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(input),
        typescript: source(props, input.value)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(props: TextControlProps, value: string): string {
  return [
    'import {TextControl} from "@ui/components/controls/text-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${JSON.stringify(value)})`,
    "  return <TextControl",
    "    value={value}",
    `    type={${JSON.stringify(props.type ?? "text")}}`,
    `    placeholder={${JSON.stringify(props.placeholder ?? "")}}`,
    `    disabled={${String(props.disabled === true)}}`,
    `    readOnly={${String(props.readOnly === true)}}`,
    "    onInput={setValue}",
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
