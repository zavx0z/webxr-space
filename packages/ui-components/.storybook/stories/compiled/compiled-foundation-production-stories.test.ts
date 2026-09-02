/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {
  createCompiledBadgeProductionStory,
  createCompiledDividerProductionStory,
  createCompiledPanelProductionStory,
  createCompiledPaneProductionStory,
  createCompiledTypographyProductionStory,
} from "./compiled-foundation-production-stories.tsx"

describe("compiled foundation production stories", () => {
  test("mounts exact class-free owners without invented hook state", () => {
    const document = createDocument()
    const stories = [
      createCompiledPaneProductionStory(document, {content: "Area", variant: "filled"}),
      createCompiledPanelProductionStory(document, {label: "Properties", expanded: true}),
      createCompiledBadgeProductionStory(document, {label: "Ready", tone: "success"}),
      createCompiledTypographyProductionStory(document, {text: "Interface", variant: "body"}),
      createCompiledDividerProductionStory(document, {variant: "inset"}),
    ]

    expect(stories.map(({story}) => story.element.localName)).toEqual([
      "section",
      "section",
      "span",
      "span",
      "hr",
    ])
    for (const {story} of stories) {
      expect(story.element.className).toBe("")
      expect(story.source.html).not.toContain('class="')
      expect(story.source.typescript).toContain("createRoot")
      expect(story.source.typescript).not.toContain("Css")
      expect(story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
      story.dispose()
    }
    expect(stories[0]!.story.source.typescript).not.toContain("useState")
    expect(stories[1]!.story.source.typescript).toContain("useState")
  })
})
