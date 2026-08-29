import {describe, expect, test} from "bun:test"
import {
  Object3D,
  Space,
  type Renderer,
  type ViewPoint,
} from "@engine/core"
import {
  EngineStorySceneState,
  createEngineStorybookRuntime,
  renderEngineStoryScene,
  type EngineStorybookPreviewBounds,
  type EngineStorybookRuntimeContext,
  type EngineStorybookStage,
} from "../.storybook/runtime.ts"
import type {EngineStory, StoryScene} from "./story.ts"

describe("@engine/core structural Storybook runtime", () => {
  test("mounts one owner canvas at shared preview bounds without owning navigation", async () => {
    const native = fakeNativeCanvas()
    const ownerCanvas = {
      getBoundingClientRect: () => ({left: 10, top: 20, width: 800, height: 600}),
    } as HTMLCanvasElement
    const stage = fakeStage()
    const mounted: unknown[] = []
    const inspector: unknown[] = []
    const source: unknown[] = []
    const props: unknown[] = []
    let boundsListener: ((bounds: EngineStorybookPreviewBounds | null) => void) | null = null
    let unsubscribed = 0
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
      browserDocument: {} as globalThis.Document,
      canvas: ownerCanvas,
      signal: lifetime.signal,
      mount: (node: unknown) => mounted.push(node),
      publishInspector: (value: unknown) => inspector.push(value),
      publishSource: (value: unknown) => source.push(value),
      publishProps: (value: unknown) => props.push(value),
      reportDiagnostic() {},
      requestRender() {},
      subscribePreviewBounds(listener: (bounds: EngineStorybookPreviewBounds | null) => void) {
        boundsListener = listener
        listener(null)
        return () => { unsubscribed += 1 }
      },
    } satisfies EngineStorybookRuntimeContext
    const adapter = createEngineStorybookRuntime({
      createNativeCanvas: () => native.canvas,
      createStage: async () => stage.stage,
    })
    const session = await adapter.create(context)
    const routeSignal = new AbortController()
    const current = story("current", () => scene(1))

    await session.mount({
      route: "space/coordinate-system/z-up",
      story: current,
      signal: routeSignal.signal,
    })
    expect(mounted).toHaveLength(1)
    expect(stage.shown).toEqual([current])
    expect(inspector.at(-1)).toMatchObject({context: "current"})
    expect(source.at(-1)).toMatchObject({typescript: "const current = true"})
    expect(props.at(-1)).toMatchObject({id: "current", frames: 1})

    boundsListener!({
      x: 100,
      y: 80,
      width: 400,
      height: 320,
      viewportWidth: 1_000,
      viewportHeight: 800,
    })
    expect(native.style).toMatchObject({
      left: "90px",
      top: "80px",
      width: "320px",
      height: "240px",
      visibility: "visible",
    })
    expect(stage.sizes.at(-1)).toEqual([320, 240])

    await session.unmount()
    expect(stage.clears).toBe(1)
    expect(native.canvas.hidden).toBeTrue()
    await session.dispose()
    await session.dispose()
    expect(stage.disposes).toBe(1)
    expect(native.removes).toBe(1)
    expect(unsubscribed).toBe(1)
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

  test("refreshes the retained world transform immediately before render", () => {
    const space = new Space()
    const parent = new Object3D()
    const child = new Object3D()
    parent.position.set(12, -4, 3)
    child.position.set(5, 2, 1)
    parent.add(child)
    space.add(parent)
    const events: string[] = []
    const renderer = {
      render() {
        events.push(`${child.matrixWorld.elements[12]},${child.matrixWorld.elements[13]},${child.matrixWorld.elements[14]}`)
      },
    } as Pick<Renderer, "render">

    renderEngineStoryScene(renderer, {space}, {} as ViewPoint)
    expect(events).toEqual(["17,-2,4"])
  })
})

function fakeStage() {
  const shown: EngineStory[] = []
  const sizes: Array<readonly [number, number]> = []
  const state = {clears: 0, disposes: 0, requests: 0}
  const stage: EngineStorybookStage = {
    get frames() { return 1 },
    async show(story) {
      shown.push(story)
      return true
    },
    async reset() { return true },
    clear() { state.clears += 1 },
    resize(width, height) { sizes.push([width, height]) },
    requestRender() { state.requests += 1 },
    dispose() { state.disposes += 1 },
  }
  return {
    stage,
    shown,
    sizes,
    get clears() { return state.clears },
    get disposes() { return state.disposes },
  }
}

function fakeNativeCanvas() {
  const style: Record<string, string> = {}
  let removes = 0
  const listeners = new Map<string, EventListener>()
  const canvas = {
    hidden: true,
    style,
    addEventListener(type: string, listener: EventListener) { listeners.set(type, listener) },
    removeEventListener(type: string) { listeners.delete(type) },
    remove() { removes += 1 },
  } as unknown as HTMLCanvasElement
  return {
    canvas,
    style,
    get removes() { return removes },
  }
}

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

function scene(x: number): StoryScene {
  return {
    space: new Space(),
    camera: {
      position: {x, y: 0, z: 10},
      target: {x: 0, y: 0, z: 0},
    },
  }
}
