/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createCompiledReadonlyControlProductionStory} from "./compiled-readonly-control-production-story.tsx"

describe("compiled ReadonlyControl production story", () => {
  test("mounts the exact owner and publishes its direct public source", () => {
    const mounted = createCompiledReadonlyControlProductionStory(createDocument(), {
      value: "Output",
      title: "Read-only value"
    })
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("readonly-control")
    expect(mounted.story.element.textContent).toBe("Output")
    expect(mounted.story.source.typescript)
      .toContain('import {ReadonlyControl} from "@ui/components/controls/readonly-control"')
    expect(mounted.story.source.typescript).toContain("<ReadonlyControl")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })
})
