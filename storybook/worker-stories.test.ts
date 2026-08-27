import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {
  UiSurface,
  type HitOptions,
  type UiSurface as UiSurfaceType,
} from "@layout/core/surface"
import {
  loadAdaptiveWorkerStory,
  loadCoffmanGrahamWorkerStory,
  loadDagreLayeredWorkerStory,
  loadFixedWorkerStory,
} from "./worker-stories.ts"

const storybookRoot = fileURLToPath(new URL(".", import.meta.url))

type DrawTextCall = Parameters<UiSurfaceType["drawText"]>

class RecordingSurface extends UiSurface {
  readonly texts: DrawTextCall[] = []

  override measureText(text: string, fontPx: number): number {
    return [...text].length * fontPx * 0.6
  }

  override drawText(...args: DrawTextCall): number {
    this.texts.push(args)
    return this.measureText(args[0], args[3].fontPx)
  }

  override drawRoundedRect(): void {}
  override drawRect(): void {}
  override pushClip(): void {}
  override popClip(): void {}
  override hit(
    _x: number,
    _y: number,
    _w: number,
    _h: number,
    _action: () => void,
    _cursorOrOptions: string | HitOptions = "pointer",
  ): void {}

  protected render(): void {}
}

const policies = [
  {
    id: "fixed",
    executor: "@nodes/worker/fixed/executor",
    layout: "@nodes/layout/fixed",
    create: "createFixedWorkerStory",
    load: loadFixedWorkerStory,
  },
  {
    id: "adaptive",
    executor: "@nodes/worker/adaptive/executor",
    layout: "@nodes/layout/adaptive",
    create: "createAdaptiveWorkerStory",
    load: loadAdaptiveWorkerStory,
  },
  {
    id: "dagre-layered",
    executor: "@nodes/worker/top-down/executor",
    layout: "@nodes/layout/top-down",
    create: "createDagreLayeredWorkerStory",
    load: loadDagreLayeredWorkerStory,
  },
  {
    id: "coffman-graham",
    executor: "@nodes/worker/coffman-graham/executor",
    layout: "@nodes/layout/coffman-graham",
    create: "createCoffmanGrahamWorkerStory",
    load: loadCoffmanGrahamWorkerStory,
  },
] as const

describe("@nodes/worker lazy Workbench stories", () => {
  test("keeps every executor and fixture behind its exact lazy policy loader", async () => {
    const eager = await Bun.file(join(storybookRoot, "worker-stories.ts")).text()
    expect(eager).not.toContain('from "@nodes/worker/')
    expect(eager).not.toContain('from "@nodes/layout/')

    for (const policy of policies) {
      const story = await Bun.file(join(storybookRoot, "stories", `${policy.id}.ts`)).text()
      const fixture = await Bun.file(join(storybookRoot, "fixtures", `${policy.id}.ts`)).text()
      expect(eager).toContain(`import("./stories/${policy.id}.ts")`)
      expect(story).toContain(`from "${policy.executor}"`)
      expect(story).toContain(policy.create)
      expect(fixture).toContain(`from "${policy.layout}"`)
      for (const other of policies) {
        if (other.id === policy.id) continue
        expect(story).not.toContain(`from "${other.executor}"`)
        expect(fixture).not.toContain(`from "${other.layout}"`)
      }
    }
  })

  test("loads four UiSurface modules with truthful generation controls and source", async () => {
    for (const policy of policies) {
      const module = await policy.load()
      expect(module.defaultArgs).toEqual({generation: "1"})
      expect(module.controls).toEqual([{
        key: "generation",
        label: "Generation",
        group: "Запрос",
        kind: "select",
        interactive: true,
        options: [
          {value: "1", label: "1"},
          {value: "2", label: "2"},
          {value: "7", label: "7"},
        ],
      }])
      const source = module.source({generation: "7"})
      expect(source.html).toContain("<worker-protocol")
      expect(source.css).toContain(".worker-protocol__messages")
      expect(source.typescript).toContain(`from "${policy.executor}"`)
      expect(source.typescript).toContain('"requestId": 7')
      expect(source.typescript).toContain('"generation": 7')
      expect(source.typescript).toContain("const response = run")
    }
  })

  test("uses production UiSurface components and never creates a runtime, router or DOM shell", async () => {
    const story = await Bun.file(join(storybookRoot, "worker-story.ts")).text()
    expect(story).toContain('from "@ui/components/code-editor"')
    expect(story).toContain('from "@ui/components/pane"')
    expect(story).toContain('from "@ui/components/typography"')
    expect(story).toContain("drawWorkerProtocolPreview(surface, frame")
    expect(story).not.toMatch(/UiRuntime|StorybookRouteTreeRouter|document\.|window\.|createElement/)
  })

  test("renders status, request and result through the supplied Workbench surface", async () => {
    for (const policy of policies) {
      const module = await policy.load()
      const surface = new RecordingSurface()
      module.render(surface, module.defaultArgs, {x: 0, y: 0, w: 1040, h: 700})
      const text = surface.texts.map(([value]) => value)
      expect(text).toContain("Request")
      expect(text).toContain("Result")
      expect(text.some((value) => value.includes("layout-result"))).toBeTrue()
    }
  })
})
