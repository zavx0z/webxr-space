import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {
  createCompiledNotificationProductionStory,
  createCompiledStatusBarProductionStory
} from "./compiled-status-production-stories.tsx"

describe("compiled status production stories", () => {
  test("mounts exact StatusBar and Notification owners", () => {
    const status = createCompiledStatusBarProductionStory(createDocument(), {
      start: [{id: "state", text: "Ready", highlighted: true}],
      end: [{id: "version", text: "5.2.0"}]
    })
    const notification = createCompiledNotificationProductionStory(createDocument(), {
      heading: "Export",
      message: "Finished",
      detail: "3 files",
      tone: "success",
      dismissible: true
    })
    expect(status.story.element.getAttribute("data-story-component")).toBe("status-bar")
    expect(status.story.element.textContent).toContain("Ready")
    expect(status.story.element.textContent).toContain("5.2.0")
    expect(status.story.source.typescript).toContain("<StatusBar")
    expect(notification.story.element.getAttribute("data-story-component")).toBe("notification")
    expect(notification.story.element.getAttribute("role")).toBe("status")
    expect(notification.story.source.typescript).toContain("<Notification")
    status.story.dispose()
    notification.story.dispose()
  })
})
