/** Package-owned external Storybook story support. */
import {Frame, type FrameDefaultProps} from "@zavx0z/ui/surfaces/frame"
import {Window, type WindowDefaultProps} from "@zavx0z/ui/surfaces/window"
import {Timeline, type TimelineProps} from "@zavx0z/ui/views/timeline"
import {uiIcons} from "@zavx0z/ui/themes/icons"
import {Pane} from "@zavx0z/ui/surfaces/pane"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode
} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/component"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function WindowStoryComponent(props: Readonly<{initial: WindowDefaultProps}>) {
  const [minimized, setMinimized] = useState(props.initial.minimized)
  return <Window
    title={props.initial.title}
    subtitle={props.initial.subtitle}
    active={props.initial.active}
    minimized={minimized}
    actions={props.initial.actions}
    onMinimizedChange={setMinimized}
  >
    <Pane content="Window body" variant="transparent" />
  </Window>
}

function FrameStoryComponent(props: Readonly<{initial: FrameDefaultProps}>) {
  return <Frame
    title={props.initial.title}
    edge={props.initial.edge}
    handles={props.initial.handles}
  >
    <Pane content="Frame body" variant="transparent" />
  </Frame>
}

function TimelineStoryComponent(props: Readonly<{initial: TimelineProps}>) {
  return <Timeline
    title={props.initial.title}
    frameStart={props.initial.frameStart}
    frameEnd={props.initial.frameEnd}
    frameCurrent={props.initial.frameCurrent}
    visibleStart={props.initial.visibleStart}
    visibleEnd={props.initial.visibleEnd}
    previewStart={props.initial.previewStart}
    previewEnd={props.initial.previewEnd}
    showSeconds={props.initial.showSeconds}
    framesPerSecond={props.initial.framesPerSecond}
    keyframes={props.initial.keyframes}
    markers={props.initial.markers}
    style={css`
      width: 100%;
      max-width: 640px;
    `}
  />
}

export function createCompiledWindowProductionStory(
  document: SemanticDocument,
  props: WindowDefaultProps
): RoutedProductionComponentStory {
  return mount(document, WindowStoryComponent, {initial: props}, "window", windowSource(props))
}

export function createCompiledFrameProductionStory(
  document: SemanticDocument,
  props: FrameDefaultProps
): RoutedProductionComponentStory {
  return mount(document, FrameStoryComponent, {initial: props}, "frame", frameSource(props))
}

export function createCompiledTimelineProductionStory(
  document: SemanticDocument,
  props: TimelineProps
): RoutedProductionComponentStory {
  return mount(document, TimelineStoryComponent, {initial: props}, "timeline", timelineSource(props))
}

function mount(
  document: SemanticDocument,
  component: unknown,
  props: unknown,
  name: string,
  typescript: string
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(component as any, props as any)
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as SemanticHTMLElement | undefined
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

function frameSource(props: FrameDefaultProps): string {
  return [
    'import {Frame} from "@zavx0z/ui/surfaces/frame"',
    'import {uiIcons} from "@zavx0z/ui/themes/icons"',
    'import {Pane} from "@zavx0z/ui/surfaces/pane"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    `const props = ${literal(props)} as const`,
    "createRoot(container).render(<Frame",
    "  title={props.title}",
    "  edge={props.edge}",
    "  handles={props.handles}",
    ">",
    '  <Pane content="Body" />',
    "</Frame>)"
  ].join("\n")
}

function windowSource(props: WindowDefaultProps): string {
  return [
    'import {Window} from "@zavx0z/ui/surfaces/window"',
    'import {uiIcons} from "@zavx0z/ui/themes/icons"',
    'import {Pane} from "@zavx0z/ui/surfaces/pane"',
    'import {createRoot, useState} from "@zavx0z/component"',
    "",
    `const props = ${literal(props)} as const`,
    "",
    "function Story() {",
    "  const [minimized, setMinimized] = useState<boolean>(props.minimized)",
    "  return <Window",
    "    title={props.title}",
    "    subtitle={props.subtitle}",
    "    active={props.active}",
    "    minimized={minimized}",
    "    actions={props.actions}",
    "    onMinimizedChange={setMinimized}",
    "  >",
    '    <Pane content="Body" />',
    "  </Window>",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function timelineSource(props: TimelineProps): string {
  return [
    'import {Timeline} from "@zavx0z/ui/views/timeline"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    `const props = ${literal(props)} as const`,
    "",
    "createRoot(container).render(<Timeline",
    "    title={props.title}",
    "    frameStart={props.frameStart}",
    "    frameEnd={props.frameEnd}",
    "    frameCurrent={props.frameCurrent}",
    "    visibleStart={props.visibleStart}",
    "    visibleEnd={props.visibleEnd}",
    "    previewStart={props.previewStart}",
    "    previewEnd={props.previewEnd}",
    "    showSeconds={props.showSeconds}",
    "    framesPerSecond={props.framesPerSecond}",
    "    keyframes={props.keyframes}",
    "    markers={props.markers}",
    "    style={css`",
    "      width: 100%;",
    "      max-width: 640px;",
    "    `}",
    "  />)"
  ].join("\n")
}

function literal(value: unknown): string {
  let source = JSON.stringify(value, null, 2) ?? "undefined"
  for (const [name, icon] of Object.entries(uiIcons)) {
    source = source.replaceAll(JSON.stringify(icon), `uiIcons.${name}`)
  }
  return source
}

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
