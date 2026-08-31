import {
  Notification,
  type NotificationProps
} from "@ui/components/notification"
import {
  StatusBar,
  type StatusBarProps
} from "@ui/components/status-bar"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function StatusBarStoryComponent(props: Readonly<{value: StatusBarProps}>) {
  return <StatusBar
    start={props.value.start}
    end={props.value.end}
    separator={props.value.separator}
    title={props.value.title}
  />
}

function NotificationStoryComponent(props: Readonly<{value: NotificationProps}>) {
  return <Notification
    message={props.value.message}
    heading={props.value.heading}
    detail={props.value.detail}
    tone={props.value.tone}
    dismissible={props.value.dismissible}
    title={props.value.title}
  />
}

export function createCompiledStatusBarProductionStory(
  document: Document,
  props: StatusBarProps
): RoutedProductionComponentStory {
  return mount(document, StatusBarStoryComponent, {value: props}, "status-bar", statusBarSource(props))
}

export function createCompiledNotificationProductionStory(
  document: Document,
  props: NotificationProps
): RoutedProductionComponentStory {
  return mount(document, NotificationStoryComponent, {value: props}, "notification", notificationSource(props))
}

function mount(
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

function statusBarSource(props: StatusBarProps): string {
  return [
    'import {StatusBar} from "@ui/components/status-bar"',
    'import {createRoot} from "@zavx0z/react"',
    "",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "createRoot(container).render(<StatusBar start={props.start} end={props.end} />)"
  ].join("\n")
}

function notificationSource(props: NotificationProps): string {
  return [
    'import {Notification} from "@ui/components/notification"',
    'import {createRoot} from "@zavx0z/react"',
    "",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "createRoot(container).render(<Notification",
    "  heading={props.heading}",
    "  message={props.message}",
    "  detail={props.detail}",
    "  tone={props.tone}",
    "  dismissible={props.dismissible}",
    "/>)"
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
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
