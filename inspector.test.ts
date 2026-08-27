import {describe, expect, test} from "bun:test"
import {type HitOptions, type UiSurface, UiSurface as BaseUiSurface} from "@layout/core/surface"
import {divScrollTo} from "@ui/elements/div"
import {uiIcons} from "@ui/elements/icons"
import {
  Inspector,
  inspectorMetrics,
  planInspector,
  type InspectorSectionRect,
} from "./inspector.ts"

type DrawImageCall = Parameters<UiSurface["drawImage"]>
type DrawRoundedRectCall = Parameters<UiSurface["drawRoundedRect"]>
type DrawTextCall = Parameters<UiSurface["drawText"]>
type DrawTextCenteredCall = Parameters<UiSurface["drawTextCentered"]>
type HitCall = Parameters<UiSurface["hit"]>
type ChildClipShape = Parameters<UiSurface["withChildClip"]>[0]

class RecordingSurface extends BaseUiSurface {
  readonly images: DrawImageCall[] = []
  readonly roundedRects: DrawRoundedRectCall[] = []
  readonly texts: DrawTextCall[] = []
  readonly centeredTexts: DrawTextCenteredCall[] = []
  readonly hits: HitCall[] = []
  readonly childClips: ChildClipShape[] = []

  override drawImage(...args: DrawImageCall): void { this.images.push(args) }
  override drawRoundedRect(...args: DrawRoundedRectCall): void { this.roundedRects.push(args) }
  override drawText(...args: DrawTextCall): number { this.texts.push(args); return 0 }
  override drawTextCentered(...args: DrawTextCenteredCall): number { this.centeredTexts.push(args); return 0 }
  override hit(...args: HitCall): void { this.hits.push(args) }
  override withChildClip(shape: ChildClipShape, draw: () => void): void { this.childClips.push(shape); draw() }
  override measureText(value: string, fontPx: number): number { return value.length * fontPx * 0.55 }
  override pushClip(): void {}
  override popClip(): void {}
  protected render(): void {}
}

describe("Inspector", () => {
  test("plans a Blender-like rail, toolbar and scrollable disclosure column", () => {
    const surface = new RecordingSurface()
    const frames: InspectorSectionRect[] = []
    const scrollPositions: Array<{left: number; top: number}> = []

    Inspector(surface, 10, 20, 440, 700, {
      key: "story-inspector",
      categories: [
        {id: "code", label: "Код", iconSrc: uiIcons.manual},
        {id: "events", label: "События", iconSrc: uiIcons.log, dividerBefore: true},
      ],
      selectedCategoryId: "code",
      query: "",
      context: {label: "Button", iconSrc: uiIcons.resource},
      sections: [
        {id: "html", label: "HTML", expanded: true, contentHeight: 120, render: (_host, rect) => frames.push(rect)},
        {id: "css", label: "CSS", expanded: false, contentHeight: 120, render: (_host, rect) => frames.push(rect)},
      ],
      onSectionsScrollChange: (position) => scrollPositions.push(position),
    })

    expect(surface.roundedRects.some((call) => call[4].radius === 6)).toBeTrue()
    expect(surface.childClips.some((shape) => shape.kind === "rounded-rect")).toBeTrue()
    expect(frames).toHaveLength(1)
    expect(frames[0]).toMatchObject({
      x: 10 + 1 + inspectorMetrics.railWidth + inspectorMetrics.contentInset + inspectorMetrics.sectionContentInset,
      h: 120,
    })
    expect(frames[0]!.y).toBeGreaterThan(20 + inspectorMetrics.toolbarHeight + inspectorMetrics.contextHeight)
    expect(surface.images.length).toBeGreaterThanOrEqual(4)
    expect(surface.hits.some((call) => hitOptions(call)?.key === "story-inspector:section:html")).toBeTrue()
    expect(scrollPositions).toEqual([])
  })

  test("keeps category and disclosure state controlled by the consumer", () => {
    const surface = new RecordingSurface()
    const categories: string[] = []
    const sections: Array<[string, boolean]> = []

    Inspector(surface, 0, 0, 360, 480, {
      key: "controlled-inspector",
      categories: [
        {id: "code", label: "Код", iconSrc: uiIcons.manual},
        {id: "events", label: "События", iconSrc: uiIcons.log},
      ],
      selectedCategoryId: "code",
      sections: [{id: "html", label: "HTML", expanded: true, contentHeight: 80, render() {}}],
      onCategoryChange: (id) => categories.push(id),
      onSectionToggle: (id, expanded) => sections.push([id, expanded]),
    })

    const eventsHit = surface.hits.find((call) => hitOptions(call)?.tooltip?.label === "События")
    eventsHit?.[4]()
    const sectionHit = surface.hits.find((call) => hitOptions(call)?.key === "controlled-inspector:section:html")
    sectionHit?.[4]()

    expect(categories).toEqual(["events"])
    expect(sections).toEqual([["html", false]])
  })

  test("shares exact retained geometry and scroll translation through planInspector", () => {
    const props = {
      categories: [
        {id: "source", label: "Исходники", iconSrc: uiIcons.manual, sectionIds: ["html", "css"]},
        {id: "events", label: "События", iconSrc: uiIcons.log, sectionIds: ["events"]},
      ],
      selectedCategoryId: "source",
      sections: [
        {id: "html", label: "HTML", expanded: true, contentHeight: 100, render() {}},
        {id: "css", label: "CSS", expanded: true, contentHeight: 120, render() {}},
        {id: "events", label: "Events", expanded: true, contentHeight: 80, render() {}},
      ],
    } as const
    const initial = planInspector(10, 20, 440, 240, props)
    const scrolled = planInspector(10, 20, 440, 240, props, 45)
    const clamped = planInspector(10, 20, 440, 240, props, 999)

    expect(initial.categories.map(({id}) => id)).toEqual(["source", "events"])
    expect(initial.sections.map(({id}) => id)).toEqual(["html", "css"])
    expect(initial.sections[0]?.content?.h).toBe(100)
    expect(scrolled.sections[0]!.frame.y).toBe(initial.sections[0]!.frame.y - 45)
    expect(initial.sectionsViewport.x).toBe(10 + 1 + inspectorMetrics.railWidth)
    expect(initial.sectionsViewport.w).toBe(initial.sectionsFrame.w - inspectorMetrics.scrollbarWidth)
    expect(clamped.sectionsScrollTop).toBe(initial.sectionsContentHeight - initial.sectionsViewport.h)
    expect(clamped.sections[0]!.frame.y).toBe(initial.sections[0]!.frame.y - clamped.sectionsScrollTop)
  })

  test("filters sections by the controlled query and keeps root style last", () => {
    const surface = new RecordingSurface()
    const rendered: string[] = []

    Inspector(surface, 0, 0, 320, 420, {
      key: "filtered-inspector",
      categories: [{id: "code", label: "Код", iconSrc: uiIcons.manual, sectionIds: ["html", "css"]}],
      selectedCategoryId: "code",
      query: "css",
      style: {borderRadius: 9},
      sections: [
        {id: "html", label: "HTML", expanded: true, contentHeight: 50, render: () => rendered.push("html")},
        {id: "css", label: "CSS", expanded: true, contentHeight: 50, render: () => rendered.push("css")},
        {id: "events", label: "CSS Events", expanded: true, contentHeight: 50, render: () => rendered.push("events")},
      ],
    })

    expect(rendered).toEqual(["css"])
    expect(surface.roundedRects
      .filter((call) => call[0] === 0 && call[1] === 0 && call[2] === 320 && call[3] === 420)
      .map((call) => call[4].radius)).toEqual([9])
  })

  test("reports only actual scroll changes and clamps after content shrink", () => {
    const surface = new RecordingSurface()
    const positions: Array<{left: number; top: number}> = []
    const props = {
      key: "scroll-inspector",
      categories: [{id: "source", label: "Source", iconSrc: uiIcons.manual, sectionIds: ["html", "css"]}],
      selectedCategoryId: "source",
      sections: [
        {id: "html", label: "HTML", expanded: true, contentHeight: 220, render() {}},
        {id: "css", label: "CSS", expanded: true, contentHeight: 220, render() {}},
      ],
      onSectionsScrollChange: (position: {left: number; top: number}) => positions.push(position),
    } as const

    Inspector(surface, 0, 0, 320, 180, props)
    expect(positions).toEqual([])
    divScrollTo(surface, "scroll-inspector:sections", {top: 70})
    Inspector(surface, 0, 0, 320, 180, props)
    expect(positions).toEqual([{left: 0, top: 70}])

    Inspector(surface, 0, 0, 320, 180, {...props, query: "missing"})
    expect(positions.at(-1)).toEqual({left: 0, top: 0})
  })

  test("rejects duplicate and dangling public identities", () => {
    const section = {id: "html", label: "HTML", expanded: false, contentHeight: 0, render() {}} as const
    expect(() => planInspector(0, 0, 300, 200, {
      categories: [{id: "source", label: "A", iconSrc: uiIcons.manual}, {id: "source", label: "B", iconSrc: uiIcons.log}],
      selectedCategoryId: "source",
      sections: [section],
    })).toThrow("Inspector category id must be unique: source")
    expect(() => planInspector(0, 0, 300, 200, {
      categories: [{id: "source", label: "A", iconSrc: uiIcons.manual, sectionIds: ["missing"]}],
      selectedCategoryId: "source",
      sections: [section],
    })).toThrow("Inspector category references unknown section: source/missing")
  })

  test("keeps Inspector neutral and composed through Flex and UI owners", async () => {
    const source = await Bun.file(new URL("./inspector.ts", import.meta.url)).text()
    expect(source).toContain('from "@layout/core/flex"')
    expect(source).toContain('from "./pane.ts"')
    expect(source).toContain('from "./text-field.ts"')
    expect(source).toContain('overflowY: "auto"')
    expect(source).toContain("scrollContentHeight: currentPlan.sectionsContentHeight")
    expect(source).not.toContain("Storybook")
    expect(source).not.toContain("Blender")
    expect(source).not.toContain("surface.drawRect")
  })
})

function hitOptions(call: HitCall): HitOptions | undefined {
  const value = call[5]
  return typeof value === "string" ? {cursor: value} : value
}
