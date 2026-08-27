import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLMeterElement,
  HTMLProgressElement,
} from "@zavx0z/dom"
import {
  createMeterStory,
  createProgressStory,
  gaugeStoriesCss,
  meterStoryDefaultArgs,
  progressStoryDefaultArgs,
} from "./gauge-stories.ts"

describe("native DOM gauge stories", () => {
  test("keeps one stable normalized progress element including indeterminate state", () => {
    const story = createProgressStory(createDocument())
    const progress = story.element

    expect(progress).toBeInstanceOf(HTMLProgressElement)
    expect(progress.localName).toBe("progress")
    expect(progress.max).toBe(100)
    expect(progress.value).toBe(50)
    expect(progress.position).toBe(0.5)
    expect(story.args).toEqual(progressStoryDefaultArgs)

    story.update({max: -5, value: 100, title: "Normalized progress"})
    expect(story.element).toBe(progress)
    expect(progress.max).toBe(1)
    expect(progress.value).toBe(1)
    expect(progress.getAttribute("max")).toBe("1")
    expect(progress.getAttribute("value")).toBe("1")
    expect(story.args).toEqual({max: 1, value: 1, title: "Normalized progress"})

    story.update({max: 4, value: null, title: "Indeterminate progress"})
    expect(story.element).toBe(progress)
    expect(progress.max).toBe(4)
    expect(progress.position).toBe(-1)
    expect(progress.hasAttribute("value")).toBeFalse()
    expect(story.args).toEqual({max: 4, value: null, title: "Indeterminate progress"})
  })

  test("keeps one stable meter with DOM-normalized thresholds", () => {
    const story = createMeterStory(createDocument())
    const meter = story.element

    expect(meter).toBeInstanceOf(HTMLMeterElement)
    expect(meter.localName).toBe("meter")
    expect(meter.min).toBe(0)
    expect(meter.max).toBe(100)
    expect(meter.low).toBe(25)
    expect(meter.high).toBe(75)
    expect(meter.optimum).toBe(50)
    expect(meter.value).toBe(60)
    expect(story.args).toEqual(meterStoryDefaultArgs)

    story.update({min: 10, max: 5, low: -10, high: 100, optimum: 50, value: 20, title: "Normalized meter"})
    expect(story.element).toBe(meter)
    expect(meter.min).toBe(10)
    expect(meter.max).toBe(10)
    expect(meter.low).toBe(10)
    expect(meter.high).toBe(10)
    expect(meter.optimum).toBe(10)
    expect(meter.value).toBe(10)
    expect(story.args).toEqual({
      min: 10,
      max: 10,
      low: 10,
      high: 10,
      optimum: 10,
      value: 10,
      title: "Normalized meter",
    })
    expect(meter.getAttribute("max")).toBe("10")
    expect(meter.getAttribute("value")).toBe("10")
  })

  test("does not fabricate gauge events during property updates", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const progress = createProgressStory(document)
    const meter = createMeterStory(document)
    document.appendChild(host)
    host.append(progress.element, meter.element)
    const events: string[] = []
    for (const type of ["input", "change"]) host.addEventListener(type, (event) => events.push(event.type))

    progress.update({...progress.args, value: 75})
    meter.update({...meter.args, value: 80})
    expect(events).toEqual([])
  })

  test("derives exact live HTML/CSS/direct TypeScript sources", () => {
    const document = createDocument()
    const progress = createProgressStory(document)
    const meter = createMeterStory(document)

    expect(progress.source.html).toBe('<progress class="ui-progress-story" max="100" title="Progress" value="50"></progress>')
    expect(progress.source.css).toBe(gaugeStoriesCss)
    expect(progress.source.typescript).toContain('document.createElement("progress")')
    expect(progress.source.typescript).toContain("progress.value = 50")
    expect(progress.source.typescript).not.toContain("createProgressStory")
    progress.update({max: 2, value: null, title: "Waiting"})
    expect(progress.source.html).toBe('<progress class="ui-progress-story" max="2" title="Waiting"></progress>')
    expect(progress.source.typescript).toContain('progress.removeAttribute("value")')

    expect(meter.source.html).toBe('<meter class="ui-meter-story" high="75" low="25" max="100" min="0" optimum="50" title="Meter" value="60"></meter>')
    expect(meter.source.css).toBe(gaugeStoriesCss)
    expect(meter.source.typescript).toContain('document.createElement("meter")')
    expect(meter.source.typescript).toContain("meter.optimum = 50")
    expect(meter.source.typescript).not.toContain("createMeterStory")
  })

  test("exports renderer-compatible flat gauge CSS", () => {
    expect(gaugeStoriesCss).toContain(".ui-progress-story")
    expect(gaugeStoriesCss).toContain(".ui-meter-story")
    expect(gaugeStoriesCss).toContain("width: 200px")
    expect(gaugeStoriesCss).toContain("height: 20px")
    expect(gaugeStoriesCss).toContain("padding: 3px 6px")
    expect(gaugeStoriesCss).not.toContain("&")
    expect(gaugeStoriesCss).not.toContain("calc(")
  })

  test("validates non-finite inputs before changing stable gauges", () => {
    const progress = createProgressStory(createDocument())
    const meter = createMeterStory(createDocument())
    const progressArgs = progress.args
    const meterArgs = meter.args

    expect(() => progress.update({...progress.args, max: Number.NaN}))
      .toThrow("Progress story max must be finite")
    expect(() => progress.update({...progress.args, value: Number.POSITIVE_INFINITY}))
      .toThrow("Progress story value must be finite")
    expect(() => meter.update({...meter.args, low: Number.NaN}))
      .toThrow("Meter story low must be finite")
    expect(progress.args).toBe(progressArgs)
    expect(meter.args).toBe(meterArgs)
  })

  test("keeps the package independent from production and retained owners", async () => {
    const source = await Bun.file(new URL("./gauge-stories.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    for (const forbidden of [
      "UiSurface",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"),
      "defineStorybookStoryModule",
      "dispatchEvent",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/gauge-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-GAUGE-STORIES-001")
  })
})
