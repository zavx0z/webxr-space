import {describe, expect, test} from "bun:test"
import {Color} from "@engine/core"
import {handleActiveInputKey, surfaceHasActiveInput} from "@layout/core/text-input"
import {UiSurface, type HitOptions, type UiSurface as UiSurfaceType} from "@layout/core/surface"
import {divScrollTo} from "@ui/elements/div"
import {opaqueRgba8ToColor, rgba8ToColor, uiTheme} from "@ui/elements/theme-reference"
import {
  CodeEditor,
  codeEditorScrollPosition,
  type CodeEditorSelection,
} from "./code-editor.ts"

type DrawTextCall = Parameters<UiSurfaceType["drawText"]>
type ClipCall = Parameters<UiSurfaceType["pushClip"]>
type DrawRectCall = Parameters<UiSurfaceType["drawRect"]>
type DrawRoundedRectCall = Parameters<UiSurfaceType["drawRoundedRect"]>

class RecordingSurface extends UiSurface {
  readonly texts: DrawTextCall[] = []
  readonly keyedRenders: string[] = []
  readonly hits = new Map<string, HitOptions>()
  readonly clips: ClipCall[] = []
  readonly rects: DrawRectCall[] = []
  readonly roundedRects: DrawRoundedRectCall[] = []

  override measureText(text: string, fontPx: number): number {
    return [...text].length * fontPx * 0.6
  }

  override drawText(...args: DrawTextCall): number {
    this.texts.push(args)
    return this.measureText(args[0], args[3].fontPx)
  }

  override drawRoundedRect(...args: DrawRoundedRectCall): void { this.roundedRects.push(args) }
  override drawRect(...args: DrawRectCall): void { this.rects.push(args) }
  override pushClip(...args: ClipCall): void { this.clips.push(args) }
  override popClip(): void {}
  override requestKeyedRender(key: string): void { this.keyedRenders.push(key) }
  override hit(
    _x: number,
    _y: number,
    _w: number,
    _h: number,
    _action: () => void,
    cursorOrOptions: string | HitOptions = "pointer",
  ): void {
    if (typeof cursorOrOptions !== "string" && cursorOrOptions.key !== undefined) {
      this.hits.set(cursorOrOptions.key, cursorOrOptions)
    }
  }
  protected render(): void {}
}

describe("CodeEditor read-only component", () => {
  test("resolves TypeScript, shows line numbers and uses distinct Islands Dark materials", () => {
    const surface = new RecordingSurface()
    CodeEditor(surface, 0, 0, 320, 160, {
      key: "syntax",
      value: 'const name = "demo"\n// comment\nconst count = 42',
      readOnly: true,
      languageId: "typescript",
    })

    expect(surface.texts.some(([text]) => text === "1")).toBeTrue()
    expect(surface.texts.some(([text]) => text === "2")).toBeTrue()
    expect(surface.texts.some(([text]) => text === "3")).toBeTrue()
    expect(surface.roundedRects[0]?.[4]).toMatchObject({
      fill: opaqueRgba8ToColor(uiTheme.spaceText.back),
      border: rgba8ToColor(uiTheme.material.editorOutline),
    })
    expect(surface.rects.map((call) => call[4])).toContainEqual(rgba8ToColor(uiTheme.spaceText.gutter))
    expect(surface.rects[0]?.slice(0, 2)).toEqual([1, 1])
    expect(surface.texts.find(([text]) => text === "1")?.[3].material.color)
      .toEqual(rgba8ToColor(uiTheme.spaceText.lineNumbers))
    const keyword = surface.texts.find(([text]) => text === "const")
    const string = surface.texts.find(([text]) => text.includes('"demo"'))
    const comment = surface.texts.find(([text]) => text.includes("// comment"))
    const number = surface.texts.find(([text]) => text === "42")
    expect(keyword).toBeDefined()
    expect(string).toBeDefined()
    expect(comment).toBeDefined()
    expect(number).toBeDefined()
    expect(new Set([keyword, string, comment, number].map((call) => {
      const color = call![3].material.color
      return `${color.r}:${color.g}:${color.b}:${color.a}`
    }))).toHaveLength(4)
  })

  test("gives explicit tokens precedence over language resolution", () => {
    const surface = new RecordingSurface()
    CodeEditor(surface, 0, 0, 240, 100, {
      key: "explicit",
      value: "plain",
      readOnly: true,
      languageId: "plaintext",
      showLineNumbers: false,
      tokens: [[{s: 0, e: 5, c: "d", fg: "#123456"}]],
    })

    const plain = surface.texts.find(([text]) => text === "plain")
    expect(plain).toBeDefined()
    expect(plain![3].material.color).toEqual(new Color("#123456"))
  })

  test("normalizes CRLF into exact source rows", () => {
    const surface = new RecordingSurface()
    CodeEditor(surface, 0, 0, 240, 100, {
      key: "crlf",
      value: "first\r\nsecond",
      readOnly: true,
      languageId: "plaintext",
    })
    expect(surface.texts.some(([text]) => text === "1")).toBeTrue()
    expect(surface.texts.some(([text]) => text === "2")).toBeTrue()
    expect(surface.texts.some(([text]) => text.includes("\r"))).toBeFalse()
  })

  test("selects with one pointer range and copies only that range through Cmd+C", async () => {
    const surface = new RecordingSurface()
    const selections: Array<CodeEditorSelection | null> = []
    const copied: string[] = []
    const navigatorObject = globalThis.navigator as Navigator & {clipboard?: Clipboard}
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigatorObject, "clipboard")
    Object.defineProperty(navigatorObject, "clipboard", {
      configurable: true,
      value: {writeText: async (text: string) => { copied.push(text) }},
    })

    try {
      CodeEditor(surface, 0, 0, 300, 120, {
        key: "selection",
        value: "alpha beta\nsecond",
        readOnly: true,
        showLineNumbers: false,
        fontPx: 10,
        linePx: 14,
        onSelectionChange: (selection) => { selections.push(selection) },
      })

      const pointer = {button: 0, preventDefault() {}} as MouseEvent
      const hit = surface.hits.get("selection")
      expect(hit).toBeDefined()
      hit!.onPointerDown?.(7, 10, pointer)
      hit!.onPointerMove?.(37, 10, pointer)
      hit!.onPointerUp?.(pointer)
      expect(selections.at(-1)?.text).toBe("alpha")
      expect(surfaceHasActiveInput(surface)).toBeFalse()

      let prevented = 0
      expect(handleActiveInputKey(surface, {
        key: "c",
        metaKey: true,
        ctrlKey: false,
        preventDefault: () => { prevented++ },
      } as KeyboardEvent)).toBeTrue()
      await Promise.resolve()
      await Promise.resolve()
      expect(prevented).toBe(1)
      expect(copied).toEqual(["alpha"])

      CodeEditor(surface, 0, 0, 300, 120, {
        key: "selection",
        value: "replacement",
        readOnly: true,
        showLineNumbers: false,
        onSelectionChange: (selection) => { selections.push(selection) },
      })
      await Promise.resolve()
      expect(selections.at(-1)).toBeNull()
    } finally {
      if (clipboardDescriptor === undefined) {
        Object.defineProperty(navigatorObject, "clipboard", {configurable: true, value: undefined})
      } else Object.defineProperty(navigatorObject, "clipboard", clipboardDescriptor)
    }
  })

  test("keeps a fixed gutter while both scroll axes use the stable key", () => {
    const surface = new RecordingSurface()
    const value = [
      `const horizontal = "${"x".repeat(120)}"`,
      ...Array.from({length: 40}, (_, index) => `const line${index} = ${index}`),
    ].join("\n")
    const positions: Array<Readonly<{left: number; top: number}>> = []
    const props = {
      key: "scroll",
      value,
      readOnly: true,
      languageId: "typescript",
      onScrollChange: (position: Readonly<{left: number; top: number}>) => { positions.push(position) },
    } as const
    CodeEditor(surface, 0, 0, 180, 100, props)
    const firstGutterX = surface.texts.find(([text]) => text === "1")?.[1]
    const codeClip = surface.clips.at(-1)
    expect(codeClip?.[0]).toBeGreaterThan(6)
    CodeEditor(surface, 0, 0, 180, 100, props)
    expect(positions).toHaveLength(1)
    divScrollTo(surface, "scroll", {left: 180, top: 80})
    surface.texts.length = 0
    CodeEditor(surface, 0, 0, 180, 100, props)

    expect(codeEditorScrollPosition(surface, "scroll").left).toBeGreaterThan(0)
    expect(codeEditorScrollPosition(surface, "scroll").top).toBeGreaterThan(0)
    expect(surface.texts.find(([text]) => text === "6")?.[1]).toBe(firstGutterX)
    expect(positions).toHaveLength(2)
  })

  test("leaves Cmd+C unhandled when the pointer selection is empty", () => {
    const surface = new RecordingSurface()
    CodeEditor(surface, 0, 0, 220, 90, {
      key: "empty-selection",
      value: "alpha",
      readOnly: true,
      showLineNumbers: false,
    })
    const hit = surface.hits.get("empty-selection")
    expect(hit).toBeDefined()
    const pointer = {button: 0, preventDefault() {}} as MouseEvent
    hit!.onPointerDown?.(12, 12, pointer)
    hit!.onPointerUp?.(pointer)
    expect(handleActiveInputKey(surface, {
      key: "c",
      metaKey: true,
      ctrlKey: false,
      preventDefault() {},
    } as KeyboardEvent)).toBeFalse()
  })
})
