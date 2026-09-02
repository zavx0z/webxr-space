/** Package-owned external Storybook story support. */
import {
  Button,
  IconButton,
  type ButtonProps,
  type IconButtonProps
} from "@zavx0z/ui/buttons/button"
import {createRoot} from "@zavx0z/component"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode
} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

export function createCompiledButtonProductionStory(
  document: SemanticDocument,
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
    onClick={props.onClick}
  />)
  const button = staging.querySelector("button") as SemanticHTMLElement | null
  if (!button) {
    root.unmount()
    throw new Error("Compiled Button story mounted no button")
  }
  staging.removeChild(button)
  button.setAttribute("data-story-component", "button")

  const story = Object.freeze({
    element: button,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(button),
        typescript: source(props)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

export function createCompiledIconButtonProductionStory(
  document: SemanticDocument,
  props: IconButtonProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<IconButton
    label={props.label}
    iconSrc={props.iconSrc}
    variant={props.variant}
    tone={props.tone}
    size={props.size}
    disabled={props.disabled}
    selected={props.selected}
    title={props.title}
    iconSize={props.iconSize}
    onClick={props.onClick}
  />)
  const button = staging.querySelector("button") as SemanticHTMLElement | null
  if (!button) {
    root.unmount()
    throw new Error("Compiled IconButton story mounted no button")
  }
  staging.removeChild(button)
  button.setAttribute("data-story-component", "icon-button")
  return Object.freeze({
    story: Object.freeze({
      element: button,
      componentRoot: root,
      get source() {
        return Object.freeze({
          html: serialize(button),
          typescript: iconButtonSource(props)
        })
      },
      dispose() {
        root.unmount()
      }
    })
  })
}

function source(props: ButtonProps): string {
  const serializable = JSON.stringify(props, (_key, value) =>
    typeof value === "function" ? undefined : value, 2)
  return [
    'import {Button} from "@zavx0z/ui/buttons/button"',
    'import {createRoot} from "@zavx0z/component"',
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
    "  iconSrc={props.iconSrc}",
    "  startIcon={props.startIcon}",
    "  endIcon={props.endIcon}",
    "  iconPosition={props.iconPosition}",
    "  iconOnly={props.iconOnly}",
    "  iconSize={props.iconSize}",
    "/>)"
  ].join("\n")
}

function iconButtonSource(props: IconButtonProps): string {
  return [
    'import {IconButton} from "@zavx0z/ui/buttons/button"',
    'import {uiIcons} from "@zavx0z/ui/themes/icons"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    "const root = createRoot(container)",
    "root.render(<IconButton",
    `  label={${JSON.stringify(props.label)}}`,
    "  iconSrc={uiIcons.settings}",
    `  variant={${JSON.stringify(props.variant ?? "text")}}`,
    `  size={${JSON.stringify(props.size ?? "medium")}}`,
    "/>)"
  ].join("\n")
}

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  if (children.every(node => node.nodeType === 3)) {
    return `${indent}<${element.localName}${attributes}>${escapeHtml(element.textContent ?? "")}</${element.localName}>`
  }
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
