import {describe, expect, test} from "bun:test"
import {type UiSurface, UiSurface as BaseUiSurface} from "@layout/core/surface"
import {createCoreRuntimeScenario} from "./core-runtime-scenario.ts"
import {createCoreRuntimeStory} from "./core-story.ts"

describe("@nodes/core package-owned stories", () => {
  test("shows Parameter, snapshot, ordered document and atomic topology without UI", () => {
    const scenario = createCoreRuntimeScenario()
    expect(scenario.tree.revision).toBe(0)
    expect(scenario.document().nodes.order).toEqual(["source"])
    expect(scenario.snapshot().nodes[0]?.parameters.map(({id}) => id)).toEqual(["gain", "value"])

    expect(scenario.setGain(2)).toBeTrue()
    expect(scenario.addParameter()).toBeTrue()
    expect(scenario.addParameter()).toBeFalse()
    expect(scenario.tree.revision).toBe(2)
    expect(scenario.tree.topologyRevision).toBe(1)
    expect(scenario.document().nodes.byId["source"]?.parameters.order).toEqual(["gain", "value", "extra"])
    expect(scenario.removeParameter()).toBeTrue()
    expect(scenario.removeParameter()).toBeFalse()
    expect(scenario.changes.map(({kind}) => kind)).toEqual(["parameter", "topology", "topology"])
  })

  test("exposes one lazy UiSurface story with truthful production source", () => {
    const story = createCoreRuntimeStory()
    expect(story.defaultArgs).toEqual({})
    expect(story.controls).toEqual([])
    const source = story.source(story.defaultArgs)
    expect(source.html).toContain("<node-tree-runtime")
    expect(source.css).toContain(".core-runtime__panels")
    expect(source.typescript).toContain('from "@nodes/core/node-tree"')
    expect(source.typescript).toContain('from "@nodes/core/parameter"')
    expect(source.typescript).toContain("export function addParameter()")
    expect(source.typescript).toContain("export function removeParameter()")
    expect(source.typescript).not.toContain("createCoreRuntimeScenario")
  })

  test("keeps Gain and topology actions live inside one story-owned scenario", () => {
    const story = createCoreRuntimeStory()
    const surface = new RecordingSurface()
    const frame = {x: 0, y: 0, w: 960, h: 640}

    story.render(surface, story.defaultArgs, frame)
    expect(surface.text).toContain("revision 0 · topology 0 · Parameters 2")
    expect(surface.hits.slice(0, 3).map(([x, y]) => [x, y])).toEqual([
      [22, 77],
      [180, 77],
      [338, 77],
    ])

    surface.hits[0]?.[4]()
    surface.hits[1]?.[4]()
    surface.hits[1]?.[4]()
    surface.hits[2]?.[4]()
    surface.hits[2]?.[4]()
    expect(surface.renderRequests).toBe(3)

    surface.clearPresentation()
    story.render(surface, story.defaultArgs, frame)
    expect(surface.text).toContain("revision 3 · topology 2 · Parameters 2")
    expect(surface.text.some((value) => value.includes('"kind": "parameter"'))).toBeTrue()

    const isolated = new RecordingSurface()
    const isolatedStory = createCoreRuntimeStory()
    isolatedStory.render(isolated, isolatedStory.defaultArgs, frame)
    expect(isolated.text).toContain("revision 0 · topology 0 · Parameters 2")
  })
})

type DrawTextCall = Parameters<UiSurface["drawText"]>
type DrawTextCenteredCall = Parameters<UiSurface["drawTextCentered"]>
type DrawRoundedRectCall = Parameters<UiSurface["drawRoundedRect"]>
type HitCall = Parameters<UiSurface["hit"]>

class RecordingSurface extends BaseUiSurface {
  readonly text: string[] = []
  readonly hits: HitCall[] = []
  renderRequests = 0

  override drawText(...args: DrawTextCall): number {
    this.text.push(args[0])
    return 0
  }

  override drawTextCentered(...args: DrawTextCenteredCall): number {
    this.text.push(args[0])
    return 0
  }

  override drawRoundedRect(..._args: DrawRoundedRectCall): void {}
  override measureText(value: string, fontPx: number): number { return value.length * fontPx * 0.6 }
  override textTopForVisualCenter(_value: string, centerY: number, fontPx: number): number {
    return centerY - fontPx / 2
  }
  override hit(...args: HitCall): void { this.hits.push(args) }
  override requestRender(): void { this.renderRequests += 1 }
  protected override render(): void {}

  clearPresentation(): void {
    this.text.length = 0
    this.hits.length = 0
  }
}
