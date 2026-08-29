/** Package-owned external Storybook story support. */
import {
  SliderControl,
  sliderControlCss,
  type SliderControlProps
} from "@ui/components/slider-control"
import {createRoot, useState} from "@zavx0z/react"
import type {Document, Element, Event, HTMLElement, HTMLInputElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function SliderControlStoryComponent(props: Readonly<{initial: SliderControlProps}>) {
  const [value, setValue] = useState(props.initial.value)
  const onInput = (next: number, event: Event) => {
    setValue(next)
    props.initial.onInput?.(next, event)
  }
  return <SliderControl
    value={value}
    min={props.initial.min}
    max={props.initial.max}
    step={props.initial.step}
    disabled={props.initial.disabled}
    title={props.initial.title}
    style={props.initial.style}
    onInput={onInput}
    onChange={props.initial.onChange}
  />
}

export function createCompiledSliderControlProductionStory(
  document: Document,
  props: SliderControlProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<SliderControlStoryComponent initial={props} />)
  const input = staging.querySelector("input") as HTMLInputElement | null
  if (!input) {
    root.unmount()
    throw new Error("Compiled SliderControl story mounted no input")
  }
  staging.removeChild(input)
  input.setAttribute("data-story-component", "slider-control")

  const story = Object.freeze({
    element: input,
    get source() {
      return Object.freeze({
        html: serialize(input),
        css: sliderControlCss,
        typescript: source(props, input.valueAsNumber)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story, css: sliderControlCss})
}

function source(props: SliderControlProps, value: number): string {
  return [
    'import {SliderControl, sliderControlCss} from "@ui/components/slider-control"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [value, setValue] = useState(${String(value)})`,
    "  return <SliderControl",
    "    value={value}",
    `    min={${String(props.min)}}`,
    `    max={${String(props.max)}}`,
    `    step={${String(props.step ?? 0.1)}}`,
    `    disabled={${String(props.disabled === true)}}`,
    "    onInput={setValue}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)",
    "void sliderControlCss"
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes]
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
