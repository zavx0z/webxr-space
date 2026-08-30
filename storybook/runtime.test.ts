import {describe, expect, test} from "bun:test"
import {Color, Object3D, Space} from "@engine/core"
import {createDocument} from "@zavx0z/dom"
import {
  EngineStorySceneState,
  createEngineStorybookRuntime,
  type EngineStorybookRuntimeContext,
} from "../.storybook/runtime.ts"
import type {EngineStory, StoryScene} from "./story.ts"

describe("@engine/core structural Storybook runtime", () => {
  test("contributes one scene root to the exact shared Space without another world owner", async () => {
    const document = createDocument()
    const sharedSpace = new Space()
    const restoredBackground = sharedSpace.background
    const worlds: any[] = []
    const presentations: any[] = []
    let worldDisposes = 0
    let worldRequests = 0
    let previewDisposes = 0
    const lifetime = new AbortController()
    const context = {
      projection: "world",
      document,
      signal: lifetime.signal,
      space: sharedSpace,
      present(value: unknown) {
        presentations.push(value)
        const node = (value as {node: import("@zavx0z/dom").Node}).node
        document.appendChild(node)
      },
      reportDiagnostic() {},
      mountWorldPreview(registration: any) {
        worlds.push(registration)
        return {
          frames: 1,
          disposed: false,
          requestRender() { worldRequests += 1 },
          resetViewPoint() {},
          dispose() { worldDisposes += 1 },
        }
      },
    } satisfies EngineStorybookRuntimeContext
    const adapter = createEngineStorybookRuntime({
      createPreview() {
        return {
          element: document.createElement("section"),
          componentRoot: {
            readStyleSheets: () => ({revision: 1, styleSheets: []}),
          },
          dispose() { previewDisposes += 1 },
        }
      },
    })
    const session = await adapter.create(context)
    const routeSignal = new AbortController()
    const sceneResize: unknown[] = []
    const currentScene = scene(1, (viewport) => sceneResize.push(viewport))
    const current = story("current", () => currentScene)

    await session.mount({
      route: "space/coordinate-system/z-up",
      story: current,
      signal: routeSignal.signal,
    })
    expect(adapter.protocol).toBe("storybook-runtime/3")
    expect("styleSheets" in session).toBeFalse()
    expect(presentations).toHaveLength(1)
    expect(worlds).toHaveLength(1)
    expect(Object.hasOwn(worlds[0]!, "space")).toBeFalse()
    expect(worlds[0]?.camera).toBe(currentScene.camera)
    expect(worlds[0]?.cameraGestures).toBeTrue()
    expect(worldRequests).toBe(1)
    expect(currentScene.root.parent).toBe(sharedSpace)
    expect(sharedSpace.background).toBe(currentScene.background)
    expect(presentations.at(-1)).toMatchObject({
      protocol: "story-presentation/1",
      source: {typescript: "const current = true"},
      values: {props: {id: "current", frames: 1}},
    })
    expect(presentations.at(-1).source.html).not.toContain("canvas")
    expect(typeof presentations.at(-1).componentRoot.readStyleSheets).toBe("function")

    worlds[0]?.resize({
      x: 100,
      y: 80,
      width: 400,
      height: 320,
      backingX: 200,
      backingY: 160,
      backingWidth: 800,
      backingHeight: 640,
      pixelRatio: 2,
    })
    expect(sceneResize).toEqual([{width: 800, height: 640}])

    await session.unmount()
    expect(worldDisposes).toBe(1)
    expect(currentScene.root.parent).toBeNull()
    expect(sharedSpace.background).toBe(restoredBackground)
    await session.dispose()
    await session.dispose()
    expect(worldDisposes).toBe(1)
    expect(previewDisposes).toBe(1)
  })

  test("rejects stale async scenes and recreates only the current selection", async () => {
    let resolveFirst: ((value: StoryScene) => void) | undefined
    let version = 0
    const state = new EngineStorySceneState()
    const first = state.show(story("first", () => new Promise((resolve) => {
      resolveFirst = resolve
    })))
    const current = story("current", () => scene(++version))
    await expect(state.show(current)).resolves.toMatchObject({camera: {position: {x: 1}}})
    resolveFirst?.(scene(9))
    await expect(first).resolves.toBeNull()
    await expect(state.reset()).resolves.toMatchObject({camera: {position: {x: 2}}})
    state.clear()
    await expect(state.reset()).resolves.toBeNull()
  })

  test("contains no native canvas, private Renderer or private animation-frame loop", async () => {
    const source = await Bun.file(new URL("../.storybook/runtime.ts", import.meta.url)).text()

    expect(source).toContain("mountWorldPreview")
    expect(source).toContain("context.space.add")
    expect(source).not.toContain("new Space")
    expect(source).not.toContain("styleSheets")
    expect(source).not.toMatch(/publish(?:Inspector|Source|Props)/u)
    expect(source).not.toContain("engine-story-canvas")
    expect(source).not.toContain("new Renderer")
    expect(source).not.toContain("requestAnimationFrame")
  })
})

function story(id: string, createScene: () => StoryScene | Promise<StoryScene>): EngineStory {
  return {
    id,
    group: "Foundations",
    title: id,
    icon: "architecture",
    materialIcon: "Hub",
    description: id,
    sourceFile: `packages/core/storybook/${id}.stories.ts`,
    tags: [],
    source: `const ${id} = true`,
    createScene,
  }
}

function scene(
  x: number,
  resize?: (viewport: Readonly<{width: number; height: number}>) => void,
): StoryScene {
  return {
    root: new Object3D(),
    background: new Color(0x123456),
    camera: {
      position: {x, y: 0, z: 10},
      target: {x: 0, y: 0, z: 0},
    },
    ...(resize === undefined ? {} : {resize}),
  }
}
