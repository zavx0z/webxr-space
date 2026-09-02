import {describe, expect, test} from "bun:test"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {CodeEditorFixture} from "./code-editor.fixture.tsx"
import {CodeEditor} from "./code-editor.tsx"
import {createDocument} from "./document.fixture.ts"

describe("compiled production CodeEditor", () => {
  test("retains keyed line and token identities across source updates", () => {
    expect(isCompiledTemplate(CodeEditor)).toBe(true)
    expect(isCompiledTemplate(CodeEditorFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(CodeEditorFixture as any, {value: "const x = 1\nreturn x", readOnly: true, languageId: "typescript"})
    const owner = host.querySelector("section")!
    const firstLine = owner.querySelector('code [data-line-index="0"]')!
    const firstToken = firstLine.querySelector("span")!
    const secondLine = owner.querySelector('code [data-line-index="1"]')!

    root.render(CodeEditorFixture as any, {value: "const y = 2\nreturn y", readOnly: true, languageId: "typescript"})
    expect(host.querySelector("section")).toBe(owner)
    expect(owner.querySelector('code [data-line-index="0"]')).toBe(firstLine)
    expect(owner.querySelector('code [data-line-index="1"]')).toBe(secondLine)
    expect(firstLine.querySelector("span")).toBe(firstToken)
    expect(owner.textContent).toContain("const y = 2")
    expect(owner.className).toBe("")
    root.unmount()
  })

  test("uses exact editor geometry and class-free token styles", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(CodeEditorFixture as any, {value: "let value = true", readOnly: true, path: "sample.ts"})
    const owner = host.querySelector("section")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 640, height: 320}
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 520, height: 220})
    const line = owner.querySelector('code [data-line-index="0"]')!
    const token = owner.querySelector("[data-token-key]")!
    expect(frame.boxByNode.get(line)).toMatchObject({x: 53, y: 9, height: 16})
    expect(frame.boxByNode.get(token)?.x).toBe(53)
    expect(owner.getAttribute("data-language-id")).toBe("typescript")
    expect(owner.getAttribute("role")).toBe("region")
    expect(owner.getAttribute("aria-label")).toBe("Code editor")
    expect(owner.getAttribute("aria-readonly")).toBe("true")
    expect([...owner.querySelectorAll("*")].every(element => element.className === "")).toBe(true)
    renderer.dispose()
    root.unmount()
  })

  test("leaves document selection and clipboard behavior to the public platform owner", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(CodeEditorFixture as any, {value: "const answer = 42", readOnly: true})
    const owner = host.querySelector("section")!
    expect(owner.querySelector("pre code")).not.toBeNull()
    expect(owner.querySelector("textarea")).toBeNull()
    expect((document as unknown as {getSelection?: unknown}).getSelection).toBeUndefined()
    root.unmount()
  })

  test("preserves whitespace segment semantics while the renderer emits no whitespace paint", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(CodeEditorFixture as any, {
      value: "  token  ",
      readOnly: true,
      languageId: "supplied",
      tokens: [[{s: 2, e: 7, c: "k", fg: "#ff0000", bg: "#112233"}]]
    })
    const line = host.querySelector('code [data-line-index="0"]')!
    const segments = [...line.querySelectorAll("span")]
    expect(segments.map(segment => segment.textContent)).toEqual(["  ", "token", "  "])
    expect(segments.map(segment => segment.getAttribute("data-token-category"))).toEqual(["plain", "k", "plain"])
    expect(segments[0]!.getAttribute("style")).toContain("background: transparent")
    expect(segments[1]!.getAttribute("style")).toContain("background: #112233")
    expect(segments[2]!.getAttribute("style")).toContain("background: transparent")
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 640, height: 320}})
    const textItems = renderer.flush().displayList.filter(item => item.kind === "text")
    expect(textItems.some(item => item.kind === "text" && item.text.trim().length === 0)).toBe(false)
    expect(textItems.some(item => item.kind === "text" && item.text === "token")).toBe(true)
    renderer.dispose()
    root.unmount()
  })
})
