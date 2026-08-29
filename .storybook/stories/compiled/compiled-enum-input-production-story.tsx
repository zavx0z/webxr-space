/** Package-owned external Storybook story support. */
import {
  EnumInput,
  enumInputCss,
  type EnumInputProps
} from "@ui/components/enum-input"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, HTMLSelectElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function EnumInputStoryComponent(props: Readonly<{initial: EnumInputProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <EnumInput
    value={value}
    options={props.initial.options}
    disabled={props.initial.disabled}
    title={props.initial.title}
    style={props.initial.style}
    onChange={onChange}
  />
}

export function createCompiledEnumInputProductionStory(
  document: Document,
  props: EnumInputProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<EnumInputStoryComponent initial={props} />)
  const select = staging.querySelector("select") as HTMLSelectElement | null
  if (!select) {
    root.unmount()
    throw new Error("Compiled EnumInput story mounted no select")
  }
  staging.removeChild(select)
  select.setAttribute("data-story-component", "enum-input")

  const story = Object.freeze({
    element: select,
    get source() {
      return Object.freeze({
        html: serialize(select),
        css: enumInputCss,
        typescript: source(props, select.value)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story, css: enumInputCss})
}

function source(props: EnumInputProps, value: string): string {
  return [
    'import {EnumInput, enumInputCss} from "@ui/components/enum-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    `const options = ${JSON.stringify(props.options, null, 2)} as const`,
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${JSON.stringify(value)})`,
    "  return <EnumInput",
    "    value={value}",
    "    options={options}",
    `    disabled={${String(props.disabled === true)}}`,
    "    onChange={setValue}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
    "void enumInputCss"
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
