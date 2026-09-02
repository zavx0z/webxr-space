import {
  Comment,
  DocumentFragment,
  Element,
  Node,
  Text,
  type Document,
  type EventListener
} from "@zavx0z/dom"
import {
  containsTaggedTemplateMarker,
  getTaggedTemplateShape,
  joinTaggedTemplateSource,
  parseTaggedTemplateSegments,
  type TaggedTemplateSegment,
  type TaggedTemplateSlotSegment,
} from "./tagged-template.ts"

const templateResultType = Symbol("@zavx0z/template/result")
const templateAnchors = new WeakSet<Comment>()
const htmlBlueprintFrontend = Symbol("@zavx0z/template/html-blueprint")

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
])

const rawTextElements = new Set(["script", "style", "textarea", "title"])

export type TemplateChild =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | Node
  | TemplateResult
  | readonly TemplateChild[]

export interface TemplateResult {
  readonly strings: TemplateStringsArray
  readonly values: readonly unknown[]
  readonly [templateResultType]: true
}

export type TemplateView<State> = (state: State) => TemplateResult

export interface TemplateInstance<State> {
  readonly parentNode: Element | DocumentFragment
  /** Authored root nodes only; internal Comment boundaries are private. */
  readonly rootNodes: readonly Node[]
  readonly state: State
  update(state: State): void
  dispose(): void
}

export interface TemplateProgram<State> {
  mount(
    parentNode: Element | DocumentFragment,
    initialState: State,
    before?: Node | null
  ): TemplateInstance<State>
}

/**
Captures an HTML template and its live values without producing an intermediate
renderer tree.
*/
export function html(strings: TemplateStringsArray, ...values: readonly unknown[]): TemplateResult {
  return Object.freeze({
    strings,
    values: Object.freeze(values),
    [templateResultType]: true as const
  })
}

/**
Compiles a stable template shape into addressed operations on `@zavx0z/dom`.

The view is executed at mount and update time. Its top-level tagged-template
callsite must stay the same. Conditional structure belongs in child bindings,
where changing a nested template replaces only that bounded child region.
*/
export function compile<State>(view: TemplateView<State>): TemplateProgram<State> {
  if (typeof view !== "function") throw new TypeError("compile expects a template view function")

  return Object.freeze({
    mount(
      parentNode: Element | DocumentFragment,
      initialState: State,
      before: Node | null = null
    ): TemplateInstance<State> {
      assertContainer(parentNode)
      if (before && before.parentNode !== parentNode) {
        throw new Error("The insertion reference does not belong to the template container")
      }

      const document = parentNode.ownerDocument
      if (!document) throw new Error("The template container must have an ownerDocument")

      let currentState = initialState
      let disposed = false
      let internal: InternalTemplateInstance

      document.transaction(() => {
        internal = new InternalTemplateInstance(document, parentNode, before, expectTemplateResult(view(initialState)))
      })

      const instance: TemplateInstance<State> = {
        get parentNode() {
          return parentNode
        },
        get rootNodes() {
          return internal.rootNodes
        },
        get state() {
          return currentState
        },
        update(state: State) {
          if (disposed) throw new Error("Cannot update a disposed template instance")
          const result = expectTemplateResult(view(state))
          if (result.strings !== internal.strings) {
            throw new Error(
              "The top-level template shape changed; put conditional templates in a child interpolation"
            )
          }
          document.transaction(() => internal.update(result))
          currentState = state
        },
        dispose() {
          if (disposed) return
          document.transaction(() => internal.dispose())
          disposed = true
        }
      }

      return Object.freeze(instance)
    }
  })
}

type Segment = TaggedTemplateSegment
type SlotSegment = TaggedTemplateSlotSegment

type TextBlueprint = {
  readonly type: "text"
  readonly value: string
}

type ChildPartBlueprint = {
  readonly type: "part"
  readonly index: number
}

type AttributeBlueprint = {
  readonly name: string
  readonly segments: readonly Segment[] | null
}

type ElementBlueprint = {
  readonly type: "element"
  readonly tagName: string
  readonly attributes: readonly AttributeBlueprint[]
  readonly children: readonly BlueprintNode[]
}

type BlueprintNode = TextBlueprint | ChildPartBlueprint | ElementBlueprint

type TemplateBlueprint = {
  readonly children: readonly BlueprintNode[]
}

type ParseFrame = {
  readonly tagName: string | null
  readonly children: BlueprintNode[]
}

interface DynamicPart {
  update(values: readonly unknown[]): void
  dispose(): void
}

class InternalTemplateInstance {
  readonly strings: TemplateStringsArray
  private readonly start: Comment
  private readonly end: Comment
  private readonly parts: DynamicPart[] = []
  private disposed = false

  constructor(
    document: Document,
    parentNode: Element | DocumentFragment,
    before: Node | null,
    result: TemplateResult
  ) {
    this.strings = result.strings
    this.start = createTemplateAnchor(document, "template:start")
    this.end = createTemplateAnchor(document, "template:end")

    const fragment = document.createDocumentFragment()
    fragment.appendChild(this.start)
    const blueprint = getBlueprint(result.strings)
    for (const child of blueprint.children) instantiateBlueprint(document, fragment, child, this.parts)
    fragment.appendChild(this.end)
    for (const part of this.parts) part.update(result.values)
    parentNode.insertBefore(fragment, before)
  }

  get rootNodes(): readonly Node[] {
    const parent = this.start.parentNode
    if (!parent || this.end.parentNode !== parent) return Object.freeze([])
    const result: Node[] = []
    for (let node: Node | null = this.start.nextSibling; node && node !== this.end; node = node.nextSibling) {
      if (!(node instanceof Comment && templateAnchors.has(node))) result.push(node)
    }
    return Object.freeze(result)
  }

  update(result: TemplateResult): void {
    if (this.disposed) throw new Error("Cannot update a disposed nested template")
    if (result.strings !== this.strings) throw new Error("Nested template shape mismatch")
    for (const part of this.parts) part.update(result.values)
  }

  dispose(): void {
    if (this.disposed) return
    for (const part of this.parts) part.dispose()
    const parentNode = this.start.parentNode
    if (
      parentNode &&
      (parentNode instanceof Element || parentNode instanceof DocumentFragment) &&
      this.end.parentNode === parentNode
    ) {
      removeInclusiveRange(parentNode, this.start, this.end)
    }
    this.disposed = true
  }
}

class AttributePart implements DynamicPart {
  private readonly element: Element
  private readonly attributeName: string
  private readonly segments: readonly Segment[]
  private readonly wholeDynamicIndex: number | null

  constructor(element: Element, attributeName: string, segments: readonly Segment[]) {
    this.element = element
    this.attributeName = attributeName
    this.segments = segments
    const onlySegment = segments.length === 1 ? segments[0] : undefined
    this.wholeDynamicIndex = onlySegment?.type === "slot" ? onlySegment.index : null
  }

  update(values: readonly unknown[]): void {
    const isWholeDynamic = this.wholeDynamicIndex !== null
    const dynamicValue = isWholeDynamic ? values[this.wholeDynamicIndex!] : undefined

    if (isWholeDynamic && (dynamicValue === false || dynamicValue === null || dynamicValue === undefined)) {
      if (this.element.hasAttribute(this.attributeName)) this.element.removeAttribute(this.attributeName)
      return
    }

    let nextValue = ""
    if (isWholeDynamic && dynamicValue === true) {
      nextValue = ""
    } else {
      for (const segment of this.segments) nextValue += segmentValue(segment, values)
    }

    if (this.element.getAttribute(this.attributeName) !== nextValue) {
      this.element.setAttribute(this.attributeName, nextValue)
    }
  }

  dispose(): void {}
}

class EventPart implements DynamicPart {
  private readonly element: Element
  private readonly eventType: string
  private readonly index: number
  private listener: EventListener | null = null

  constructor(element: Element, attributeName: string, index: number) {
    this.element = element
    this.eventType = attributeName.slice(2).toLowerCase()
    this.index = index
  }

  update(values: readonly unknown[]): void {
    const nextValue = values[this.index]
    const nextListener = nextValue === null || nextValue === undefined || nextValue === false
      ? null
      : expectEventListener(this.eventType, nextValue)

    if (nextListener === this.listener) return
    if (this.listener) this.element.removeEventListener(this.eventType, this.listener)
    this.listener = nextListener
    if (this.listener) this.element.addEventListener(this.eventType, this.listener)
  }

  dispose(): void {
    if (!this.listener) return
    this.element.removeEventListener(this.eventType, this.listener)
    this.listener = null
  }
}

type RegionValue =
  | {readonly type: "empty"}
  | {readonly type: "text"; readonly node: Text}
  | {readonly type: "node"; readonly node: Node}
  | {readonly type: "template"; readonly instance: InternalTemplateInstance}
  | {readonly type: "array"; readonly items: ChildRegion[]}

class ChildPart implements DynamicPart {
  private readonly region: ChildRegion
  private readonly index: number

  constructor(anchor: Comment, index: number) {
    this.region = new ChildRegion(anchor)
    this.index = index
  }

  update(values: readonly unknown[]): void {
    this.region.commit(values[this.index])
  }

  dispose(): void {
    this.region.dispose()
  }
}

class ChildRegion {
  private readonly anchor: Comment
  private current: RegionValue = {type: "empty"}

  constructor(anchor: Comment) {
    this.anchor = anchor
  }

  commit(value: unknown, ancestors?: ReadonlySet<readonly unknown[]>): void {
    if (value === null || value === undefined || value === false || value === true) {
      if (this.current.type !== "empty") this.clear()
      return
    }

    if (isTemplateResult(value)) {
      if (this.current.type === "template" && this.current.instance.strings === value.strings) {
        this.current.instance.update(value)
        return
      }
      this.clear()
      const {document, parentNode} = this.insertionContext()
      this.current = {
        type: "template",
        instance: new InternalTemplateInstance(document, parentNode, this.anchor, value)
      }
      return
    }

    if (value instanceof Node) {
      if (this.current.type === "node" && this.current.node === value) {
        const parent = this.anchor.parentNode
        if (parent && value.parentNode !== parent) parent.insertBefore(value, this.anchor)
        return
      }
      this.clear()
      const {parentNode} = this.insertionContext()
      parentNode.insertBefore(value, this.anchor)
      this.current = {type: "node", node: value}
      return
    }

    if (Array.isArray(value)) {
      if (ancestors?.has(value)) throw new TypeError("Template child arrays cannot contain themselves")
      const nextAncestors = new Set(ancestors ?? [])
      nextAncestors.add(value)
      if (this.current.type !== "array") {
        this.clear()
        this.current = {type: "array", items: []}
      }
      const items = this.current.items
      const {document, parentNode} = this.insertionContext()
      for (let index = 0; index < value.length; index += 1) {
        let item = items[index]
        if (!item) {
          const anchor = createTemplateAnchor(document, "template:item")
          parentNode.insertBefore(anchor, this.anchor)
          item = new ChildRegion(anchor)
          items.push(item)
        }
        item.commit(value[index], nextAncestors)
      }
      while (items.length > value.length) items.pop()!.dispose()
      return
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      const nextText = String(value)
      if (this.current.type === "text") {
        if (this.current.node.data !== nextText) this.current.node.data = nextText
        return
      }
      this.clear()
      const {document, parentNode} = this.insertionContext()
      const node = document.createTextNode(nextText)
      parentNode.insertBefore(node, this.anchor)
      this.current = {type: "text", node}
      return
    }

    throw new TypeError(`Unsupported template child value: ${describeValue(value)}`)
  }

  dispose(): void {
    this.clear()
    const parent = this.anchor.parentNode
    if (parent) parent.removeChild(this.anchor)
  }

  private clear(): void {
    switch (this.current.type) {
      case "empty":
        return
      case "text":
      case "node": {
        const parent = this.anchor.parentNode
        if (parent && this.current.node.parentNode === parent) parent.removeChild(this.current.node)
        break
      }
      case "template":
        this.current.instance.dispose()
        break
      case "array":
        for (const item of this.current.items) item.dispose()
        break
    }
    this.current = {type: "empty"}
  }

  private insertionContext(): {document: Document; parentNode: Element | DocumentFragment} {
    const parentNode = this.anchor.parentNode
    const document = this.anchor.ownerDocument
    if (!parentNode || !(parentNode instanceof Element || parentNode instanceof DocumentFragment) || !document) {
      throw new Error("A template child region is detached")
    }
    return {document, parentNode}
  }
}

function instantiateBlueprint(
  document: Document,
  parentNode: Element | DocumentFragment,
  blueprint: BlueprintNode,
  parts: DynamicPart[]
): void {
  switch (blueprint.type) {
    case "text":
      parentNode.appendChild(document.createTextNode(blueprint.value))
      return
    case "part": {
      const anchor = createTemplateAnchor(document, "template:part")
      parentNode.appendChild(anchor)
      parts.push(new ChildPart(anchor, blueprint.index))
      return
    }
    case "element": {
      const element = document.createElement(blueprint.tagName)
      instantiateAttributes(element, blueprint.attributes, parts)
      for (const child of blueprint.children) instantiateBlueprint(document, element, child, parts)
      parentNode.appendChild(element)
    }
  }
}

function instantiateAttributes(
  element: Element,
  attributes: readonly AttributeBlueprint[],
  parts: DynamicPart[]
): void {
  for (const attribute of attributes) {
    if (attribute.segments === null) {
      element.setAttribute(attribute.name, "")
      continue
    }

    const dynamicSegments = attribute.segments.filter(
      (segment): segment is SlotSegment => segment.type === "slot"
    )

    if (dynamicSegments.length === 0) {
      if (attribute.name.startsWith("on")) {
        throw new Error(`Static event attribute ${attribute.name} cannot be executed`)
      }
      element.setAttribute(
        attribute.name,
        attribute.segments.map(segment => segment.type === "static" ? segment.value : "").join("")
      )
      continue
    }

    if (attribute.name.startsWith("on")) {
      if (attribute.segments.length !== 1 || dynamicSegments.length !== 1 || attribute.name.length === 2) {
        throw new Error(`Event binding ${attribute.name} must contain exactly one JavaScript listener`)
      }
      parts.push(new EventPart(element, attribute.name, dynamicSegments[0]!.index))
      continue
    }

    parts.push(new AttributePart(element, attribute.name, attribute.segments))
  }
}

function getBlueprint(strings: TemplateStringsArray): TemplateBlueprint {
  return getTaggedTemplateShape(strings, htmlBlueprintFrontend, parseBlueprint)
}

function parseBlueprint(strings: TemplateStringsArray): TemplateBlueprint {
  const source = joinTaggedTemplateSource(strings)

  const root: ParseFrame = {tagName: null, children: []}
  const stack: ParseFrame[] = [root]
  let index = 0

  while (index < source.length) {
    if (source[index] !== "<") {
      const nextTag = source.indexOf("<", index)
      const end = nextTag === -1 ? source.length : nextTag
      appendTextBlueprints(currentFrame(stack).children, source.slice(index, end), strings.length - 1)
      index = end
      continue
    }

    if (source.startsWith("<!--", index) || source.startsWith("<!", index)) {
      throw new Error("HTML comments and declarations are not supported by the direct DOM compiler yet")
    }

    const tagEnd = findTagEnd(source, index)
    const token = source.slice(index + 1, tagEnd - 1)
    index = tagEnd

    if (token.startsWith("/")) {
      const closingName = token.slice(1).trim().toLowerCase()
      if (!isStaticName(closingName)) throw new Error(`Invalid closing tag: ${token}`)
      const frame = stack.pop()
      if (!frame || frame.tagName !== closingName) {
        throw new Error(`Unexpected closing tag </${closingName}>`)
      }
      continue
    }

    const parsed = parseOpeningTag(token, strings.length - 1)
    const element: ElementBlueprint = {
      type: "element",
      tagName: parsed.tagName,
      attributes: Object.freeze(parsed.attributes),
      children: parsed.children
    }
    currentFrame(stack).children.push(element)

    if (!parsed.selfClosing && !voidElements.has(parsed.tagName)) {
      if (rawTextElements.has(parsed.tagName)) {
        throw new Error(`<${parsed.tagName}> raw-text parsing is not supported yet`)
      }
      stack.push({tagName: parsed.tagName, children: parsed.children})
    }
  }

  if (stack.length !== 1) {
    throw new Error(`Unclosed tag <${currentFrame(stack).tagName}>`)
  }

  return Object.freeze({children: Object.freeze(root.children)})
}

function parseOpeningTag(
  source: string,
  slotCount: number
): {tagName: string; attributes: AttributeBlueprint[]; children: BlueprintNode[]; selfClosing: boolean} {
  let cursor = 0
  while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1
  const nameStart = cursor
  while (cursor < source.length && !/[\s/>]/.test(source[cursor]!)) cursor += 1
  const tagName = source.slice(nameStart, cursor).toLowerCase()
  if (!isStaticName(tagName) || containsTaggedTemplateMarker(tagName)) {
    throw new Error("Element names must be static valid HTML names")
  }

  let selfClosing = false
  const attributes: AttributeBlueprint[] = []
  const attributeNames = new Set<string>()

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1
    if (cursor >= source.length) break
    if (source[cursor] === "/") {
      selfClosing = true
      cursor += 1
      while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1
      if (cursor !== source.length) throw new Error(`Unexpected content after / in <${tagName}>`)
      break
    }

    const attributeStart = cursor
    while (cursor < source.length && !/[\s=/]/.test(source[cursor]!)) cursor += 1
    const attributeName = source.slice(attributeStart, cursor).toLowerCase()
    if (!isStaticName(attributeName) || containsTaggedTemplateMarker(attributeName)) {
      throw new Error(`Attribute names in <${tagName}> must be static`)
    }
    if (attributeName.startsWith(".") || attributeName.startsWith("?") || attributeName.startsWith("@")) {
      throw new Error(`Non-HTML attribute directive ${attributeName} is not supported`)
    }
    if (attributeNames.has(attributeName)) throw new Error(`Duplicate attribute ${attributeName} in <${tagName}>`)
    attributeNames.add(attributeName)

    while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1
    if (source[cursor] !== "=") {
      if (attributeName.startsWith("on")) {
        throw new Error(`Static event attribute ${attributeName} cannot be executed`)
      }
      attributes.push({name: attributeName, segments: null})
      continue
    }

    cursor += 1
    while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1
    if (cursor >= source.length) throw new Error(`Missing value for ${attributeName} in <${tagName}>`)

    const quote = source[cursor]
    let value: string
    if (quote === '"' || quote === "'") {
      cursor += 1
      const valueStart = cursor
      while (cursor < source.length && source[cursor] !== quote) cursor += 1
      if (cursor >= source.length) throw new Error(`Unclosed quoted value for ${attributeName}`)
      value = source.slice(valueStart, cursor)
      cursor += 1
    } else {
      const valueStart = cursor
      while (cursor < source.length && !/\s/.test(source[cursor]!)) cursor += 1
      value = source.slice(valueStart, cursor)
    }

    attributes.push({name: attributeName, segments: Object.freeze(parseSegments(value, slotCount))})
  }

  return {tagName, attributes, children: [], selfClosing}
}

function appendTextBlueprints(target: BlueprintNode[], source: string, slotCount: number): void {
  for (const segment of parseSegments(source, slotCount)) {
    if (segment.type === "slot") target.push({type: "part", index: segment.index})
    else if (segment.value !== "") target.push({type: "text", value: segment.value})
  }
}

function parseSegments(source: string, slotCount: number): Segment[] {
  return parseTaggedTemplateSegments(source, slotCount, decodeEntities)
}

function findTagEnd(source: string, start: number): number {
  let quote: '"' | "'" | null = null
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor]
    if (quote) {
      if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === ">") return cursor + 1
  }
  throw new Error("Unclosed HTML tag")
}

function currentFrame(stack: readonly ParseFrame[]): ParseFrame {
  const frame = stack.at(-1)
  if (!frame) throw new Error("Invalid template parser state")
  return frame
}

function createTemplateAnchor(document: Document, data: string): Comment {
  const anchor = document.createComment(data)
  templateAnchors.add(anchor)
  return anchor
}

function isStaticName(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9:._-]*$/.test(value)
}

function segmentValue(segment: Segment, values: readonly unknown[]): string {
  if (segment.type === "static") return segment.value
  const value = values[segment.index]
  if (value === null || value === undefined || value === false) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint" || value === true) {
    return String(value)
  }
  throw new TypeError(`Attribute interpolation requires a primitive value, received ${describeValue(value)}`)
}

function expectEventListener(eventType: string, value: unknown): EventListener {
  if (typeof value === "function") return value as EventListener
  if (typeof value === "object" && value !== null && "handleEvent" in value) {
    const candidate = value as {handleEvent?: unknown}
    if (typeof candidate.handleEvent === "function") return value as EventListener
  }
  throw new TypeError(`on${eventType} requires a function or EventListener object`)
}

function expectTemplateResult(value: unknown): TemplateResult {
  if (!isTemplateResult(value)) throw new TypeError("A template view must return html`...`")
  return value
}

function isTemplateResult(value: unknown): value is TemplateResult {
  return typeof value === "object" && value !== null && (value as Partial<TemplateResult>)[templateResultType] === true
}

function assertContainer(value: unknown): asserts value is Element | DocumentFragment {
  if (!(value instanceof Element || value instanceof DocumentFragment)) {
    throw new TypeError("Templates mount into an Element or DocumentFragment")
  }
}

function removeInclusiveRange(
  expectedParent: Element | DocumentFragment,
  start: Node,
  end: Node
): void {
  if (start.parentNode !== expectedParent || end.parentNode !== expectedParent) return
  let current: Node | null = start
  while (current) {
    const nextNode: Node | null = current.nextSibling
    expectedParent.removeChild(current)
    if (current === end) return
    current = nextNode
  }
}

function decodeEntities(value: string): string {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos);/gi, (match, entity: string) => {
    switch (entity.toLowerCase()) {
      case "amp": return "&"
      case "lt": return "<"
      case "gt": return ">"
      case "quot": return '"'
      case "apos": return "'"
      default: {
        const numeric = entity[1]?.toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10)
        return Number.isFinite(numeric) && numeric >= 0 && numeric <= 0x10ffff
          ? String.fromCodePoint(numeric)
          : match
      }
    }
  })
}

function describeValue(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}
