import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {parseMarkdown} from "../markdown.ts"
import type {MarkdownProps} from "../views/markdown.tsx"
import {createDocumentRenderer} from "../../renderer/src/index.ts"

const root = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "ui")],
}))

const {Markdown} = await import("../views/markdown.tsx")
const template = Markdown as unknown as CompiledTemplate<MarkdownProps>

function mount(props: MarkdownProps) {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const component = createRoot(container)
  component.render(template, props)
  return {component, container, document}
}

describe("Markdown production owner", () => {
  test("lays out a loaded HTML image inside the production article", () => {
    const {component, container, document} = mount({
      source: '# Title\n\n<div align="center">\n  <img src="docs/image.gif" width="444" />\n</div>\n\n**Text**',
      baseUrl: "/resources/project/",
    })
    const measured: string[] = []
    const renderer = createDocumentRenderer({
      document,
      root: container,
      viewport: {width: 600, height: 800},
      imageMeasurer: {measureImage(src) {
        measured.push(src)
        return {width: 640, height: 360}
      }},
    })
    try {
      const frame = renderer.flush()
      const image = container.querySelector("img")!
      expect(measured).toContain("/resources/project/docs/image.gif")
      expect(frame.boxByNode.get(image)).toMatchObject({width: 444, height: 249.75})
      expect(frame.displayList.find(item => item.kind === "image")).toMatchObject({width: 444, height: 249.75})
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("changes the wrapping policy without replacing the article or code block", () => {
    const source = "Text with `inline code`.\n\n```ts\nconst value = 1\n```"
    const {component, container} = mount({source})
    try {
      const article = container.querySelector("article")!
      const paragraph = article.querySelector("p")
      const editor = article.querySelector('section[aria-readonly="true"]')
      expect(article.getAttribute("data-wrap")).toBe("true")
      component.render(template, {source, wrap: false})
      expect(container.querySelector("article")).toBe(article)
      expect(article.getAttribute("data-wrap")).toBe("false")
      expect(article.querySelector("p")).toBe(paragraph)
      expect(article.querySelector('section[aria-readonly="true"]')).toBe(editor)
      component.render(template, {source, wrap: true})
      expect(article.getAttribute("data-wrap")).toBe("true")
      expect(article.querySelector("p")).toBe(paragraph)
    } finally {
      component.unmount()
    }
  })

  test("wrap actually changes paragraph height and horizontal overflow", () => {
    const source = "Начало абзаца с `inline code` и продолжением, которое должно переноситься по словам в пределах узкой области документа."
    const {component, container, document} = mount({source, wrap: true})
    container.setAttribute("style", "width:180px")
    const renderer = createDocumentRenderer({document, root: container, viewport: {width: 180, height: 300}})
    try {
      const article = container.querySelector("article")!
      const paragraph = article.querySelector("p")!
      const wrapped = renderer.flush()
      const wrappedHeight = wrapped.boxByNode.get(paragraph)!.height
      expect(wrappedHeight).toBeGreaterThan(36)
      expect(wrapped.scrolls.get(article)?.maxScrollLeft).toBe(0)
      component.render(template, {source, wrap: false})
      const unwrapped = renderer.flush()
      expect(unwrapped.boxByNode.get(paragraph)!.height).toBeLessThan(wrappedHeight)
      expect(unwrapped.scrolls.get(article)?.maxScrollLeft).toBeGreaterThan(0)
      expect(article.querySelector("p")).toBe(paragraph)
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("renders semantic heading levels, paragraphs, lists and the production code viewer", () => {
    const source = [
      ...Array.from({length: 6}, (_, index) => `${"#".repeat(index + 1)} Heading ${index + 1}\n`),
      "Text with `code` and [owner](./OWNER.md).",
      "",
      "- first",
      "- second",
      "",
      "1. ordered first",
      "2. ordered second",
      "",
      "```ts",
      "const value = 1",
      "```",
    ].join("\n")
    const {component, container, document} = mount({
      source,
      title: "Документ",
      baseUrl: "https://example.com/readme/",
    })
    try {
      const article = container.querySelector("article")!
      expect(article.ownerDocument).toBe(document)
      expect(article.getAttribute("title")).toBe("Документ")
      for (let level = 1; level <= 6; level++) {
        expect(article.querySelector(`h${level}`)?.textContent).toBe(`Heading ${level}`)
      }
      expect(article.querySelector("p")?.textContent).toBe("Text with code and owner.")
      expect(article.querySelector("code")?.textContent).toBe("code")
      expect(article.querySelector("a")?.getAttribute("href")).toBe("https://example.com/readme/OWNER.md")
      expect(article.querySelector("ul")?.querySelectorAll("li")).toHaveLength(2)
      expect(article.querySelector("ol")?.querySelectorAll("li")).toHaveLength(2)
      expect(article.querySelector('[aria-readonly="true"]')?.textContent).toContain("const value = 1")
      expect(article.querySelector("[data-token-category]")).not.toBeNull()
      expect(component.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    } finally {
      component.unmount()
    }
    expect(container.childNodes).toHaveLength(0)
  })

  test("keeps embedded HTML inert and rejects executable destinations", () => {
    const {component, container} = mount({
      source: "<script>globalThis.compromised = true</script>\n\n[bad](javascript:alert(1))\n\n[also bad](data:text/html,test)",
    })
    try {
      expect(container.querySelectorAll("p")).toHaveLength(3)
      expect(container.textContent).toContain("<script>")
      expect(container.querySelector("script")).toBeNull()
      expect(container.querySelector("a")).toBeNull()
    } finally {
      component.unmount()
    }
  })

  test("fenced code preserves the width of whitespace between highlighted tokens", () => {
    const {component, container, document} = mount({source: "```typescript\nconst value = 1\n```"})
    const renderer = createDocumentRenderer({
      document,
      root: container,
      viewport: {width: 600, height: 400},
    })
    try {
      const frame = renderer.flush()
      const spaces = [...container.querySelectorAll("[data-token-key]")]
        .filter(token => token.textContent.length > 0 && token.textContent.trim() === "")
      expect(spaces.length).toBeGreaterThan(0)
      for (const token of spaces) {
        expect(frame.boxByNode.get(token)?.width).toBeGreaterThan(0)
      }
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("short fenced code has natural height and no horizontal scrollbar", () => {
    const {component, container, document} = mount({source: "```typescript\nconst a = 1\n\nconst b = 2\n```"})
    const renderer = createDocumentRenderer({document, root: container, viewport: {width: 560, height: 400}})
    try {
      const frame = renderer.flush()
      const editor = container.querySelector('section[aria-readonly="true"]')!
      const pre = editor.querySelector("pre")!
      const code = pre.querySelector("code")!
      const editorBox = frame.boxByNode.get(editor)!
      const preBox = frame.boxByNode.get(pre)!
      const codeBox = frame.boxByNode.get(code)!
      expect(code.querySelectorAll("[data-line-index]")).toHaveLength(3)
      expect(codeBox.height).toBe(48)
      expect(editorBox.height).toBe(
        codeBox.height + preBox.padding.top + preBox.padding.bottom +
        editorBox.border.widths.top + editorBox.border.widths.bottom,
      )
      expect(frame.scrolls.get(editor)?.maxScrollLeft).toBe(0)
      expect(frame.scrolls.get(editor)?.maxScrollTop).toBe(0)
      expect(frame.displayList.some(item => item.node === editor && item.key.startsWith("ua:scrollbar-"))).toBe(false)
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("the shared editor retains fixed viewports and real overflow on both axes", async () => {
    const {CodeEditor} = await import("../views/code-editor.tsx")
    const document = createDocument()
    const container = document.createElement("div")
    document.append(container)
    const component = createRoot(container)
    const value = Array.from({length: 30}, () => "long line ".repeat(20)).join("\n")
    component.render(CodeEditor as unknown as CompiledTemplate<import("../views/code-editor.tsx").CodeEditorProps>, {
      value,
      readOnly: true,
    })
    const renderer = createDocumentRenderer({document, root: container, viewport: {width: 600, height: 400}})
    try {
      const frame = renderer.flush()
      const editor = container.querySelector("section")!
      expect(frame.boxByNode.get(editor)?.height).toBe(220)
      expect(frame.scrolls.get(editor)?.maxScrollLeft).toBeGreaterThan(0)
      expect(frame.scrolls.get(editor)?.maxScrollTop).toBeGreaterThan(0)
      const keys = frame.displayList.filter(item => item.node === editor).map(item => item.key)
      expect(keys).toContain("ua:scrollbar-x-thumb")
      expect(keys).toContain("ua:scrollbar-y-thumb")
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("updates source and link base while preserving the article in the same Document", () => {
    const {component, container, document} = mount({source: "# First\n\n[owner](./OWNER.md)"})
    try {
      const article = container.querySelector("article")!
      component.render(template, {source: "# Second\n\n[owner](./OWNER.md)", baseUrl: "https://example.com/a/"})
      expect(container.querySelector("article")).toBe(article)
      expect(article.ownerDocument).toBe(document)
      expect(article.querySelector("h1")?.textContent).toBe("Second")
      expect(article.querySelector("a")?.getAttribute("href")).toBe("https://example.com/a/OWNER.md")
      const otherProjection = document.createElement("section")
      container.append(otherProjection)
      otherProjection.append(article)
      component.render(template, {source: "# Second\n\n[owner](./OWNER.md)", baseUrl: "https://example.com/b/"})
      expect(article.parentNode).toBe(otherProjection)
      expect(article.ownerDocument).toBe(document)
      expect(article.querySelector("a")?.getAttribute("href")).toBe("https://example.com/b/OWNER.md")
      component.render(template, {source: ""})
      expect(container.querySelector("article")).toBe(article)
      expect(article.textContent).toBe("")
      expect(article.querySelector("[data-markdown-block]")).toBeNull()
    } finally {
      component.unmount()
    }
  })

  test("Markdown and CodeEditor stories reuse one compiled mounting and source lifecycle", async () => {
    const {createCompiledMarkdownProductionStory, createCompiledMarkdownWrappingStory} = await import(
      "../.storybook/stories/compiled/compiled-markdown-production-story.tsx"
    )
    const {createCompiledCodeEditorProductionStory} = await import(
      "../.storybook/stories/compiled/compiled-code-editor-production-story.tsx"
    )
    const document = createDocument()
    const host = document.createElement("div")
    document.append(host)
    for (const create of [
      createCompiledMarkdownProductionStory,
      createCompiledMarkdownWrappingStory,
      createCompiledCodeEditorProductionStory,
    ]) {
      const {story} = create(document)
      host.append(story.element)
      expect(story.element.ownerDocument).toBe(document)
      expect(story.source.html).toContain("data-story-component")
      expect(story.source.typescript).toContain("createRoot(container).render(")
      expect(story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
      story.dispose()
      expect(host.childNodes).toHaveLength(0)
    }
  })
})

describe("shared Markdown parser", () => {
  test("recognizes code inside link labels, emphasis and safe raw HTML images", () => {
    const parsed = parseMarkdown({source: [
      '<div align="center"><img src="docs/img/metafor.gif" alt="Обзор" width="444" onerror="alert(1)"></div>',
      "",
      "**Жирный** и *курсив*, [`docs/README.md`](docs/README.md).",
    ].join("\n")})
    expect(parsed.blocks[0]).toMatchObject({kind: "group", align: "center"})
    const serialized = JSON.stringify(parsed)
    expect(serialized).toContain('"kind":"image"')
    expect(serialized).toContain('"width":444')
    expect(serialized).not.toContain("onerror")
    expect(serialized).toContain('"kind":"strong"')
    expect(serialized).toContain('"kind":"em"')
    expect(serialized).toContain('"kind":"code","value":"docs/README.md"')
  })

  test("renders nested code links and emphasis as semantic nodes", () => {
    const {component, container} = mount({source: "**Bold** *Italic* [`docs/README.md`](./docs/README.md)"})
    try {
      expect(container.querySelector("strong")?.textContent).toBe("Bold")
      expect(container.querySelector("em")?.textContent).toBe("Italic")
      expect(container.querySelector("a")?.querySelector("code")?.textContent).toBe("docs/README.md")
      expect(container.textContent).not.toContain("`")
      expect(container.textContent).not.toContain("**")
    } finally { component.unmount() }
  })
  test("preserves block order, CRLF code contents and relative links", () => {
    const parsed = parseMarkdown({source: "# Title\r\n\r\nText [link](./README.md)\r\n\r\n- one\r\n\r\n1. two\r\n\r\n```unknown\r\na\r\nb\r\n```"})
    expect(parsed.blocks.map(block => block.kind)).toEqual(["heading", "paragraph", "list", "list", "code"])
    expect(parsed.blocks[4]).toMatchObject({kind: "code", languageId: "unknown", value: "a\nb"})
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.blocks)).toBe(true)
    const paragraph = parsed.blocks[1]
    if (paragraph?.kind !== "paragraph") throw new Error("Expected paragraph")
    expect(paragraph.content[1]).toMatchObject({kind: "link", href: "./README.md"})
  })

  test("keeps a final unclosed code fence and empty input deterministic", () => {
    expect(parseMarkdown({source: "\n\r\n"}).blocks).toEqual([])
    expect(parseMarkdown({source: "```\nvalue"}).blocks[0]).toMatchObject({
      kind: "code", languageId: "plaintext", value: "value",
    })
  })
})
