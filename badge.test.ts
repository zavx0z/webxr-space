import {describe, expect, test} from "bun:test"
import {Color} from "@engine/core"
import {type UiSurface, UiSurface as BaseUiSurface} from "@layout/core/surface"
import {Badge} from "./badge.ts"

type RoundedRectCall = Parameters<UiSurface["drawRoundedRect"]>
type TextCall = Parameters<UiSurface["drawText"]>

class RecordingSurface extends BaseUiSurface {
  readonly roundedRects: RoundedRectCall[] = []
  readonly texts: TextCall[] = []

  override drawRoundedRect(...args: RoundedRectCall): void { this.roundedRects.push(args) }
  override drawText(...args: TextCall): number { this.texts.push(args); return 0 }
  protected render(): void {}
}

describe("component Badge style", () => {
  test("applies explicit CSS-like style after its tone defaults", () => {
    const fill = new Color(0.1, 0.2, 0.3, 0.4)
    const border = new Color(0.5, 0.6, 0.7, 0.8)
    const text = new Color(0.9, 0.8, 0.7, 1)
    const surface = new RecordingSurface()

    Badge(surface, 10, 20, 100, 24, {
      children: "Ready",
      fontPx: 11,
      style: {
        background: fill,
        borderColor: border,
        borderRadius: "4px",
        borderWidth: "2px",
        color: text,
        fontSize: "13px",
        paddingX: "6px",
      },
    })

    expect(surface.roundedRects[0]?.[4]).toMatchObject({fill, border, radius: 4, borderWidth: 2})
    expect(surface.texts[0]?.slice(0, 3)).toEqual(["Ready", 16, 25.5])
    expect(surface.texts[0]?.[3]).toMatchObject({fontPx: 13, maxWidthPx: 88})
  })
})
