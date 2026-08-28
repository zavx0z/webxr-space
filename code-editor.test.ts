import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLLIElement,
  HTMLUListElement,
  Text,
} from "@zavx0z/dom"
import {
  codeEditorCss,
  createCodeEditor,
} from "./code-editor.ts"

describe("production semantic DOM CodeEditor", () => {
  test("creates one standard section/gutter/pre/code tree with source-backed highlighting", () => {
    const controller = createCodeEditor(createDocument(), {
      value: "const output = 42\noutput.title = \"Rendered\"",
      readOnly: true,
      languageId: "typescript",
      path: "output.ts",
      title: "TypeScript source",
    })
    const {root, gutter, viewport, code, lineNumbers, lines, tokens} = controller.refs
    expect(controller.element).toBe(root)
    expect(root.localName).toBe("section")
    expect(root.getAttribute("aria-readonly")).toBe("true")
    expect(root.getAttribute("data-language-id")).toBe("typescript")
    expect(root.getAttribute("data-path")).toBe("output.ts")
    expect(root.title).toBe("TypeScript source")
    expect(root.childNodes).toEqual([gutter, viewport])
    expect(gutter).toBeInstanceOf(HTMLUListElement)
    expect(gutter.localName).toBe("ul")
    expect(gutter.getAttribute("aria-hidden")).toBe("true")
    expect(viewport.localName).toBe("pre")
    expect(viewport.childNodes).toEqual([code])
    expect(code.localName).toBe("code")
    expect(lineNumbers.size).toBe(2)
    expect(lines.size).toBe(2)
    expect(tokens.size).toBeGreaterThan(4)
    expect(lineNumbers.get("0")).toBeInstanceOf(HTMLLIElement)
    expect(lineNumbers.get("0")!.textContent).toBe("1")
    expect(lines.get("0")!.textContent).toBe("const output = 42")
    expect([...tokens.values()].some((token) => token.getAttribute("style")?.includes("color:#"))).toBeTrue()
  })

  test("gives supplied Tokens priority and preserves explicit foreground/background", () => {
    const controller = createCodeEditor(createDocument(), {
      value: "plain token",
      readOnly: true,
      languageId: "typescript",
      tokens: [[{s: 6, e: 11, c: "custom.scope", fg: "#abc", bg: "#102030"}]],
    })
    expect(controller.refs.root.getAttribute("data-language-id")).toBe("typescript")
    expect(controller.refs.tokens.size).toBe(2)
    const explicit = controller.refs.tokens.get("0:token:6:11:custom.scope")!
    expect(explicit.textContent).toBe("token")
    expect(explicit.getAttribute("style")).toBe("color:#aabbcc;background:#102030")
    const gap = controller.refs.tokens.get("0:gap:0:6:plain")!
    expect(gap.textContent).toBe("plain ")
    expect(gap.getAttribute("data-token-category")).toBe("plain")
  })

  test("retains keyed line, number, token and Text identities across updates", () => {
    const controller = createCodeEditor(createDocument(), {
      value: "alpha\nbeta",
      readOnly: true,
      tokens: [
        [{s: 0, e: 5, c: "k"}],
        [{s: 0, e: 4, c: "s"}],
      ],
    })
    const firstLine = controller.refs.lines.get("0")!
    const secondLine = controller.refs.lines.get("1")!
    const firstNumber = controller.refs.lineNumbers.get("0")!
    const firstNumberText = firstNumber.firstChild
    const firstToken = controller.refs.tokens.get("0:token:0:5:k")!
    const firstTokenText = firstToken.firstChild

    controller.update({
      value: "omega\nbeta\ngamma",
      readOnly: true,
      showLineNumbers: false,
      tokens: [
        [{s: 0, e: 5, c: "k"}],
        [{s: 0, e: 4, c: "s"}],
        [{s: 0, e: 5, c: "n"}],
      ],
    })
    expect(controller.refs.lines.get("0")).toBe(firstLine)
    expect(controller.refs.lines.get("1")).toBe(secondLine)
    expect(controller.refs.lineNumbers.get("0")).toBe(firstNumber)
    expect(firstNumber.firstChild).toBe(firstNumberText)
    expect(controller.refs.tokens.get("0:token:0:5:k")).toBe(firstToken)
    expect(firstToken.firstChild).toBe(firstTokenText)
    expect(firstToken.textContent).toBe("omega")
    expect(controller.refs.lines.size).toBe(3)
    expect(controller.refs.gutter.hasAttribute("hidden")).toBeTrue()

    controller.update({
      value: "final",
      readOnly: true,
      tokens: [[{s: 0, e: 5, c: "k"}]],
    })
    expect(controller.refs.lines.get("0")).toBe(firstLine)
    expect(controller.refs.lines.has("1")).toBeFalse()
    expect(controller.refs.tokens.has("1:token:0:4:s")).toBeFalse()
  })

  test("normalizes line endings and resolves language from path with plaintext fallback", () => {
    const css = createCodeEditor(createDocument(), {
      value: "a {\r\n  color: red\r}",
      readOnly: true,
      path: "theme.css",
    })
    expect(css.props.value).toBe("a {\n  color: red\n}")
    expect(css.refs.root.getAttribute("data-language-id")).toBe("css")
    expect(css.refs.lines.size).toBe(3)

    const swatch = createCodeEditor(createDocument(), {
      value: ".pane { background: rgba(12, 18, 30, 0.78); }",
      readOnly: true,
      path: "swatch.css",
    })
    expect([...swatch.refs.tokens.values()].some((token) =>
      token.getAttribute("style")?.includes("background:rgba(12, 18, 30, 0.78)"),
    )).toBeTrue()

    const plain = createCodeEditor(createDocument(), {value: "value", readOnly: true})
    expect(plain.refs.root.getAttribute("data-language-id")).toBe("plaintext")
  })

  test("rejects invalid props and Tokens before mutating the stable tree", () => {
    const controller = createCodeEditor(createDocument(), {
      value: "alpha",
      readOnly: true,
      tokens: [[{s: 0, e: 5, c: "k"}]],
    })
    const props = controller.props
    const line = controller.refs.lines.get("0")!
    const token = controller.refs.tokens.get("0:token:0:5:k")!
    expect(() => controller.update({value: "alpha", readOnly: false as true}))
      .toThrow("readOnly must be true")
    expect(() => controller.update({value: "alpha\nbeta", readOnly: true, tokens: [[]]}))
      .toThrow("exactly one row per line")
    expect(() => controller.update({value: "alpha", readOnly: true, tokens: [[
      {s: 0, e: 3, c: "k"},
      {s: 2, e: 5, c: "s"},
    ]]})).toThrow("tokens overlap")
    expect(() => controller.update({value: "alpha", readOnly: true, tokens: [[
      {s: 0, e: 5, c: "k", fg: "red"},
    ]]})).toThrow("foreground must be a hex color")
    expect(controller.props).toBe(props)
    expect(controller.refs.lines.get("0")).toBe(line)
    expect(controller.refs.tokens.get("0:token:0:5:k")).toBe(token)
  })

  test("disposes without removing the consumer-owned section", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createCodeEditor(document, {value: "value", readOnly: true})
    document.appendChild(host)
    host.appendChild(controller.element)
    controller.dispose()
    controller.dispose()
    expect(controller.element.parentNode).toBe(host)
    expect(() => controller.update({value: "next", readOnly: true}))
      .toThrow("CodeEditor controller is disposed")
  })

  test("publishes one exact DOM-only leaf without clipboard or retained owners", async () => {
    const source = await Bun.file(new URL("./code-editor.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./dom/requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("./package.json", import.meta.url)).json() as {exports: Record<string, string>}
    expect(codeEditorCss).toContain("overflow: auto")
    expect(codeEditorCss).toContain(".ui-code-editor__line")
    expect(codeEditorCss).toContain("flex-direction: row")
    expect(codeEditorCss).toContain("flex-shrink: 0")
    expect(codeEditorCss).toContain("scrollbar-width: thin")
    expect(codeEditorCss).toContain("white-space: nowrap")
    expect(codeEditorCss).not.toContain("&")
    for (const forbidden of [
      "@engine/core", "@layout/core", "@ui/elements", "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"), "UiSurface", "textarea",
      "clipboard", "selection", "caret", "dispatchEvent", "../code-editor",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./code-editor"]).toBe("./code-editor-component.tsx")
    expect(Object.keys(manifest.exports).some((key) => key.startsWith("./dom/"))).toBeFalse()
    expect(requirements).toContain("UI-DOM-CODE-EDITOR-001")
    expect(requirements).toContain("caret, selection, clipboard")
  })
})
