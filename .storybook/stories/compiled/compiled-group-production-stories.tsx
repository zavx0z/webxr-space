/** Package-owned external Storybook story support. */
import {
  ControlGroup,
  type ControlGroupProps
} from "@ui/components/controls/control-group"
import {
  MatrixControl,
  type MatrixControlProps
} from "@ui/components/controls/matrix-control"
import {
  VectorControl,
  type VectorControlProps
} from "@ui/components/controls/vector-control"
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
    onInput={onInput}
    onChange={onChange}
  />
}

function VectorControlStoryComponent(props: Readonly<{initial: VectorControlProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: readonly number[], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: readonly number[], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <VectorControl
    value={value}
    axes={props.initial.axes}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
  />
}

function MatrixControlStoryComponent(props: Readonly<{initial: MatrixControlProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: readonly (readonly number[])[], event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  const onChange = (next: readonly (readonly number[])[], event: Event) => {
    setValue(next)
    props.initial.onChange?.(next, event)
  }
  return <MatrixControl
    value={value}
    step={props.initial.step}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
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
    controlGroupSource(props)
  )
}

export function createCompiledVectorControlProductionStory(
  document: Document,
  props: VectorControlProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    VectorControlStoryComponent,
    {initial: props},
    "vector-control",
    vectorSource(props)
  )
}

export function createCompiledMatrixControlProductionStory(
  document: Document,
  props: MatrixControlProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    MatrixControlStoryComponent,
    {initial: props},
    "matrix-control",
    matrixSource(props)
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

function controlGroupSource(props: ControlGroupProps): string {
  return [
    'import {ControlGroup, type ControlGroupItem} from "@ui/components/controls/control-group"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [items, setItems] = useState<readonly ControlGroupItem[]>(${literal(props.items)})`,
    "  return <ControlGroup items={items} onInput={(key, value) =>",
    "    setItems(items => items.map(item => item.key === key ? {...item, value} : item))",
    "  } />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function vectorSource(props: VectorControlProps): string {
  return [
    'import {VectorControl} from "@ui/components/controls/vector-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState<readonly number[]>(${literal(props.value)})`,
    "  return <VectorControl value={value} onInput={setValue} />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function matrixSource(props: MatrixControlProps): string {
  return [
    'import {MatrixControl} from "@ui/components/controls/matrix-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState<readonly (readonly number[])[]>(${literal(props.value)})`,
    "  return <MatrixControl value={value} onInput={setValue} />",
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
