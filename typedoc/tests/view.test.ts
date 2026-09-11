import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, DOMRect, HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {TypeDocProps} from "../typedoc/index.tsx"
import {contractDocument, proseDocument} from "./view.fixture.ts"

const root = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: ["typedoc", "markdown", "ui", "nodes"].map(path => resolve(root, path)),
}))

const {TypeDoc} = await import("../typedoc/index.tsx")
const template = TypeDoc as unknown as CompiledTemplate<TypeDocProps>
const {codeEditorPalette} = await import("@zavx0z/ui/views/code-editor")
const theme = await Bun.file(resolve(root, "ui/themes/theme.css")).text()

function mount(props: TypeDocProps = {document: contractDocument}) {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const component = createRoot(container)
  component.render(template, props)
  return {component, container, document}
}

describe("TypeDoc production view", () => {
  test("показывает структуру типов, optional/default и Markdown описаний и примеров", () => {
    const {component, container, document} = mount()
    try {
      const article = container.querySelector("article[data-typedoc]")!
      expect(container.children).toHaveLength(1)
      expect(article.ownerDocument).toBe(document)
      expect(article.querySelector("h1")?.textContent).toBe("DiagramNode")
      expect(article.querySelectorAll("[data-typedoc-declaration]")).toHaveLength(2)
      expect(article.querySelectorAll("[data-typedoc-member]")).toHaveLength(4)
      expect(article.querySelector("[data-typedoc-signature] pre code")?.textContent).toBe(contractDocument.declarations[0]!.signature)
      expect(article.querySelector('[data-typedoc-declaration="Selection"] [data-typedoc-label]')?.textContent).toBe("interface")
      const member = article.querySelector('[data-typedoc-member="collapsed"]')!
      expect(member.querySelector("h4")?.textContent).toBe("collapsed?")
      expect(member.querySelector("[data-typedoc-label]")?.textContent).toBe("Необязательное")
      expect(member.querySelector("[data-typedoc-type] pre code")?.textContent).toBe("boolean")
      expect(member.querySelector("[data-typedoc-default] pre code")?.textContent).toBe("false")
      expect(member.querySelector("[data-markdown] code")?.textContent).toBe("содержимое")
      const title = article.querySelector('[data-typedoc-member="title"]')!
      expect(title.querySelector("h4")?.textContent).toBe("title")
      expect(title.querySelector("[data-typedoc-default]")).toBeNull()
      expect(title.querySelector("strong")?.textContent).toBe("название")
      expect(title.querySelector("a")?.getAttribute("href")).toBe("https://example.com/docs")
      expect(article.querySelector('[data-typedoc-examples] [aria-readonly="true"]')?.textContent).toContain('<DiagramNode title="Пример" />')
    } finally {
      component.unmount()
    }
    expect(container.childNodes).toHaveLength(0)
  })

  test("навигация находит декларацию и вложенное поле по точному пути", () => {
    const ready: {handle: Parameters<NonNullable<TypeDocProps["onReady"]>>[0]} = {handle: null}
    let captured: Exclude<Parameters<NonNullable<TypeDocProps["onReady"]>>[0], null> | null = null
    const original = contractDocument.declarations[0]!
    const document = {
      ...contractDocument,
      declarations: [{
        ...original,
        members: [{
          name: "config",
          type: "Config",
          optional: false,
          description: "",
          children: [{
            name: "input.output",
            type: "string",
            optional: false,
            description: "Вложенное поле.",
          }],
        }],
      }],
    }
    const mounted = mount({
      document,
      onReady(value) { ready.handle = value },
    })
    const {component, container} = mounted
    try {
      const handle = ready.handle
      if (!handle) throw new Error("TypeDoc не передал navigation handle")
      captured = handle
      const declaration = container.querySelector('[data-typedoc-declaration="DiagramNodeProps"]') as HTMLElement
      const member = (path: readonly string[]) => {
        const target = [...container.querySelectorAll("[data-typedoc-member-path]")]
          .find(element => element.getAttribute("data-typedoc-member-path") === JSON.stringify(path))
        if (!(target instanceof HTMLElement)) throw new Error(`Не найдена цель TypeDoc: ${JSON.stringify(path)}`)
        return target
      }
      const config = member(["config"])
      const nested = member(["config", "input.output"])
      const calls: Array<Readonly<{target: string; options: ScrollIntoViewOptions}>> = []
      declaration.scrollIntoView = options => { calls.push({target: "declaration", options: options as ScrollIntoViewOptions}) }
      nested.scrollIntoView = options => { calls.push({target: "nested", options: options as ScrollIntoViewOptions}) }
      expect(handle.navigate("DiagramNodeProps", [])).toBe(true)
      expect(handle.navigate("DiagramNodeProps", ["config", "input.output"])).toBe(true)
      expect(handle.navigate("DiagramNodeProps", ["config.input", "output"])).toBe(false)
      expect(calls).toEqual([
        {target: "declaration", options: {block: "start", inline: "nearest"}},
        {target: "nested", options: {block: "start", inline: "nearest"}},
      ])
      container.getBoundingClientRect = () => new DOMRect(0, 100, 100, 100)
      declaration.getBoundingClientRect = () => new DOMRect(0, 0, 100, 300)
      config.getBoundingClientRect = () => new DOMRect(0, 80, 100, 180)
      nested.getBoundingClientRect = () => new DOMRect(0, 95, 100, 55)
      expect(handle.locate(container as unknown as Element)).toEqual({declaration: "DiagramNodeProps", path: ["config", "input.output"]})
      declaration.getBoundingClientRect = () => new DOMRect(0, 160, 100, 120)
      config.getBoundingClientRect = () => new DOMRect(0, 180, 100, 80)
      nested.getBoundingClientRect = () => new DOMRect(0, 200, 100, 20)
      expect(handle.locate(container as unknown as Element)).toEqual({declaration: "DiagramNodeProps", path: []})
      declaration.getBoundingClientRect = () => new DOMRect(0, 300, 100, 30)
      config.getBoundingClientRect = () => new DOMRect(0, 340, 100, 30)
      nested.getBoundingClientRect = () => new DOMRect(0, 380, 100, 30)
      expect(handle.locate(container as unknown as Element)).toBeNull()
    } finally {
      component.unmount()
    }
    expect(ready.handle).toBeNull()
    expect(captured?.navigate("DiagramNodeProps", [])).toBe(false)
  })

  test("сигнатуры, типы и defaults рисуются цветными TypeScript runs готового CodeEditor", () => {
    const {component, container, document} = mount()
    const renderer = createDocumentRenderer({
      document,
      root: container,
      viewport: {width: 800, height: 1800},
      styleSheets: [theme],
    })
    try {
      const frame = renderer.flush()
      for (const selector of [
        "[data-typedoc-signature]",
        '[data-typedoc-member="collapsed"] [data-typedoc-type]',
        "[data-typedoc-default]",
      ]) {
        const block = container.querySelector(selector)!
        const editor = block.querySelector('[aria-readonly="true"]')!
        expect(editor.getAttribute("data-language-id")).toBe("typescript")
        expect(editor.querySelector("pre code")?.getAttribute("contenteditable")).toBe("false")
        expect(editor.querySelector('[role="textbox"]')).toBeNull()
        expect(editor.querySelector("button")).toBeNull()
        const gutter = editor.querySelector("ul")!
        expect(gutter.hasAttribute("hidden")).toBe(true)
        const tokens = [...editor.querySelectorAll("[data-token-category]")]
        expect(tokens.length).toBeGreaterThan(0)
        const paint = frame.displayList.filter(item => item.kind === "text" && tokens.some(token => token.contains(item.node)))
        expect(paint.length).toBeGreaterThan(0)
        expect(paint.some(item => item.kind === "text" && item.color.toLowerCase() !== codeEditorPalette.editorForeground)).toBe(true)
        expect(frame.displayList.some(item => item.kind === "text" && gutter.contains(item.node))).toBe(false)
      }
      const signature = container.querySelector("[data-typedoc-signature]")!
      const runs = frame.displayList.filter(item => item.kind === "text" && signature.contains(item.node))
      const colors = new Set(runs.flatMap(item => item.kind === "text" ? [item.color] : []))
      expect(colors.size).toBeGreaterThan(1)
      expect(signature.querySelector('[data-token-category="k"]')?.textContent).toBe("type")
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("обновляет и переставляет декларации и поля с сохранением identity", () => {
    const {component, container} = mount()
    try {
      const article = container.querySelector("[data-typedoc]")!
      const declaration = article.querySelector('[data-typedoc-declaration="DiagramNodeProps"]')!
      const member = declaration.querySelector('[data-typedoc-member="collapsed"]')!
      const typeEditor = member.querySelector('[data-typedoc-type] [aria-readonly="true"]')!
      const signatureEditor = declaration.querySelector('[data-typedoc-signature] [aria-readonly="true"]')!
      const original = contractDocument.declarations[0]!
      component.render(template, {
        title: "Обновлённый контракт",
        document: {
          ...contractDocument,
          declarations: [contractDocument.declarations[1]!, {
            ...original,
            signature: "type DiagramNodeProps = { collapsed: string }",
            comment: {summary: "Новое **описание**.", examples: []},
            members: [{...original.members[1]!, optional: false, type: "string", defaultValue: ""}, original.members[0]!],
          }],
        },
      })
      expect(container.querySelector("[data-typedoc]")).toBe(article)
      expect(article.querySelector('[data-typedoc-declaration="DiagramNodeProps"]')).toBe(declaration)
      expect(declaration.querySelector('[data-typedoc-member="collapsed"]')).toBe(member)
      expect(member.querySelector('[data-typedoc-type] [aria-readonly="true"]')).toBe(typeEditor)
      expect(declaration.querySelector('[data-typedoc-signature] [aria-readonly="true"]')).toBe(signatureEditor)
      expect(article.querySelector("h1")?.textContent).toBe("Обновлённый контракт")
      expect(article.getAttribute("aria-label")).toBe("Обновлённый контракт")
      expect(article.querySelectorAll("[data-typedoc-declaration]")[0]?.getAttribute("data-typedoc-declaration")).toBe("Selection")
      expect(member.querySelector("h4")?.textContent).toBe("collapsed")
      expect(member.querySelector("[data-typedoc-type] pre code")?.textContent).toBe("string")
      expect(member.querySelector("[data-typedoc-default] pre code")?.textContent).toBe("")
      expect(declaration.querySelector('[data-typedoc-member="onChange"]')).toBeNull()
      expect(declaration.querySelector("[data-typedoc-examples]")).toBeNull()
      expect(declaration.querySelector("strong")?.textContent).toBe("описание")
      component.render(template, {document: {name: "Пустой контракт", declarations: []}})
      expect(container.querySelector("[data-typedoc]")).toBe(article)
      expect(article.querySelector("h1")?.textContent).toBe("Пустой контракт")
      expect(article.querySelectorAll("[data-typedoc-declaration]")).toHaveLength(0)
      expect(article.textContent).toContain("В этом документе нет деклараций типов.")
    } finally {
      component.unmount()
    }
  })

  test("Renderer переносит описания при resize, прокруткой владеет родитель", () => {
    const {component, container, document} = mount({document: proseDocument})
    container.setAttribute("style", "display:flex;flex-direction:column;width:800px;height:120px;overflow:auto")
    const renderer = createDocumentRenderer({document, root: container, viewport: {width: 1000, height: 800}})
    try {
      const article = container.querySelector("[data-typedoc]")!
      const paragraph = article.querySelector("[data-markdown] p")!
      const wide = renderer.flush()
      const wideHeight = wide.boxByNode.get(article)!.height
      const wideParagraphHeight = wide.boxByNode.get(paragraph)!.height
      expect(wide.boxByNode.get(article)!.width).toBe(800)
      container.setAttribute("style", "display:flex;flex-direction:column;width:240px;height:120px;overflow:auto")
      const narrow = renderer.flush()
      expect(container.querySelector("[data-typedoc]")).toBe(article)
      expect(narrow.boxByNode.get(article)!.width).toBe(240)
      expect(narrow.boxByNode.get(article)!.height).toBeGreaterThan(wideHeight)
      expect(narrow.boxByNode.get(paragraph)!.height).toBeGreaterThan(wideParagraphHeight)
      expect(narrow.scrolls.get(container)?.maxScrollTop).toBeGreaterThan(0)
      expect(narrow.scrolls.get(container)?.maxScrollLeft).toBe(0)
      expect(narrow.scrolls.has(article)).toBe(false)
      for (const section of [...article.querySelectorAll("[data-typedoc-member]"), ...article.querySelectorAll("[data-typedoc-signature]")]) {
        const bounds = narrow.boxByNode.get(section)!
        const text = narrow.displayList.filter(item => item.kind === "text" && section.contains(item.node))
        expect(text.length).toBeGreaterThan(0)
        for (const item of text) {
          if (item.kind !== "text") continue
          expect(item.x).toBeGreaterThanOrEqual(bounds.x)
          expect(item.x + (item.width ?? 0)).toBeLessThanOrEqual(bounds.x + bounds.width + 0.01)
          expect(item.y + item.lineHeight).toBeLessThanOrEqual(bounds.y + bounds.height + 0.01)
        }
      }
      container.setAttribute("style", "display:flex;flex-direction:column;width:800px;height:120px;overflow:auto")
      expect(renderer.flush().boxByNode.get(article)!.height).toBeCloseTo(wideHeight)
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })

  test("Renderer сохраняет длинные типы в локальной горизонтальной прокрутке", () => {
    const {component, container, document} = mount()
    container.setAttribute("style", "display:flex;flex-direction:column;width:240px;height:400px;overflow:auto")
    const renderer = createDocumentRenderer({document, root: container, viewport: {width: 240, height: 1800}})
    try {
      const article = container.querySelector("[data-typedoc]")!
      const type = container.querySelector('[data-typedoc-member="onChange"] [aria-readonly="true"]')!
      if (!(type instanceof HTMLElement)) throw new Error("Ожидался HTMLElement типа")
      const signature = container.querySelector('[data-typedoc-signature] [aria-readonly="true"]')!
      const frame = renderer.flush()
      expect(type.querySelector("pre code")?.textContent).toBe(contractDocument.declarations[0]!.members[2]!.type)
      expect(frame.boxByNode.get(article)!.width).toBe(240)
      expect(frame.scrolls.get(container)?.maxScrollLeft).toBe(0)
      expect(frame.scrolls.get(type)?.maxScrollLeft).toBeGreaterThan(0)
      expect(frame.scrolls.get(signature)?.maxScrollLeft).toBeGreaterThan(0)
      const before = frame.displayList.find(item => item.kind === "text" && type.contains(item.node))!
      type.scrollLeft = 80
      const scrolled = renderer.flush()
      expect(type.scrollLeft).toBe(80)
      const after = scrolled.displayList.find(item => item.kind === "text" && type.contains(item.node))!
      expect(after.x).toBeCloseTo(before.x - 80)
      expect(container.querySelector('[data-typedoc-member="onChange"] [aria-readonly="true"]')).toBe(type)
    } finally {
      renderer.dispose()
      component.unmount()
    }
  })
})
