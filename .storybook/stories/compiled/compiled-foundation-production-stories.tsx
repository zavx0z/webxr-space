/** Package-owned external Storybook story support. */
import {Badge, type BadgeProps} from "@ui/components/badge"
import {Divider, type DividerProps} from "@ui/components/divider"
import {Pane, type PaneProps} from "@ui/components/pane"
import {Panel} from "@ui/components/panel"
import {
  Typography,
  type TypographyProps
} from "@ui/components/typography"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

export function createCompiledPaneProductionStory(
  document: Document,
  props: PaneProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, Pane, props, "pane", paneSource(props))
}

export type PanelStoryProps = Readonly<{label: string; expanded: boolean}>

function PanelStoryContent() {
  return <span>Panel content</span>
}

function PanelStoryComponent(props: PanelStoryProps) {
  const [expanded, setExpanded] = useState(props.expanded)
  return <Panel label={props.label} expanded={expanded} onToggle={setExpanded}>
    <PanelStoryContent />
  </Panel>
}

export function createCompiledPanelProductionStory(
  document: Document,
  props: PanelStoryProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, PanelStoryComponent, props, "panel", panelSource(props))
}

export function createCompiledBadgeProductionStory(
  document: Document,
  props: BadgeProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, Badge, props, "badge", badgeSource(props))
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
    dividerSource(props)
  )
}

function mountCompiledStory(
  document: Document,
  component: unknown,
  props: unknown,
  name: string,
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
    componentRoot: root,
    get source() {
      return Object.freeze({html: serialize(owner), typescript})
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function paneSource(props: PaneProps): string {
  return componentSource(
    "Pane",
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

function panelSource(props: PanelStoryProps): string {
  return [
    'import {Panel} from "@ui/components/panel"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    `const initial = ${literal(props)} as const`,
    "function Story() {",
    "  const [expanded, setExpanded] = useState(initial.expanded)",
    "  return <Panel label={initial.label} expanded={expanded} onToggle={setExpanded}>",
    "    <span>Panel content</span>",
    "  </Panel>",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function badgeSource(props: BadgeProps): string {
  return componentSource(
    "Badge",
    "badge",
    props,
    ["  label={props.label}", "  tone={props.tone}", "  title={props.title}"]
  )
}

function typographySource(props: TypographyProps): string {
  return componentSource(
    "Typography",
    "typography",
    props,
    ["  text={props.text}", "  variant={props.variant}", "  title={props.title}"]
  )
}

function dividerSource(props: DividerProps): string {
  return componentSource(
    "Divider",
    "divider",
    props,
    ["  variant={props.variant}", "  title={props.title}"]
  )
}

function componentSource(
  component: string,
  subpath: string,
  props: unknown,
  jsxProps: readonly string[]
): string {
  return [
    `import {${component}} from "@ui/components/${subpath}"`,
    'import {createRoot} from "@zavx0z/react"',
    "",
    `const props = ${literal(props)} as const`,
    `createRoot(container).render(<${component}`,
    ...jsxProps,
    "/>)"
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
