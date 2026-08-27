import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {createNodeComponentStory} from "./stories/node-components.ts"
import {
  NODE_UI_STORY_KIND,
  createNodeUiStoryModule,
  isNodeUiStoryRoute,
  normalizeNodeUiStoryModule,
  type NodeUiStoryFrame,
  type NodeUiStorySurfaceId,
} from "./node-ui-story.ts"

const storyRoot = fileURLToPath(new URL(".", import.meta.url))

describe("@nodes/ui lazy root-Workbench preview adapter", () => {
  test("delegates exact story metadata without creating a runtime, router or shell", async () => {
    const owner = createNodeComponentStory("node-editor", {target: "expanded", selected: false})
    const story = createNodeUiStoryModule("node-editor/scene/default", owner)

    expect(story.kind).toBe(NODE_UI_STORY_KIND)
    expect(story.defaultArgs).toBe(owner.defaultArgs)
    expect(story.controls).toBe(owner.controls)
    expect(story.source(owner.defaultArgs)).toEqual(owner.source(owner.defaultArgs))
    expect(story.selection()).toMatchObject({
      route: "node-editor/scene/default",
      module: owner,
      args: owner.defaultArgs,
    })
    expect(normalizeNodeUiStoryModule("ui/node-editor/scene/default", story)).toBe(story)
    expect(() => normalizeNodeUiStoryModule("ui/node-editor/scene/default", {
      defaultArgs: {},
      controls: [],
    })).toThrow("Invalid Node UI story module: ui/node-editor/scene/default")

    const source = await Bun.file(join(storyRoot, "node-ui-story.ts")).text()
    expect(source).not.toContain("UiRuntime.create")
    expect(source).not.toContain("StorybookRouteTreeRouter")
    expect(source).not.toContain("StorybookBackdropSurface")
    expect(source).not.toContain("StorybookNavigationSurface")
    expect(source).not.toContain("StorybookDockSurface")
    expect(source).not.toContain("document.")
  })

  test("returns only owner preview surfaces and delegates their root-owned frames", async () => {
    const frames = new Map<NodeUiStorySurfaceId, NodeUiStoryFrame>([
      ["editor", {x: 200, y: 40, w: 900, h: 620}],
      ["reference", {x: 200, y: 40, w: 440, h: 620}],
      ["comparison", {x: 660, y: 40, w: 440, h: 620}],
    ])
    const owner = createNodeComponentStory("node-editor", {target: "expanded", selected: false})
    const preview = await createNodeUiStoryModule("node-editor/scene/default", owner).createPreview({
      viewport: () => ({width: 900, height: 620}),
      frame: (id) => frames.get(id)!,
      renderNextFrame: async () => {},
    })

    expect(preview.surfaces.map(({id, slot, surface}) => ({id, slot, name: surface.node.name}))).toEqual([
      {id: "editor", slot: "preview", name: "NodeEditor"},
      {id: "reference", slot: "preview", name: "AcceptedReferenceSurface"},
      {id: "comparison", slot: "preview", name: "NodeEditor"},
    ])
    expect(preview.surfaces.map(({frame}) => frame())).toEqual([...frames.values()])
    expect(preview.snapshot()).toMatchObject({
      route: "node-editor/scene/default",
      component: "node-editor",
      activeSurfaceIds: ["editor"],
      selection: null,
      targetNodeId: "scalar",
      referenceStatus: "idle",
    })
    expect(preview.surfaces.map(({surface}) => surface.node.visible)).toEqual([true, false, false])
  })

  test("switches NodeEditor, Frame and Link on the same production surface", async () => {
    const changes: unknown[] = []
    const expanded = createNodeComponentStory("node-editor", {target: "expanded", selected: false})
    const preview = await createNodeUiStoryModule("node-editor/scene/default", expanded).createPreview({
      viewport: () => ({width: 900, height: 620}),
      frame: () => ({x: 0, y: 0, w: 900, h: 620}),
      renderNextFrame: async () => {},
      onChange: (snapshot) => changes.push(snapshot),
    })

    const selectedCollapsedArgs = Object.freeze({
      ...expanded.defaultArgs,
      target: "collapsed",
      selected: true,
      "target-node-id": "collapsed",
    })
    expect(preview.update({
      route: "node-editor/collapsed/selected",
      module: expanded,
      args: selectedCollapsedArgs,
    })).toMatchObject({
      selection: {kind: "node", id: "collapsed"},
      targetNodeId: "collapsed",
      activeSurfaceIds: ["editor"],
    })

    const frame = createNodeComponentStory("frame")
    expect(preview.update({
      route: "frame/nested/default",
      module: frame,
      args: frame.defaultArgs,
    })).toMatchObject({
      component: "frame",
      selection: {kind: "frame", id: "data-frame"},
      source: frame.source(frame.defaultArgs),
      controls: frame.controls,
    })

    const link = createNodeComponentStory("link")
    expect(preview.update({
      route: "link/orthogonal/selected",
      module: link,
      args: link.defaultArgs,
    })).toMatchObject({
      component: "link",
      selection: {kind: "link", id: "matrix-shader"},
      activeSurfaceIds: ["editor"],
    })
    expect(changes.length).toBeGreaterThanOrEqual(4)
  })

  test("shows accepted reference and representative live Node only for Comparison readiness", async () => {
    let renders = 0
    const errors: unknown[] = []
    const comparison = createNodeComponentStory("comparison")
    const preview = await createNodeUiStoryModule("comparison/reference/default", comparison).createPreview({
      viewport: () => ({width: 900, height: 620}),
      frame: (id) => id === "reference"
        ? {x: 0, y: 0, w: 440, h: 620}
        : {x: 460, y: 0, w: 440, h: 620},
      renderNextFrame: async () => { renders += 1 },
      referenceStatus: () => "ready",
      onError: (error) => errors.push(error),
    })

    expect(preview.snapshot()).toMatchObject({
      component: "comparison",
      activeSurfaceIds: ["reference", "comparison"],
      referenceStatus: "loading",
    })
    expect(preview.surfaces.map(({surface}) => surface.node.visible)).toEqual([false, true, true])
    expect(await preview.ready()).toMatchObject({referenceStatus: "ready"})
    expect(renders).toBe(2)
    expect(errors).toEqual([])

    const editor = createNodeComponentStory("node-editor", {target: "expanded", selected: false})
    preview.update({route: "node-editor/scene/default", module: editor, args: editor.defaultArgs})
    expect(preview.snapshot().activeSurfaceIds).toEqual(["editor"])
    expect(preview.surfaces.map(({surface}) => surface.node.visible)).toEqual([true, false, false])
  })

  test("fails closed for generic Parameter and unknown routes", () => {
    expect(isNodeUiStoryRoute("node-editor/scene/default")).toBeTrue()
    expect(isNodeUiStoryRoute("frame/nested/default")).toBeTrue()
    expect(isNodeUiStoryRoute("parameter/text/field")).toBeFalse()
    const parameter = createNodeComponentStory("parameter")
    expect(() => createNodeUiStoryModule("parameter/text/field", parameter)).toThrow(
      "Unsupported Node UI preview route: parameter/text/field",
    )
  })
})
