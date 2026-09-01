/** Package-owned external Storybook story support. */
import {
  PathControl,
  type PathControlProps
} from "@ui/components/controls/path-control"
import {
  ReferenceControl,
  type ReferenceControlProps,
  type ReferenceControlValue
} from "@ui/components/controls/reference-control"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function PathControlStoryComponent(props: Readonly<{initial: PathControlProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: string, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: string, event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  const onBrowse = (event: Event) => {
    setValue("/project/selected.exr")
    props.initial.onBrowse?.(event)
  }
  return <PathControl
    value={value}
    placeholder={props.initial.placeholder}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    density={props.initial.density}
    title={props.initial.title}
    browseTitle={props.initial.browseTitle}
    onInput={onInput}
    onChange={onChange}
    onBrowse={onBrowse}
  />
}

type ReferenceControlStoryState = Readonly<{value: ReferenceControlValue | null}>

function ReferenceControlStoryComponent(props: Readonly<{initial: ReferenceControlProps}>) {
  const [state, setState] = useState<ReferenceControlStoryState>({value: props.initial.value})
  const onActivate = (event: Event) => props.initial.onActivate?.(event)
  const onPick = (event: Event) => {
    setState({value: {id: "viewport", label: "Viewport", kind: "view"}})
    props.initial.onPick?.(event)
  }
  const onClear = (event: Event) => {
    setState({value: null})
    props.initial.onClear?.(event)
  }
  return <ReferenceControl
    value={state.value}
    placeholder={props.initial.placeholder}
    title={props.initial.title}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    density={props.initial.density}
    onActivate={onActivate}
    onPick={onPick}
    onClear={onClear}
  />
}

export function createCompiledPathControlProductionStory(
  document: Document,
  props: PathControlProps
): RoutedProductionComponentStory {
  const mounted = mountCompiledStory(
    document,
    PathControlStoryComponent,
    {initial: props},
    "path-control",
    owner => pathSource(props, (owner.querySelector("input") as HTMLInputElement).value)
  )
  return mounted
}

export function createCompiledReferenceControlProductionStory(
  document: Document,
  props: ReferenceControlProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    ReferenceControlStoryComponent,
    {initial: props},
    "reference-control",
    () => referenceSource(props)
  )
}

function mountCompiledStory(
  document: Document,
  component: unknown,
  props: unknown,
  name: string,
  typescript: (owner: HTMLElement) => string
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
      return Object.freeze({html: serialize(owner), typescript: typescript(owner)})
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function pathSource(props: PathControlProps, value: string): string {
  return [
    'import {PathControl} from "@ui/components/controls/path-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${JSON.stringify(value)})`,
    "  const onBrowse = () => setValue(\"/project/selected.exr\")",
    "  return <PathControl",
    "    value={value}",
    `    placeholder={${JSON.stringify(props.placeholder ?? "")}}`,
    `    density={${JSON.stringify(props.density ?? "regular")}}`,
    "    onInput={setValue}",
    "    onBrowse={onBrowse}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function referenceSource(props: ReferenceControlProps): string {
  return [
    'import {ReferenceControl, type ReferenceControlValue} from "@ui/components/controls/reference-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState<ReferenceControlValue | null>(${literal(props.value)})`,
    "  return <ReferenceControl",
    "    value={value}",
    `    placeholder={${JSON.stringify(props.placeholder ?? "Not selected")}}`,
    "    onActivate={() => {}}",
    "    onPick={() => setValue({id: \"viewport\", label: \"Viewport\", kind: \"view\"})}",
    "    onClear={() => setValue(null)}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function literal(value: unknown): string {
  return JSON.stringify(value, null, 2)
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
