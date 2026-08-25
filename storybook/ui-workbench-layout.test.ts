import {describe, expect, test} from "bun:test"
import {planNodeComponentStorybookFrames} from "./ui-workbench-layout.ts"
import {nodeStorybookWorkbenchStoryRoute} from "./ui-navigation.ts"

describe("@nodes/ui storybook on shared @zavx0z/storybook shell", () => {
  test("preserves preview, dock and source panel on package and component overviews", () => {
    const root = planNodeComponentStorybookFrames(1920, 1080, nodeStorybookWorkbenchStoryRoute(""))
    const parameter = planNodeComponentStorybookFrames(1920, 1080, nodeStorybookWorkbenchStoryRoute("parameter"))
    const socket = planNodeComponentStorybookFrames(1920, 1080, nodeStorybookWorkbenchStoryRoute("socket"))
    const editor = planNodeComponentStorybookFrames(1920, 1080, nodeStorybookWorkbenchStoryRoute("node-editor"))
    expect(root.storyPreview).toEqual(socket.storyPreview)
    expect(parameter.storyPreview).toEqual(socket.storyPreview)
    expect(parameter.story.visible).not.toBeFalse()
    expect(parameter.dock.visible).not.toBeFalse()
    expect(root.story.visible).not.toBeFalse()
    expect(root.dock.visible).not.toBeFalse()
    expect(editor.editor.visible).not.toBeFalse()
    expect(editor.story.visible).not.toBeFalse()
    expect(editor.dock.visible).not.toBeFalse()
  })

  test("gives editor the full-viewport desktop preview region", () => {
    const frames = planNodeComponentStorybookFrames(1920, 1080, "node-editor/scene/default")
    expect(frames.catalog).toEqual({x: 3, y: 3, w: 210, h: 1074})
    expect(frames.section).toEqual({x: 214, y: 3, w: 160, h: 1074})
    expect(frames.editor).toEqual({x: 375, y: 3, w: 1101, h: 1049})
    expect(frames.dock).toEqual({x: 375, y: 1053, w: 1101, h: 24})
    expect(frames.story).toEqual({x: 1477, y: 3, w: 440, h: 1074})
    expect(frames.sockets.visible).toBeFalse()
    expect(frames.reference.visible).toBeFalse()
  })

  test("uses a detail preview and story panel for Socket while keeping the aggregate grid hidden", () => {
    const sockets = planNodeComponentStorybookFrames(1920, 1080, "socket/boolean/input")
    expect(sockets.storyPreview).toEqual({x: 375, y: 3, w: 1101, h: 1049})
    expect(sockets.story).toEqual({x: 1477, y: 3, w: 440, h: 1074})
    expect(sockets.sockets.visible).toBeFalse()
    expect(sockets.editor.visible).toBeFalse()
  })

  test("uses the production story preview for Parameter on the same five-panel shell", () => {
    const parameter = planNodeComponentStorybookFrames(1920, 1080, "parameter/text/input")
    expect(parameter.catalog).toEqual({x: 3, y: 3, w: 210, h: 1074})
    expect(parameter.section).toEqual({x: 214, y: 3, w: 160, h: 1074})
    expect(parameter.storyPreview).toEqual({x: 375, y: 3, w: 1101, h: 1049})
    expect(parameter.dock).toEqual({x: 375, y: 1053, w: 1101, h: 24})
    expect(parameter.story).toEqual({x: 1477, y: 3, w: 440, h: 1074})
    expect(parameter.editor.visible).toBeFalse()
    expect(parameter.reference.visible).toBeFalse()
  })

  test("keeps equal preview slots for the accepted-reference comparison", () => {
    const comparison = planNodeComponentStorybookFrames(1920, 1080, "comparison/reference/default")
    expect(comparison.reference).toEqual({x: 375, y: 3, w: 541.5, h: 1049})
    expect(comparison.detail).toEqual({x: 934.5, y: 3, w: 541.5, h: 1049})
    expect(comparison.story).toEqual({x: 1477, y: 3, w: 440, h: 1074})
  })

  test("shows only the active preview on a compact centralized target", () => {
    const frames = planNodeComponentStorybookFrames(493, 1088, "node-editor/scene/default")
    expect(frames.catalog.visible).toBeFalse()
    expect(frames.section.visible).toBeFalse()
    expect(frames.story.visible).toBeFalse()
    expect(frames.dock.visible).toBeFalse()
    expect(frames.editor.w).toBeGreaterThan(470)
    expect(frames.editor.h).toBeGreaterThan(1000)
  })
})
