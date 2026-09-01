import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

type LegacyOwnerNoticeProps = Readonly<{
  title: string
  detail: string
}>

function LegacyOwnerNoticeContent(props: LegacyOwnerNoticeProps) {
  return <div
    style={css`
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 8px;
    `}
  >
    <Typography text={props.title} variant="title" />
    <Typography text={props.detail} variant="body" />
  </div>
}

function LegacyOwnerNotice(props: LegacyOwnerNoticeProps) {
  return <Pane variant="outlined" title={props.title}>
    <LegacyOwnerNoticeContent title={props.title} detail={props.detail} />
  </Pane>
}

export function createLegacyOwnerNoticeStory(
  document: Document,
  props: LegacyOwnerNoticeProps,
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(LegacyOwnerNotice as any, props)
  const owner = staging.firstElementChild as HTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error("Compiled legacy owner notice mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-legacy-owner", props.title)
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      props: Object.freeze({...props}),
      get source() {
        return Object.freeze({
          html: serialize(owner),
          typescript: [
            '// Historical route retained without fabricating a production component.',
            `export const legacyOwner = ${JSON.stringify(props, null, 2)} as const`,
          ].join("\n"),
        })
      },
      dispose() {
        root.unmount()
      },
    }),
  })
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort()
    .map((name) => ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`).join("")
  const children = [...element.childNodes].filter((node) => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
