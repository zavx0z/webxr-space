/** Package-owned external Storybook story support. */
import {
  PathInput,
  pathInputCss,
  type PathInputProps
} from "@ui/components/path-input"
import {
  ReferenceInput,
  referenceInputCss,
  type ReferenceInputProps,
  type ReferenceInputValue
} from "@ui/components/reference-input"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function PathInputStoryComponent(props: Readonly<{initial: PathInputProps}>) {
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
  return <PathInput
    value={value}
    placeholder={props.initial.placeholder}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    density={props.initial.density}
    title={props.initial.title}
    browseTitle={props.initial.browseTitle}
    style={props.initial.style}
    onInput={onInput}
    onChange={onChange}
    onBrowse={onBrowse}
  />
}

type ReferenceInputStoryState = Readonly<{value: ReferenceInputValue | null}>

function ReferenceInputStoryComponent(props: Readonly<{initial: ReferenceInputProps}>) {
  const [state, setState] = useState<ReferenceInputStoryState>({value: props.initial.value})
  const onActivate = (event: Event) => props.initial.onActivate?.(event)
  const onPick = (event: Event) => {
    setState({value: {id: "viewport", label: "Viewport", kind: "view"}})
    props.initial.onPick?.(event)
  }
  const onClear = (event: Event) => {
    setState({value: null})
    props.initial.onClear?.(event)
  }
  return <ReferenceInput
    value={state.value}
    placeholder={props.initial.placeholder}
    title={props.initial.title}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    density={props.initial.density}
    style={props.initial.style}
    onActivate={onActivate}
    onPick={onPick}
    onClear={onClear}
  />
}

export function createCompiledPathInputProductionStory(
  document: Document,
  props: PathInputProps
): RoutedProductionComponentStory {
  const mounted = mountCompiledStory(
    document,
    PathInputStoryComponent,
    {initial: props},
    "path-input",
    pathInputCss,
    owner => pathSource(props, (owner.querySelector("input") as HTMLInputElement).value)
  )
  return mounted
}

export function createCompiledReferenceInputProductionStory(
  document: Document,
  props: ReferenceInputProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    ReferenceInputStoryComponent,
    {initial: props},
    "reference-input",
    referenceInputCss,
    () => referenceSource(props)
  )
}

function mountCompiledStory(
  document: Document,
  component: unknown,
  props: unknown,
  name: string,
  css: string,
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
    get source() {
      return Object.freeze({html: serialize(owner), css, typescript: typescript(owner)})
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story, css})
}

function pathSource(props: PathInputProps, value: string): string {
  return [
    'import {PathInput, pathInputCss} from "@ui/components/path-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${JSON.stringify(value)})`,
    "  const onBrowse = () => setValue(\"/project/selected.exr\")",
    "  return <PathInput",
    "    value={value}",
    `    placeholder={${JSON.stringify(props.placeholder ?? "")}}`,
    `    density={${JSON.stringify(props.density ?? "regular")}}`,
    "    onInput={setValue}",
    "    onBrowse={onBrowse}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
    "void pathInputCss"
  ].join("\n")
}

function referenceSource(props: ReferenceInputProps): string {
  return [
    'import {ReferenceInput, referenceInputCss, type ReferenceInputValue} from "@ui/components/reference-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState<ReferenceInputValue | null>(${literal(props.value)})`,
    "  return <ReferenceInput",
    "    value={value}",
    `    placeholder={${JSON.stringify(props.placeholder ?? "Not selected")}}`,
    "    onActivate={() => {}}",
    "    onPick={() => setValue({id: \"viewport\", label: \"Viewport\", kind: \"view\"})}",
    "    onClear={() => setValue(null)}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
    "void referenceInputCss"
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
