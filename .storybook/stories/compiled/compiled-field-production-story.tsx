/** Package-owned external Storybook story support. */
import {Field, type FieldColor, type FieldDefinition} from "@ui/components/field"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState, type StateDispatch} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function FieldStoryComponent(props: Readonly<{initial: FieldDefinition}>) {
  const [definition, setDefinition] = useState(props.initial)
  return <Field definition={controlledDefinition(definition, setDefinition)} />
}

export function createCompiledFieldProductionStory(
  document: Document,
  definition: FieldDefinition
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(FieldStoryComponent as any, {initial: definition})
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as HTMLElement | undefined
  if (!owner) {
    root.unmount()
    throw new Error("Compiled Field story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "field")
  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    get source() {
      return Object.freeze({
        html: serialize(owner),
        typescript: source(definition)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function controlledDefinition(
  definition: FieldDefinition,
  setDefinition: StateDispatch<FieldDefinition>
): FieldDefinition {
  if (definition.kind === "text") return {
    ...definition,
    onChange(value: string) {
      setDefinition(current => current.kind === "text" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "number") return {
    ...definition,
    onChange(value: number) {
      setDefinition(current => current.kind === "number" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "integer") return {
    ...definition,
    onChange(value: number) {
      setDefinition(current => current.kind === "integer" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "boolean") return {
    ...definition,
    onChange(value: boolean) {
      setDefinition(current => current.kind === "boolean" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "enum") return {
    ...definition,
    onChange(value: string) {
      setDefinition(current => current.kind === "enum" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "color") return {
    ...definition,
    onChange(value: FieldColor) {
      setDefinition(current => current.kind === "color" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "vector" || definition.kind === "rotation") return {
    ...definition,
    onChange(value: readonly number[]) {
      setDefinition(current => current.kind === definition.kind ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "matrix") return {
    ...definition,
    onChange(value: readonly (readonly number[])[]) {
      setDefinition(current => current.kind === "matrix" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  if (definition.kind === "reference") return {
    ...definition,
    onClear() {
      setDefinition(current => current.kind === "reference" ? {...current, value: null} : current)
      definition.onClear?.()
    }
  }
  if (definition.kind === "collection") return {
    ...definition,
    onSelect(selectedId) {
      setDefinition(current => current.kind === "collection" ? {...current, selectedId} : current)
      definition.onSelect?.(selectedId)
    }
  }
  if (definition.kind === "path") return {
    ...definition,
    onChange(value: string) {
      setDefinition(current => current.kind === "path" ? {...current, value} : current)
      definition.onChange?.(value)
    }
  }
  return definition
}

function source(definition: FieldDefinition): string {
  return [
    'import {Field, type FieldDefinition} from "@ui/components/field"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [definition, setDefinition] = useState<FieldDefinition>(${literal(definition)})`,
    "  return <Field definition={{",
    "    ...definition,",
    "    onChange(value) { setDefinition(current => ({...current, value})) },",
    "  }} />",
    "}",
    "createRoot(container).render(<Story />)"
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
