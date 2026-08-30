/** Package-owned external Storybook story support. */
import {
  Switcher,
  type SwitcherProps
} from "@ui/components/switcher"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function SwitcherStoryComponent(props: Readonly<{initial: SwitcherProps}>) {
  const [checked, setChecked] = useState(props.initial.checked)
  const onChange = (next: boolean, event: Event) => {
    setChecked(next)
    props.initial.onChange?.(next, event)
  }
  return <Switcher
    checked={checked}
    disabled={props.initial.disabled}
    title={props.initial.title}
    onChange={onChange}
  />
}

export function createCompiledSwitcherProductionStory(
  document: Document,
  props: SwitcherProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<SwitcherStoryComponent initial={props} />)
  const button = staging.querySelector("button") as HTMLElement | null
  if (!button) {
    root.unmount()
    throw new Error("Compiled Switcher story mounted no button")
  }
  staging.removeChild(button)
  button.setAttribute("data-story-component", "switcher")

  const story = Object.freeze({
    element: button,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(button),
        typescript: source(props, button.getAttribute("aria-checked") === "true")
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(props: SwitcherProps, checked: boolean): string {
  return [
    'import {Switcher} from "@ui/components/switcher"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [checked, setChecked] = useState(${String(checked)})`,
    "  return <Switcher",
    "    checked={checked}",
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
