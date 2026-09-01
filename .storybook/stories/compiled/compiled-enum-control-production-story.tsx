/** Package-owned external Storybook story support. */
import {
  EnumControl,
  type EnumControlProps
} from "@ui/components/controls/enum-control"
import {uiIcons} from "@ui/components/icons"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function EnumControlStoryComponent(props: Readonly<{initial: EnumControlProps; presented: boolean}>) {
  const [value, setValue] = useState(props.initial.value)
  const [open, setOpen] = useState(props.initial.open ?? false)
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <EnumControl
    value={value}
    options={props.initial.options}
    presentation={props.initial.presentation}
    state={props.initial.state}
    density={props.initial.density}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    open={!props.presented && props.initial.open === true ? false : open}
    popupLabel={props.initial.popupLabel}
    title={props.initial.title}
    onChange={onChange}
    onOpenChange={setOpen}
  />
}

export function createCompiledEnumControlProductionStory(
  document: Document,
  props: EnumControlProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<EnumControlStoryComponent initial={props} presented={false} />)
  const owner = staging.querySelector("[data-enum-control]") as HTMLElement | null
  if (!owner) {
    root.unmount()
    throw new Error("Compiled EnumControl story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "enum-control")

  let presented = false
  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(owner),
        typescript: source(props, currentValue(owner, props.value))
      })
    },
    afterPresent() {
      if (presented) return
      presented = true
      root.render(<EnumControlStoryComponent initial={props} presented={true} />)
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function source(props: EnumControlProps, value: string): string {
  return [
    'import {EnumControl} from "@ui/components/controls/enum-control"',
    'import {uiIcons} from "@ui/components/icons"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    `const options = ${iconSource(props.options)} as const`,
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${JSON.stringify(value)})`,
    `  const [open, setOpen] = useState(${String(props.open === true)})`,
    "  return <EnumControl",
    "    value={value}",
    "    options={options}",
    "    open={open}",
    `    presentation=${JSON.stringify(props.presentation ?? "cycle")}`,
    `    state=${JSON.stringify(props.state ?? "ready")}`,
    `    density=${JSON.stringify(props.density ?? "regular")}`,
    `    disabled={${String(props.disabled === true)}}`,
    `    readOnly={${String(props.readOnly === true)}}`,
    "    onChange={setValue}",
    "    onOpenChange={setOpen}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function iconSource(value: unknown): string {
  const source = JSON.stringify(value, null, 2)
  if (source === undefined) return "undefined"
  return source
    .replaceAll(JSON.stringify(uiIcons.log), "uiIcons.log")
    .replaceAll(JSON.stringify(uiIcons.run), "uiIcons.run")
    .replaceAll(JSON.stringify(uiIcons.visibilityOn), "uiIcons.visibilityOn")
}

function currentValue(owner: HTMLElement, fallback: string): string {
  const controlled = owner.getAttribute("data-value")
  if (controlled !== null) return controlled
  const select = owner.querySelector("select") as unknown as {value: string} | null
  if (select !== null) return select.value
  const selected = owner.querySelector('[aria-pressed="true"] span')
  return selected?.textContent ?? fallback
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
