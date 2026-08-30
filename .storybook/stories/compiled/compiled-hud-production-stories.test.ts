/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument, type HTMLButtonElement} from "@zavx0z/dom"
import {hudFrameDefaultProps, hudWindowDefaultProps, timelineDefaultProps} from "@ui/components/hud"
import {
  createCompiledHudFrameProductionStory,
  createCompiledHudWindowProductionStory,
  createCompiledTimelineProductionStory
} from "./compiled-hud-production-stories.tsx"

describe("compiled HUD production stories", () => {
  test("mounts hook-controlled Window with authored Pane body", () => {
    const mounted = createCompiledHudWindowProductionStory(createDocument(), hudWindowDefaultProps)
    const minimize = [...mounted.story.element.querySelectorAll("button")].find(button => button.getAttribute("title") === "Minimize") as HTMLButtonElement
    minimize.click()
    expect(minimize.textContent).toBe("+")
    expect(minimize.title).toBe("Restore")
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
    expect(timeline.story.element.querySelectorAll('[data-track-key]')).toHaveLength(2)
    expect(timeline.story.source.typescript).toContain("<Timeline")
    const play = [...timeline.story.element.querySelectorAll("button")].find(button => button.textContent === "Play") as HTMLButtonElement
    play.click()
    expect(play.textContent).toBe("Pause")
    expect(timeline.story.source.typescript).not.toContain("Css")
    expect(timeline.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    frame.story.dispose()
    timeline.story.dispose()
  })
})
