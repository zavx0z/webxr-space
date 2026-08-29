/** Package-owned external Storybook story support. */
import {
  Button,
  buttonCss,
  type ButtonProps
} from "@ui/components/button"
import {createRoot} from "@zavx0z/react"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

export function createCompiledButtonProductionStory(
  document: Document,
  props: ButtonProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<Button
    label={props.label}
    variant={props.variant}
    tone={props.tone}
    size={props.size}
    disabled={props.disabled}
    selected={props.selected}
    title={props.title}
    iconSrc={props.iconSrc}
    startIcon={props.startIcon}
    endIcon={props.endIcon}
    iconPosition={props.iconPosition}
    iconOnly={props.iconOnly}
    iconSize={props.iconSize}
    style={props.style}
    onClick={props.onClick}
  />)
  const button = staging.querySelector("button") as HTMLElement | null
  if (!button) {
    root.unmount()
    throw new Error("Compiled Button story mounted no button")
  }
  staging.removeChild(button)
  button.setAttribute("data-story-component", "button")

  const story = Object.freeze({
    element: button,
    get source() {
      return Object.freeze({
        html: serialize(button),
        css: buttonCss,
        typescript: source(props)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story, css: buttonCss})
}

function source(props: ButtonProps): string {
  const serializable = JSON.stringify(props, (_key, value) =>
    typeof value === "function" ? undefined : value, 2)
  return [
    'import {Button, buttonCss} from "@ui/components/button"',
    'import {createRoot} from "@zavx0z/react"',
    "",
    `const props = ${serializable}`,
    "const root = createRoot(container)",
    "root.render(<Button",
    "  label={props.label}",
    "  variant={props.variant}",
    "  tone={props.tone}",
    "  size={props.size}",
    "  disabled={props.disabled}",
    "  selected={props.selected}",
    "  title={props.title}",
    "/>)",
    "void buttonCss"
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  if (children.every(node => node.nodeType === 3)) {
    return `${indent}<${element.localName}${attributes}>${escapeHtml(element.textContent ?? "")}</${element.localName}>`
  }
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
