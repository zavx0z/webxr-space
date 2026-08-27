import {
  CustomEvent,
  type Document,
  type Element,
  type HTMLElement,
  type Node,
} from "@zavx0z/dom"
import {
  createInspector,
  inspectorCss,
  type InspectorDomController,
  type InspectorDomProps,
} from "@ui/components/inspector"

export type InspectorStoryCategory = "source" | "events"

export type InspectorStoryArgs = Readonly<{
  category: InspectorStoryCategory
  query: string
  htmlExpanded: boolean
  cssExpanded: boolean
  eventsExpanded: boolean
}>

export type InspectorStoryControl = keyof InspectorStoryArgs
type InspectorStoryExpandedControl = "htmlExpanded" | "cssExpanded" | "eventsExpanded"

export type InspectorStoryArgsChange = Readonly<{
  control: InspectorStoryControl
  value: InspectorStoryArgs[InspectorStoryControl]
  args: InspectorStoryArgs
}>

export type InspectorStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type InspectorDomStory = Readonly<{
  element: HTMLElement
  controller: InspectorDomController
  args: InspectorStoryArgs
  source: InspectorStorySource
  update(args: InspectorStoryArgs): void
  dispose(): void
}>

export const INSPECTOR_STORY_ARGS_CHANGE_EVENT = "inspectorstoryargschange"

export const inspectorStoryDefaultArgs: InspectorStoryArgs = Object.freeze({
  category: "source",
  query: "",
  htmlExpanded: true,
  cssExpanded: true,
  eventsExpanded: true,
})

const storyCategories = Object.freeze([
  Object.freeze({
    id: "source",
    label: "S",
    title: "Source documents",
    sectionIds: Object.freeze(["html", "css"]),
  }),
  Object.freeze({
    id: "events",
    label: "E",
    title: "DOM events",
    groupStart: true,
    sectionIds: Object.freeze(["events"]),
  }),
])

const sectionControl: Readonly<Record<string, InspectorStoryExpandedControl>> = Object.freeze({
  html: "htmlExpanded",
  css: "cssExpanded",
  events: "eventsExpanded",
})

export function createInspectorStory(
  document: Document,
  initialArgs: InspectorStoryArgs = inspectorStoryDefaultArgs,
): InspectorDomStory {
  let currentArgs = normalizeStoryArgs(initialArgs)
  let disposed = false
  let controller: InspectorDomController

  const onCategoryChange = (id: string): void => {
    if (id !== "source" && id !== "events") return
    applyDomControl("category", id, {...currentArgs, category: id})
  }
  const onQueryChange = (query: string): void => {
    applyDomControl("query", query, {...currentArgs, query})
  }
  const onSectionToggle = (id: string, expanded: boolean): void => {
    const control = sectionControl[id]
    if (control === undefined) return
    applyDomControl(control, expanded, {...currentArgs, [control]: expanded})
  }

  controller = createInspector(document, inspectorProps(currentArgs, {
    onCategoryChange,
    onQueryChange,
    onSectionToggle,
  }))

  const update = (args: InspectorStoryArgs): void => {
    if (disposed) throw new Error("Inspector DOM story is disposed")
    const nextArgs = normalizeStoryArgs(args)
    controller.update(inspectorProps(nextArgs, {
      onCategoryChange,
      onQueryChange,
      onSectionToggle,
    }))
    currentArgs = nextArgs
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    controller.dispose()
  }

  const story: InspectorDomStory = Object.freeze({
    element: controller.element,
    controller,
    get args() {
      return currentArgs
    },
    get source() {
      return createStorySource(controller.element, currentArgs)
    },
    update,
    dispose,
  })
  return story

  function applyDomControl(
    control: InspectorStoryControl,
    value: InspectorStoryArgs[InspectorStoryControl],
    args: InspectorStoryArgs,
  ): void {
    update(args)
    const detail: InspectorStoryArgsChange = Object.freeze({
      control,
      value,
      args: currentArgs,
    })
    controller.element.dispatchEvent(new CustomEvent(INSPECTOR_STORY_ARGS_CHANGE_EVENT, {
      bubbles: true,
      detail,
    }))
  }
}

function inspectorProps(
  args: InspectorStoryArgs,
  handlers: Pick<
    InspectorDomProps,
    "onCategoryChange" | "onQueryChange" | "onSectionToggle"
  >,
): InspectorDomProps {
  return {
    ariaLabel: "Inspector story",
    categoriesLabel: "Story categories",
    categories: storyCategories,
    selectedCategoryId: args.category,
    query: args.query,
    searchLabel: "Search sections",
    searchPlaceholder: "Search sections",
    context: {label: "Button", title: "Inspected element"},
    sections: [
      {
        id: "html",
        label: "HTML",
        title: "Semantic HTML",
        expanded: args.htmlExpanded,
        content: "Semantic markup",
      },
      {
        id: "css",
        label: "CSS",
        title: "Executable CSS",
        expanded: args.cssExpanded,
        content: "Executable stylesheet",
      },
      {
        id: "events",
        label: "Events",
        title: "DOM events",
        expanded: args.eventsExpanded,
        content: "Click and input events",
      },
    ],
    ...handlers,
  }
}

function normalizeStoryArgs(args: InspectorStoryArgs): InspectorStoryArgs {
  if (args.category !== "source" && args.category !== "events") {
    throw new Error(`Unknown Inspector story category: ${String(args.category)}`)
  }
  if (typeof args.query !== "string") throw new TypeError("Inspector story query must be a string")
  for (const key of ["htmlExpanded", "cssExpanded", "eventsExpanded"] as const) {
    if (typeof args[key] !== "boolean") {
      throw new TypeError(`Inspector story ${key} must be a boolean`)
    }
  }
  return Object.freeze({
    category: args.category,
    query: args.query,
    htmlExpanded: args.htmlExpanded,
    cssExpanded: args.cssExpanded,
    eventsExpanded: args.eventsExpanded,
  })
}

function createStorySource(
  element: HTMLElement,
  args: InspectorStoryArgs,
): InspectorStorySource {
  return Object.freeze({
    html: serializeElement(element),
    css: inspectorCss,
    typescript: renderTypeScript(args),
  })
}

function renderTypeScript(args: InspectorStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    'import {createInspector} from "@ui/components/inspector"',
    "",
    "const document = createDocument()",
    `const inspector = createInspector(document, ${JSON.stringify(inspectorProps(args, {}), null, 2)})`,
    "document.appendChild(inspector.element)",
  ].join("\n")
}

const voidElements = new Set(["input"])
const booleanAttributes = new Set(["disabled", "hidden"])

function serializeElement(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames()
    .sort()
    .map((name) => serializeAttribute(element, name))
    .join("")
  const opening = `${indent}<${element.localName}${attributes}>`
  if (voidElements.has(element.localName)) return opening

  const children = element.childNodes
  if (children.length === 0) return `${opening}</${element.localName}>`
  if (children.length === 1 && children[0]?.nodeType === 3) {
    return `${opening}${escapeText(children[0].nodeValue ?? "")}</${element.localName}>`
  }

  const content = children
    .map((child) => serializeNode(child, depth + 1))
    .filter((line) => line.length > 0)
  return [opening, ...content, `${indent}</${element.localName}>`].join("\n")
}

function serializeNode(node: Node, depth: number): string {
  if (node.nodeType === 3) return `${"  ".repeat(depth)}${escapeText(node.nodeValue ?? "")}`
  if (node.nodeType === 1) return serializeElement(node as Element, depth)
  return ""
}

function serializeAttribute(element: Element, name: string): string {
  const value = element.getAttribute(name) ?? ""
  if (booleanAttributes.has(name) && value === "") return ` ${name}`
  return ` ${name}="${escapeAttribute(value)}"`
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
