import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import {
  createCompiledButtonProductionStory,
  createCompiledIconButtonProductionStory
} from "./compiled-button-production-story.tsx"
import {
  story_icon_label_left,
  story_icon_label_right,
  story_icon_svg
} from "../subjects/components-foundation-button.ts"

describe("compiled IconButton production story", () => {
  test("mounts the exact public IconButton owner", () => {
    const mounted = createCompiledIconButtonProductionStory(createDocument(), {
      label: "Настройки",
      iconSrc: uiIcons.settings,
      variant: "text",
      title: "Настройки",
    })
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("icon-button")
    expect(mounted.story.element.getAttribute("aria-label")).toBe("Настройки")
    expect(mounted.story.element.querySelector("img")?.getAttribute("src")).toBe(uiIcons.settings)
    expect(mounted.story.source.typescript).toContain("<IconButton")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    mounted.story.dispose()
  })

  test("preserves exact Button icon sources in preview and executable source", () => {
    const mounted = createCompiledButtonProductionStory(createDocument(), {
      label: "Output",
      variant: "contained",
      startIcon: uiIcons.settings,
      title: "Icon left"
    })
    expect(mounted.story.element.querySelector("img")?.getAttribute("src")).toBe(uiIcons.settings)
    expect(mounted.story.source.typescript).toContain("startIcon={props.startIcon}")
    mounted.story.dispose()
  })

  test("routes the historical icon leaf to the exact public IconButton", async () => {
    const mounted = await story_icon_svg.create(createDocument())
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("icon-button")
    expect(mounted.story.props?.iconSrc).toBe(uiIcons.settings)
    expect(mounted.story.source.typescript).toContain("<IconButton")
    mounted.story.dispose()
  })

  test("uses SVG sources instead of label glyphs for both icon-label placements", async () => {
    const left = await story_icon_label_left.create(createDocument())
    const right = await story_icon_label_right.create(createDocument())
    expect(left.story.props?.startIcon).toBe(uiIcons.settings)
    expect(right.story.props?.endIcon).toBe(uiIcons.settings)
    expect(left.story.element.textContent).toBe("Output")
    expect(right.story.element.textContent).toBe("Output")
    left.story.dispose()
    right.story.dispose()
  })
})
