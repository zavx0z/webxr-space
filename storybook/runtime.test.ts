import {describe, expect, test} from "bun:test"
import {Space} from "@engine/core"
import {
  EngineStorySceneState,
  createEngineStorybookRuntime,
  type EngineStorybookRuntimeContext,
} from "../.storybook/runtime.ts"
import type {EngineStory, StoryScene} from "./story.ts"

describe("@engine/core structural Storybook runtime", () => {
  test("mounts one owner Space in the shared bounded world host without owning a canvas", async () => {
    const mounted: unknown[] = []
    const worlds: any[] = []
    const inspector: unknown[] = []
    const source: unknown[] = []
    const props: unknown[] = []
    let worldDisposes = 0
    let worldRequests = 0
    const lifetime = new AbortController()
    const context = {
      document: {
        createElement() {
          return {
            className: "",
            setAttribute() {},
          }
        },
      },
      signal: lifetime.signal,
      mount: (node: unknown) => mounted.push(node),
      publishInspector: (value: unknown) => inspector.push(value),
      publishSource: (value: unknown) => source.push(value),
      publishProps: (value: unknown) => props.push(value),
      reportDiagnostic() {},
      requestRender() {},
      mountWorldPreview(registration: any) {
        mounted.push(registration.node)
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
    const adapter = createEngineStorybookRuntime()
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
    expect(mounted).toHaveLength(1)
    expect(worlds).toHaveLength(1)
    expect(worlds[0]?.space).toBe(currentScene.space)
    expect(worlds[0]?.camera).toBe(currentScene.camera)
    expect(worlds[0]?.cameraGestures).toBeTrue()
    expect(worldRequests).toBe(1)
    expect(inspector.at(-1)).toMatchObject({context: "current"})
    expect(source.at(-1)).toMatchObject({typescript: "const current = true"})
    expect(props.at(-1)).toMatchObject({id: "current", frames: 1})
    expect((source.at(-1) as {html: string}).html).not.toContain("canvas")

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
    await session.dispose()
    await session.dispose()
    expect(worldDisposes).toBe(1)
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
    space: new Space(),
    camera: {
      position: {x, y: 0, z: 10},
      target: {x: 0, y: 0, z: 0},
    },
    ...(resize === undefined ? {} : {resize}),
  }
}
