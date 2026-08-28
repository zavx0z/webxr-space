import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {codeEditorCss} from "@ui/components/code-editor"
import {
  codeEditorStoryDefaultArgs,
  createCodeEditorStory,
} from "./code-editor-story.ts"

describe("production CodeEditor Storybook adapter", () => {
  test("owns one production controller and its stable semantic section", () => {
    const story = createCodeEditorStory(createDocument())
    expect(story.element).toBe(story.controller.element)
    expect(story.element.localName).toBe("section")
    expect(story.element.getAttribute("aria-readonly")).toBe("true")
    expect(story.controller.props.value).toBe(codeEditorStoryDefaultArgs.value)
    expect(story.controller.props.languageId).toBe("typescript")
    expect(story.controller.refs.lines.size).toBe(4)
    expect(story.args).toEqual(codeEditorStoryDefaultArgs)
  })

  test("updates the same production tree and keyed lines", () => {
    const story = createCodeEditorStory(createDocument())
    const root = story.element
    const gutter = story.controller.refs.gutter
    const viewport = story.controller.refs.viewport
    const line = story.controller.refs.lines.get("0")!
    story.update({
      value: "const frame = 2\nframe += 1",
      languageId: "typescript",
      path: "frame.ts",
      showLineNumbers: false,
      title: "Frame source",
    })
    expect(story.element).toBe(root)
    expect(story.controller.refs.gutter).toBe(gutter)
    expect(story.controller.refs.viewport).toBe(viewport)
    expect(story.controller.refs.lines.get("0")).toBe(line)
    expect(story.controller.refs.lines.size).toBe(2)
    expect(gutter.hasAttribute("hidden")).toBeTrue()
    expect(root.title).toBe("Frame source")
    expect(story.args.path).toBe("frame.ts")
  })

  test("derives live semantic HTML, exact production CSS and executable TypeScript", () => {
    const story = createCodeEditorStory(createDocument())
    expect(story.source.html).toStartWith('<section aria-readonly="true"')
    expect(story.source.html).toContain('<ul aria-hidden="true" class="ui-code-editor__gutter">')
    expect(story.source.html).toContain('<pre class="ui-code-editor__viewport"><code class="ui-code-editor__code">')
    expect(story.source.html).toContain(">const</span>")
    expect(story.source.html).toContain("> output </span>")
    expect(story.source.css).toBe(codeEditorCss)
    expect(story.source.typescript).toContain('from "@ui/components/code-editor"')
    expect(story.source.typescript).toContain("readOnly: true")
    expect(story.source.typescript).not.toContain("textarea")
  })

  test("rejects malformed args atomically and disposes the same controller", () => {
    const story = createCodeEditorStory(createDocument())
    const args = story.args
    const root = story.element
    expect(() => story.update({...story.args, languageId: ""})).toThrow("languageId must not be empty")
    expect(() => story.update({...story.args, showLineNumbers: "yes" as unknown as boolean}))
      .toThrow("showLineNumbers must be a boolean")
    expect(story.args).toBe(args)
    expect(story.element).toBe(root)
    story.dispose()
    story.dispose()
    expect(() => story.update(args)).toThrow("CodeEditor story is disposed")
  })

  test("reuses the exact route through production CSS and public leaf", async () => {
    const source = await Bun.file(new URL("./code-editor-story.ts", import.meta.url)).text()
    const entry = await Bun.file(new URL("../../storybook/app/dom-entry.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {exports: Record<string, string>}
    expect(source).toContain('from "@ui/components/code-editor"')
    for (const forbidden of ["@engine/core", "@layout/core", "@ui/elements", "../code-editor", "UiSurface", "textarea"]) {
      expect(source).not.toContain(forbidden)
    }
    expect(entry).toContain('from "./compiled-code-editor-production-story.tsx"')
    expect(entry).toContain("return createCompiledCodeEditorProductionStory(document)")
    expect(manifest.exports["./dom/code-editor-story"]).toBeUndefined()
    expect(manifest.exports["./dom/code-editor"]).toBeUndefined()
    expect(manifest.exports["./code-editor"]).toBe("./code-editor-component.tsx")
    expect(requirements).toContain("UI-DOM-CODE-EDITOR-STORY-001")
  })
})
