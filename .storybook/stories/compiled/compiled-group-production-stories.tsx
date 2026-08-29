/** Package-owned external Storybook story support. */
import {
  ControlGroup,
  controlGroupCss,
  type ControlGroupProps
} from "@ui/components/control-group"
import {
  MatrixInput,
  matrixInputCss,
  type MatrixInputProps
} from "@ui/components/matrix-input"
import {
  VectorInput,
  vectorInputCss,
  type VectorInputProps
} from "@ui/components/vector-input"
import type {Document, Element, Event, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function ControlGroupStoryComponent(props: Readonly<{initial: ControlGroupProps}>) {
  const [items, setItems] = useState(props.initial.items)
  const update = (kind: "input" | "change", key: string, value: string, event: Event) => {
    setItems(current => current.map(item => item.key === key ? {...item, value} : item))
    if (kind === "input") props.initial.onInput?.(key, value, event)
    else props.initial.onChange?.(key, value, event)
  }
  const onInput = (key: string, value: string, event: Event) => update("input", key, value, event)
  const onChange = (key: string, value: string, event: Event) => update("change", key, value, event)
  return <ControlGroup
    items={items}
    disabled={props.initial.disabled}
    title={props.initial.title}
    style={props.initial.style}
    onInput={onInput}
    onChange={onChange}
  />
}

function VectorInputStoryComponent(props: Readonly<{initial: VectorInputProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: readonly number[], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: readonly number[], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <VectorInput
    value={value}
    axes={props.initial.axes}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    style={props.initial.style}
    onInput={onInput}
    onChange={onChange}
  />
}

function MatrixInputStoryComponent(props: Readonly<{initial: MatrixInputProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: readonly (readonly number[])[], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: readonly (readonly number[])[], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <MatrixInput
    value={value}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    style={props.initial.style}
    onInput={onInput}
    onChange={onChange}
  />
}

export function createCompiledControlGroupProductionStory(
  document: Document,
  props: ControlGroupProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    ControlGroupStoryComponent,
    {initial: props},
    "control-group",
    controlGroupCss,
    controlGroupSource(props)
  )
}

export function createCompiledVectorInputProductionStory(
  document: Document,
  props: VectorInputProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    VectorInputStoryComponent,
    {initial: props},
    "vector-input",
    vectorInputCss,
    vectorSource(props)
  )
}

export function createCompiledMatrixInputProductionStory(
  document: Document,
  props: MatrixInputProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    MatrixInputStoryComponent,
    {initial: props},
    "matrix-input",
    matrixInputCss,
    matrixSource(props)
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

function controlGroupSource(props: ControlGroupProps): string {
  return [
    'import {ControlGroup, controlGroupCss, type ControlGroupItem} from "@ui/components/control-group"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [items, setItems] = useState<readonly ControlGroupItem[]>(${literal(props.items)})`,
    "  return <ControlGroup items={items} onInput={(key, value) =>",
    "    setItems(items => items.map(item => item.key === key ? {...item, value} : item))",
    "  } />",
    "}",
    "createRoot(container).render(<Story />)",
    "void controlGroupCss"
  ].join("\n")
}

function vectorSource(props: VectorInputProps): string {
  return [
    'import {VectorInput, vectorInputCss} from "@ui/components/vector-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState<readonly number[]>(${literal(props.value)})`,
    "  return <VectorInput value={value} onInput={setValue} />",
    "}",
    "createRoot(container).render(<Story />)",
    "void vectorInputCss"
  ].join("\n")
}

function matrixSource(props: MatrixInputProps): string {
  return [
    'import {MatrixInput, matrixInputCss} from "@ui/components/matrix-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState<readonly (readonly number[])[]>(${literal(props.value)})`,
    "  return <MatrixInput value={value} onInput={setValue} />",
    "}",
    "createRoot(container).render(<Story />)",
    "void matrixInputCss"
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
