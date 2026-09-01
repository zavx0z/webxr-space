/** Package-owned external Storybook story support. */
import {
  NumberControl,
  type NumberControlProps
} from "@ui/components/controls/number-control"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function NumberControlStoryComponent(props: Readonly<{initial: NumberControlProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: number, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  return <NumberControl
    value={value}
    min={props.initial.min}
    max={props.initial.max}
    softMin={props.initial.softMin}
    softMax={props.initial.softMax}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={props.initial.onChange}
  />
}

export function createCompiledNumberControlProductionStory(
  document: Document,
  props: NumberControlProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<NumberControlStoryComponent initial={props} />)
  const owner = staging.querySelector("div") as HTMLElement | null
  if (!owner) {
    root.unmount()
    throw new Error("Compiled NumberControl story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "number-control")

  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    get source() {
      const value = (owner.querySelector("input") as HTMLInputElement).valueAsNumber
      return Object.freeze({
        html: serialize(owner),
        typescript: source(props, value)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(props: NumberControlProps, value: number): string {
  return [
    'import {NumberControl} from "@ui/components/controls/number-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${String(value)})`,
    "  return <NumberControl",
    "    value={value}",
    `    min={${props.min === undefined ? "undefined" : String(props.min)}}`,
    `    max={${props.max === undefined ? "undefined" : String(props.max)}}`,
    `    step={${String(props.step ?? 0.1)}}`,
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
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
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
