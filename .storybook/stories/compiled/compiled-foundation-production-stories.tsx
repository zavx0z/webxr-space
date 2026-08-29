/** Package-owned external Storybook story support. */
import {Badge, badgeCss, type BadgeProps} from "@ui/components/badge"
import {Divider, dividerCss, type DividerProps} from "@ui/components/divider"
import {Pane, paneCss, type PaneProps} from "@ui/components/pane"
import {
  Typography,
  typographyCss,
  type TypographyProps
} from "@ui/components/typography"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

export function createCompiledPaneProductionStory(
  document: Document,
  props: PaneProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, Pane, props, "pane", paneCss, paneSource(props))
}

export function createCompiledBadgeProductionStory(
  document: Document,
  props: BadgeProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, Badge, props, "badge", badgeCss, badgeSource(props))
}

export function createCompiledTypographyProductionStory(
  document: Document,
  props: TypographyProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    Typography,
    props,
    "typography",
    typographyCss,
    typographySource(props)
  )
}

export function createCompiledDividerProductionStory(
  document: Document,
  props: DividerProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    Divider,
    props,
    "divider",
    dividerCss,
    dividerSource(props)
  )
}

function mountCompiledStory(
  document: Document,
  component: unknown,
  props: unknown,
  name: string,
  css: string,
  typescript: string
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(component as any, props as any)
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as HTMLElement | undefined
  if (!owner) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  const story = Object.freeze({
    element: owner,
    get source() {
      return Object.freeze({html: serialize(owner), css, typescript})
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story, css})
}

function paneSource(props: PaneProps): string {
  return componentSource(
    "Pane",
    "paneCss",
    "pane",
    props,
    [
      "  content={props.content}",
      "  variant={props.variant}",
      "  title={props.title}",
      "  active={props.active}"
    ]
  )
}

function badgeSource(props: BadgeProps): string {
  return componentSource(
    "Badge",
    "badgeCss",
    "badge",
    props,
    ["  label={props.label}", "  tone={props.tone}", "  title={props.title}"]
  )
}

function typographySource(props: TypographyProps): string {
  return componentSource(
    "Typography",
    "typographyCss",
    "typography",
    props,
    ["  text={props.text}", "  variant={props.variant}", "  title={props.title}"]
  )
}

function dividerSource(props: DividerProps): string {
  return componentSource(
    "Divider",
    "dividerCss",
    "divider",
    props,
    ["  variant={props.variant}", "  title={props.title}"]
  )
}

function componentSource(
  component: string,
  cssName: string,
  subpath: string,
  props: unknown,
  jsxProps: readonly string[]
): string {
  return [
    `import {${component}, ${cssName}} from "@ui/components/${subpath}"`,
    'import {createRoot} from "@zavx0z/react"',
    "",
    `const props = ${literal(props)} as const`,
    `createRoot(container).render(<${component}`,
    ...jsxProps,
    "/>)",
    `void ${cssName}`
  ].join("\n")
}

function literal(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => typeof entry === "function" ? undefined : entry, 2)
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
