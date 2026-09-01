/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument, type HTMLButtonElement} from "@zavx0z/dom"
import {hudFrameDefaultProps, hudWindowDefaultProps, timelineDefaultProps} from "@ui/components/hud"
import {uiIcons} from "@ui/components/icons"
import {
  createCompiledHudFrameProductionStory,
  createCompiledHudWindowProductionStory,
  createCompiledTimelineProductionStory
} from "./compiled-hud-production-stories.tsx"

describe("compiled HUD production stories", () => {
  test("mounts hook-controlled Window with authored Pane body", () => {
    const mounted = createCompiledHudWindowProductionStory(createDocument(), hudWindowDefaultProps)
    const minimize = [...mounted.story.element.querySelectorAll("button")].find(button => button.getAttribute("title") === "Minimize") as HTMLButtonElement
    const minimizeIcon = minimize.querySelector("img")!
    expect(minimizeIcon.getAttribute("src")).toBe(uiIcons.minus)
    expect([...mounted.story.element.querySelectorAll("button")].find(button => button.title === "Pin")?.querySelector("img")?.getAttribute("src"))
      .toBe(uiIcons.pin)
    minimize.click()
    expect(minimize.textContent).toBe("Restore")
    expect(minimize.title).toBe("Restore")
    expect(minimize.querySelector("img")).toBe(minimizeIcon)
    expect(minimizeIcon.getAttribute("src")).toBe(uiIcons.plus)
    expect(mounted.story.element.textContent).toContain("Window body")
    expect(mounted.story.source.typescript).toContain("<HudWindow")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.typescript).not.toContain("{...props}")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("mounts Frame and Timeline exact final owners", () => {
    const frame = createCompiledHudFrameProductionStory(createDocument(), hudFrameDefaultProps)
    const timeline = createCompiledTimelineProductionStory(createDocument(), timelineDefaultProps)
    expect(frame.story.element.getAttribute("data-story-component")).toBe("hud-frame")
    expect(frame.story.element.textContent).toContain("Frame body")
    expect(timeline.story.element.getAttribute("data-story-component")).toBe("timeline")
    expect(timeline.story.element.querySelectorAll('[data-keyframe-key]')).toHaveLength(3)
    expect(timeline.story.element.querySelectorAll('[data-marker-key]')).toHaveLength(1)
    expect(timeline.story.source.typescript).toContain("<Timeline")
    expect(timeline.story.element.querySelector('[aria-label="Timeline transport"]')).toBeNull()
    expect(timeline.story.source.typescript).not.toContain("Css")
    expect(timeline.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    frame.story.dispose()
    timeline.story.dispose()
  })
})
