/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {codeEditorCss} from "@ui/components/code-editor"
import {createCompiledCodeEditorProductionStory} from "./compiled-code-editor-production-story.tsx"

describe("compiled CodeEditor production story", () => {
  test("mounts the final source owner without controller or classes", () => {
    const mounted = createCompiledCodeEditorProductionStory(createDocument(), {
      value: "const value = 1",
      readOnly: true,
      languageId: "typescript"
    })
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("code-editor")
    expect(mounted.story.element.querySelectorAll('code [data-line-index="0"]')).toHaveLength(1)
    expect(mounted.story.source.css).toBe(codeEditorCss)
    expect(mounted.story.source.typescript).toContain("<CodeEditor")
    expect(mounted.story.source.typescript).toContain("codeEditorCss")
    expect(mounted.story.source.typescript).not.toContain("createCodeEditor")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })
})
