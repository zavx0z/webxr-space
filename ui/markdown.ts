import MarkdownIt from "markdown-it"
import {parseFragment, serializeOuter, type DefaultTreeAdapterTypes} from "parse5"

type HtmlNode = DefaultTreeAdapterTypes.ChildNode
type HtmlElement = DefaultTreeAdapterTypes.Element

export type MarkdownInline = Readonly<{key: string; kind: "text" | "code"; value: string}>
  | Readonly<{key: string; kind: "strong" | "em" | "strike"; content: readonly MarkdownInline[]}>
  | Readonly<{key: string; kind: "break"}>
  | Readonly<{key: string; kind: "link"; value: string; content: readonly MarkdownInline[]; href: string; external: boolean}>
  | Readonly<{key: string; kind: "image"; src: string; alt: string; title?: string; width?: number; height?: number}>

export type MarkdownBlock = Readonly<{key: string; kind: "heading"; level: number; content: readonly MarkdownInline[]}>
  | Readonly<{key: string; kind: "paragraph"; content: readonly MarkdownInline[]}>
  | Readonly<{key: string; kind: "list"; ordered: boolean; start: number; items: readonly Readonly<{key: string; content: readonly MarkdownInline[]; blocks: readonly MarkdownBlock[]}>[]}>
  | Readonly<{key: string; kind: "code"; languageId: string; value: string}>
  | Readonly<{key: string; kind: "quote" | "group"; blocks: readonly MarkdownBlock[]; align?: "left" | "center" | "right"}>
  | Readonly<{key: string; kind: "rule"}>

export type MarkdownDocument = Readonly<{blocks: readonly MarkdownBlock[]}>
export type ParseMarkdownOptions = Readonly<{source: string; baseUrl?: string}>

const parser = new MarkdownIt("commonmark", {html: true})
const inlineTags = new Set(["a", "code", "strong", "b", "em", "i", "s", "del", "span", "img", "br"])

/** One browser-safe parser and inert HTML projection shared by UI and resource discovery. */
export function parseMarkdown(options: ParseMarkdownOptions): MarkdownDocument {
  if (typeof options.source !== "string") throw new TypeError("Markdown source must be text")
  const html = parseFragment(parser.render(options.source))
  return Object.freeze({blocks: blocks(html.childNodes, options.baseUrl, "block", 0)})
}

/** Returns only destinations admitted by the same parser as the rendered document. */
export function markdownDestinations(source: string): readonly string[] {
  const destinations = new Set<string>()
  const visitInline = (items: readonly MarkdownInline[]): void => {
    for (const item of items) {
      if (item.kind === "image") destinations.add(item.src)
      if (item.kind === "link") destinations.add(item.href)
      if ("content" in item) visitInline(item.content)
    }
  }
  const visitBlocks = (items: readonly MarkdownBlock[]): void => {
    for (const item of items) {
      if ("content" in item) visitInline(item.content)
      if ("blocks" in item) visitBlocks(item.blocks)
      if (item.kind === "list") for (const entry of item.items) {
        visitInline(entry.content)
        visitBlocks(entry.blocks)
      }
    }
  }
  visitBlocks(parseMarkdown({source}).blocks)
  return Object.freeze([...destinations])
}

function blocks(nodes: readonly HtmlNode[], baseUrl: string | undefined, prefix: string, depth: number): readonly MarkdownBlock[] {
  if (depth > 32) return []
  const result: MarkdownBlock[] = []
  let pending: HtmlNode[] = []
  const paragraph = () => {
    if (pending.length === 0) return
    const content = inlines(pending, baseUrl, `${prefix}:${result.length}`, depth + 1)
    if (content.some(item => item.kind !== "text" || item.value.trim() !== "")) {
      result.push(Object.freeze({key: `${prefix}:${result.length}`, kind: "paragraph", content}))
    }
    pending = []
  }
  for (const node of nodes) {
    if (!isElement(node) || inlineTags.has(node.tagName)) { pending.push(node); continue }
    paragraph()
    const key = `${prefix}:${result.length}`
    const tag = node.tagName
    if (/^h[1-6]$/u.test(tag)) {
      result.push(Object.freeze({key, kind: "heading", level: Number(tag[1]), content: inlines(node.childNodes, baseUrl, key, depth + 1)}))
    } else if (tag === "p") {
      result.push(Object.freeze({key, kind: "paragraph", content: inlines(node.childNodes, baseUrl, key, depth + 1)}))
    } else if (tag === "pre") {
      const code = node.childNodes.find(child => isElement(child) && child.tagName === "code")
      const languageId = code !== undefined && isElement(code)
        ? /(?:^|\s)language-(\S+)/u.exec(attribute(code, "class") ?? "")?.[1] ?? "plaintext"
        : "plaintext"
      result.push(Object.freeze({key, kind: "code", languageId, value: textContent(code ?? node).replace(/\n$/u, "")}))
    } else if (tag === "ul" || tag === "ol") {
      const items = node.childNodes.filter(isElement).filter(child => child.tagName === "li").map((item, index) => {
        const itemKey = `${key}:item:${index}`
        const parsed = blocks(item.childNodes, baseUrl, itemKey, depth + 1)
        const first = parsed[0]
        return Object.freeze({
          key: itemKey,
          content: first?.kind === "paragraph" ? first.content : Object.freeze([]),
          blocks: Object.freeze(first?.kind === "paragraph" ? parsed.slice(1) : [...parsed]),
        })
      })
      result.push(Object.freeze({key, kind: "list", ordered: tag === "ol", start: dimension(attribute(node, "start")) ?? 1, items: Object.freeze(items)}))
    } else if (tag === "blockquote" || tag === "div") {
      const align = attribute(node, "align")
      result.push(Object.freeze({
        key, kind: tag === "blockquote" ? "quote" : "group",
        blocks: blocks(node.childNodes, baseUrl, key, depth + 1),
        ...(align === "left" || align === "center" || align === "right" ? {align} : {}),
      }))
    } else if (tag === "hr") result.push(Object.freeze({key, kind: "rule"}))
    else result.push(Object.freeze({key, kind: "paragraph", content: Object.freeze([Object.freeze({key: `${key}:text`, kind: "text", value: serializeOuter(node)})])}))
  }
  paragraph()
  return Object.freeze(result)
}

function inlines(nodes: readonly HtmlNode[], baseUrl: string | undefined, prefix: string, depth: number): readonly MarkdownInline[] {
  if (depth > 32) return []
  const result: MarkdownInline[] = []
  for (const [index, node] of nodes.entries()) {
    const key = `${prefix}:inline:${index}`
    if (node.nodeName === "#text") {
      result.push(Object.freeze({key, kind: "text", value: (node as DefaultTreeAdapterTypes.TextNode).value}))
      continue
    }
    if (!isElement(node)) continue
    const tag = node.tagName
    if (tag === "code") result.push(Object.freeze({key, kind: "code", value: textContent(node)}))
    else if (["strong", "b", "em", "i", "s", "del"].includes(tag)) {
      const kind = tag === "strong" || tag === "b" ? "strong" : tag === "em" || tag === "i" ? "em" : "strike"
      result.push(Object.freeze({key, kind, content: inlines(node.childNodes, baseUrl, key, depth + 1)}))
    } else if (tag === "a") {
      const content = inlines(node.childNodes, baseUrl, key, depth + 1)
      const href = safeUrl(attribute(node, "href") ?? "", baseUrl)
      if (href === null) result.push(...content)
      else result.push(Object.freeze({key, kind: "link", value: textContent(node), content, href, external: /^https?:/u.test(href)}))
    } else if (tag === "img") {
      const src = safeUrl(attribute(node, "src") ?? "", baseUrl)
      if (src === null) continue
      const title = attribute(node, "title")
      const width = dimension(attribute(node, "width"))
      const height = dimension(attribute(node, "height"))
      result.push(Object.freeze({key, kind: "image", src, alt: attribute(node, "alt") ?? "",
        ...(title === null ? {} : {title}), ...(width === undefined ? {} : {width}), ...(height === undefined ? {} : {height}),
      }))
    } else if (tag === "br") result.push(Object.freeze({key, kind: "break"}))
    else if (tag === "span") result.push(...inlines(node.childNodes, baseUrl, key, depth + 1))
    else result.push(Object.freeze({key, kind: "text", value: serializeOuter(node)}))
  }
  return Object.freeze(result)
}

function isElement(node: HtmlNode): node is HtmlElement { return "tagName" in node }
function attribute(node: HtmlElement, name: string): string | null { return node.attrs.find(attr => attr.name === name)?.value ?? null }
function dimension(value: string | null): number | undefined {
  if (value === null || !/^\d+$/u.test(value)) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : undefined
}
function textContent(node: HtmlNode): string {
  const stack = [node]
  let value = ""
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current.nodeName === "#text") value += (current as DefaultTreeAdapterTypes.TextNode).value
    else if (isElement(current)) stack.push(...[...current.childNodes].reverse())
  }
  return value
}
function safeUrl(value: string, baseUrl: string | undefined): string | null {
  if (value.length === 0) return null
  try {
    const fallback = new URL("https://markdown.invalid/")
    const base = new URL(baseUrl ?? "", fallback)
    const url = new URL(value, base)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    const absolute = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu
    if (baseUrl === undefined && !absolute.test(value)) return value
    if (baseUrl !== undefined && !absolute.test(baseUrl) && !absolute.test(value) && url.origin === fallback.origin) {
      return `${url.pathname}${url.search}${url.hash}`
    }
    return url.href
  } catch { return null }
}
