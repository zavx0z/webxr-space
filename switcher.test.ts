import {describe, expect, test} from "bun:test"
import {rgba8ToColor, resolveWidgetColors} from "@ui/elements"
import {UiSurface, Z, type UiSurface as UiSurfaceType} from "@layout/core/surface"
import {Switcher} from "./switcher.ts"

type RoundedRectCall = Parameters<UiSurfaceType["drawRoundedRect"]>
type HitCall = Parameters<UiSurfaceType["hit"]>

class RecordingSurface extends UiSurface {
  readonly roundedRects: RoundedRectCall[] = []
  readonly hits: HitCall[] = []
  override drawRoundedRect(...args: RoundedRectCall): void { this.roundedRects.push(args) }
  override hit(...args: HitCall): void { this.hits.push(args) }
  protected render(): void {}
}

describe("Switcher compatibility toggle", () => {
  test("removes the pill/knob divergence and preserves boolean callbacks", () => {
    const values: boolean[] = []
    const surface = new RecordingSurface()
    Switcher(surface, 0, 0, 42, 22, {checked: true, onChange: (value) => values.push(value)})

    const colors = resolveWidgetColors("toggle", {selected: true})
    expect(surface.roundedRects.filter((call) => call[4].z !== Z.ELEMENT - 0.01)).toHaveLength(1)
    expect(surface.roundedRects[0]?.slice(0, 4)).toEqual([0, 0, 42, 22])
    expect(surface.roundedRects[0]?.[4]).toMatchObject({
      radius: 4,
      fill: rgba8ToColor(colors.inner),
      border: rgba8ToColor(colors.outline),
    })
    surface.hits[0]?.[4]()
    expect(values).toEqual([false])
  })
})
