import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {defineStorybookStoryCatalog} from "@zavx0z/storybook/stories"
import {
  NODE_TREE_EDITOR_STORY_KIND,
  createNodeTreeEditorStoryModule,
  normalizeNodeTreeEditorStoryModule,
} from "./editor-story.ts"

const storyRoot = fileURLToPath(new URL(".", import.meta.url))

describe("@nodes/editor lazy root-Workbench story", () => {
  test("loads through the central generic catalog only for its exact leaf", async () => {
    let loads = 0
    const stories = defineStorybookStoryCatalog({
      groups: [{
        id: "editor",
        label: "NodeTreeEditor",
        components: [{
          id: "node-tree-editor",
          label: "NodeTreeEditor",
          apiName: "NodeTreeEditor",
          sections: [{
            id: "authoring",
            label: "Authoring",
            variants: [{
              id: "live",
              label: "Живой",
              title: "NodeTreeEditor · Живой authoring",
              async load() {
                loads += 1
                return createNodeTreeEditorStoryModule()
              },
            }],
          }],
        }],
      }],
      representative: {component: "node-tree-editor", section: "authoring", variant: "live"},
      normalizeModule: normalizeNodeTreeEditorStoryModule,
    })

    expect(loads).toBe(0)
    const loaded = await stories.load("node-tree-editor/authoring/live")
    expect(loads).toBe(1)
    expect(loaded.kind).toBe(NODE_TREE_EDITOR_STORY_KIND)
    expect(await stories.load("node-tree-editor/authoring/live")).toBe(loaded)
    expect(loads).toBe(1)
  })

  test("exports the exact generic-catalog adapter without creating a runtime, router or shell", async () => {
    const story = createNodeTreeEditorStoryModule()
    expect(story.kind).toBe(NODE_TREE_EDITOR_STORY_KIND)
    expect(Object.isFrozen(story)).toBeTrue()
    expect(story.controls).toEqual([])
    const storySource = story.source({})
    expect(storySource.html).toContain("<node-tree-editor")
    expect(storySource.css).toContain(".node-tree-editor__preview")
    expect(storySource.typescript).toContain('import {NodeTreeEditor} from "@nodes/editor"')
    expect(normalizeNodeTreeEditorStoryModule("editor/authoring/default", story)).toBe(story)
    expect(() => normalizeNodeTreeEditorStoryModule("editor/authoring/default", {
      defaultArgs: {},
      controls: [],
    })).toThrow("Invalid NodeTreeEditor story module: editor/authoring/default")

    const source = await Bun.file(join(storyRoot, "editor-story.ts")).text()
    expect(source).not.toContain('from "@layout/core/runtime"\nimport {UiRuntime')
    expect(source).not.toContain("UiRuntime.create")
    expect(source).not.toContain("StorybookRouteTreeRouter")
    expect(source).not.toContain("StorybookBackdropSurface")
    expect(source).not.toContain("StorybookNavigationSurface")
  })

  test("keeps NodeEditor and its authoring dock as real sibling surfaces in owner slots", async () => {
    const changes: unknown[] = []
    const errors: unknown[] = []
    const preview = await createNodeTreeEditorStoryModule().createPreview({
      viewport: () => ({width: 900, height: 620}),
      onChange: (snapshot) => changes.push(snapshot),
      onError: (error) => errors.push(error),
    })

    expect(preview.surfaces.map(({slot, surface}) => ({slot, name: surface.node.name}))).toEqual([
      {slot: "preview", name: "NodeEditor"},
      {slot: "dock", name: "NodeTreeEditorDockSurface"},
    ])
    expect(preview.snapshot()).toMatchObject({
      treeRevision: 0,
      topologyRevision: 0,
      projectionRevision: 0,
      projectionTopologyRevision: 0,
      layoutDirty: false,
      gain: 1,
      nodeIds: ["source", "target"],
      linkIds: ["runtime-link"],
    })
    expect(changes.length).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })

  test("keeps structural patches visible until the explicit layout rebuild", async () => {
    const preview = await createNodeTreeEditorStoryModule().createPreview({
      viewport: () => ({width: 900, height: 620}),
    })

    const added = preview.addParameter("source")
    expect(added).toMatchObject({
      treeRevision: 1,
      topologyRevision: 1,
      projectionRevision: 0,
      projectionTopologyRevision: 0,
      layoutDirty: true,
      selectedParameterId: "parameter-1",
    })
    expect(added.lastPatch?.map(({op}) => op)).toEqual(["add", "add"])

    const removed = preview.removeSelectedParameter()
    expect(removed).toMatchObject({
      treeRevision: 2,
      topologyRevision: 2,
      projectionRevision: 0,
      projectionTopologyRevision: 0,
      layoutDirty: true,
    })
    expect(removed.parameterIds).not.toContain("parameter-1")

    const rebuilt = await preview.rebuildLayout()
    expect(rebuilt).toMatchObject({
      treeRevision: 2,
      topologyRevision: 2,
      projectionRevision: 2,
      projectionTopologyRevision: 2,
      layoutDirty: false,
    })
  })

  test("preserves disconnect/connect and add/remove Node transactions through production owners", async () => {
    const preview = await createNodeTreeEditorStoryModule().createPreview({
      viewport: () => ({width: 900, height: 620}),
    })

    const disconnected = preview.toggleConnection()
    expect(disconnected).toMatchObject({
      treeRevision: 1,
      topologyRevision: 1,
      layoutDirty: true,
      linkIds: [],
    })
    expect(disconnected.lastPatch?.map(({op}) => op)).toEqual(["remove", "remove"])

    const connected = preview.toggleConnection()
    expect(connected).toMatchObject({
      treeRevision: 2,
      topologyRevision: 2,
      layoutDirty: true,
      linkIds: ["editor-link-1"],
    })
    expect(connected.lastPatch?.map(({op}) => op)).toEqual(["add", "add"])
    await preview.rebuildLayout()

    const addedNode = preview.addNode()
    expect(addedNode).toMatchObject({
      treeRevision: 3,
      topologyRevision: 3,
      selectedNodeId: "dynamic-1",
      nodeIds: ["source", "target", "dynamic-1"],
      layoutDirty: true,
    })
    const removedNode = preview.removeSelectedNode()
    expect(removedNode).toMatchObject({
      treeRevision: 4,
      topologyRevision: 4,
      nodeIds: ["source", "target"],
      layoutDirty: true,
    })
    expect(removedNode.nodeIds).not.toContain("dynamic-1")
  })

  test("updates the same gain Parameter Store without making topology dirty", async () => {
    const preview = await createNodeTreeEditorStoryModule().createPreview({
      viewport: () => ({width: 900, height: 620}),
    })

    const changed = await preview.setGain(2.5)
    expect(changed).toMatchObject({
      treeRevision: 1,
      topologyRevision: 0,
      projectionRevision: 1,
      projectionTopologyRevision: 0,
      layoutDirty: false,
      gain: 2.5,
    })
    expect(changed.lastPatch).toEqual([{
      op: "replace",
      path: "/nodes/byId/source/parameters/byId/gain/value",
      value: 2.5,
    }])
  })
})
