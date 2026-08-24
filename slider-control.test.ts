import {describe, expect, test} from "bun:test"
import {rgba8ToColor, resolveWidgetColors} from "@ui/elements"
import {UiSurface, type UiSurface as UiSurfaceType} from "@layout/core/surface"
import {SliderControl} from "./slider-control.ts"

type RoundedRectCall = Parameters<UiSurfaceType["drawRoundedRect"]>

class RecordingSurface extends UiSurface {
  readonly roundedRects: RoundedRectCall[] = []
  state = {hovered: false, pressed: false}
  override drawRoundedRect(...args: RoundedRectCall): void { this.roundedRects.push(args) }
  override hitState(): {hovered: boolean; pressed: boolean} { return {...this.state} }
  protected render(): void {}
}

describe("SliderControl inline Blender state", () => {
  test("maps idle, hover and press to numberSlider while preserving callbacks", () => {
    const values: number[] = []
    const surface = new RecordingSurface()
    const draw = (): void => {
      surface.roundedRects.length = 0
      SliderControl(surface, 0, 0, 120, {
        key: "range",
        label: "Factor",
        layout: "inline",
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
        onChange: (value) => values.push(value),
      })
    }

    for (const state of [
      {hovered: false, pressed: false},
      {hovered: true, pressed: false},
      {hovered: true, pressed: true},
    ]) {
      surface.state = state
      draw()
      const expected = resolveWidgetColors("numberSlider", state)
      expect(surface.roundedRects[0]?.[4]).toMatchObject({
        fill: rgba8ToColor(expected.inner),
        border: rgba8ToColor(expected.outline),
      })
      expect(surface.roundedRects[1]?.[4].fill).toEqual(rgba8ToColor(expected.item))
    }
    expect(values).toEqual([])
  })
})
