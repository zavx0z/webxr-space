import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLButtonElement,
  HTMLFieldSetElement,
  HTMLInputElement,
  HTMLLabelElement,
  HTMLLegendElement,
} from "@zavx0z/dom"
import {
  colorFieldStoryDefaultArgs,
  colorInputClosedStoryDefaultArgs,
  colorInputExpandedStoryDefaultArgs,
  colorInputOpenStoryDefaultArgs,
  colorStoriesCss,
  createColorFieldStory,
  createColorInputStory,
  type ColorInputStoryArgs,
} from "./color-stories.ts"

const channels = ["r", "g", "b", "a"] as const

describe("DOM color stories", () => {
  test("creates one semantic Color Field with stable keyed RGBA controls", () => {
    const story = createColorFieldStory(createDocument())
    const root = story.element
    const legend = story.refs.legend
    const legendText = story.refs.legendText
    const labels = new Map(channels.map((key) => [key, story.refs.labels.get(key)!]))
    const labelTexts = new Map(channels.map((key) => [key, story.refs.labelTexts.get(key)!]))
    const inputs = new Map(channels.map((key) => [key, story.refs.inputs.get(key)!]))

    expect(root).toBeInstanceOf(HTMLFieldSetElement)
    expect(root.localName).toBe("fieldset")
    expect(legend).toBeInstanceOf(HTMLLegendElement)
    expect(legend.textContent).toBe("Color")
    expect(story.args).toEqual(colorFieldStoryDefaultArgs)
    for (const key of channels) {
      const label = labels.get(key)!
      const input = inputs.get(key)!
      expect(label).toBeInstanceOf(HTMLLabelElement)
      expect(input).toBeInstanceOf(HTMLInputElement)
      expect(input.type).toBe("text")
      expect(input.value).toBe(String(colorFieldStoryDefaultArgs.value[key]))
      expect(label.control).toBe(input)
      expect(label.getAttribute("data-channel")).toBe(key)
      expect(input.getAttribute("data-channel")).toBe(key)
    }

    story.update({
      legend: "Surface color",
      value: {r: 0.1, g: 0.2, b: 0.3, a: 1},
      disabled: false,
      readOnly: true,
      title: "Read-only surface color",
    })
    expect(story.element).toBe(root)
    expect(story.refs.legend).toBe(legend)
    expect(story.refs.legendText).toBe(legendText)
    expect(legendText.data).toBe("Surface color")
    for (const key of channels) {
      expect(story.refs.labels.get(key)).toBe(labels.get(key))
      expect(story.refs.labelTexts.get(key)).toBe(labelTexts.get(key))
      expect(story.refs.inputs.get(key)).toBe(inputs.get(key))
      expect(inputs.get(key)!.readOnly).toBeTrue()
    }
    expect(inputs.get("b")!.value).toBe("0.3")
  })

  test("keeps one ColorInput tree across closed, open and expanded routes", () => {
    const story = createColorInputStory(createDocument())
    const root = story.element
    const legend = story.refs.legend
    const legendText = story.refs.legendText
    const trigger = story.refs.trigger
    const triggerText = story.refs.triggerText
    const picker = story.refs.picker
    const pickerPlane = story.refs.pickerPlane
    const rgbaInputs = new Map(channels.map((key) => [key, story.refs.rgbaInputs.get(key)!]))
    const rangeInputs = new Map(channels.map((key) => [key, story.refs.rangeInputs.get(key)!]))

    expect(root).toBeInstanceOf(HTMLFieldSetElement)
    expect(legend).toBeInstanceOf(HTMLLegendElement)
    expect(trigger).toBeInstanceOf(HTMLButtonElement)
    expect(trigger.getAttribute("aria-controls")).toBe(story.refs.pickerId)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(trigger.hasAttribute("hidden")).toBeFalse()
    expect(picker.hasAttribute("hidden")).toBeTrue()
    expect(pickerPlane.getAttribute("role")).toBe("group")
    expect(story.args).toEqual(colorInputClosedStoryDefaultArgs)

    story.update(colorInputOpenStoryDefaultArgs)
    expect(story.element).toBe(root)
    expect(story.refs.legend).toBe(legend)
    expect(story.refs.legendText).toBe(legendText)
    expect(story.refs.trigger).toBe(trigger)
    expect(story.refs.triggerText).toBe(triggerText)
    expect(story.refs.picker).toBe(picker)
    expect(story.refs.pickerPlane).toBe(pickerPlane)
    expect(root.className).toContain("--open")
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(trigger.hasAttribute("hidden")).toBeFalse()
    expect(picker.hasAttribute("hidden")).toBeFalse()

    story.update(colorInputExpandedStoryDefaultArgs)
    expect(root.className).toContain("--expanded")
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(trigger.hasAttribute("hidden")).toBeTrue()
    expect(picker.hasAttribute("hidden")).toBeFalse()
    for (const key of channels) {
      expect(story.refs.rgbaInputs.get(key)).toBe(rgbaInputs.get(key))
      expect(story.refs.rangeInputs.get(key)).toBe(rangeInputs.get(key))
      expect(rgbaInputs.get(key)!.type).toBe("text")
      expect(rangeInputs.get(key)!.type).toBe("range")
      expect(rangeInputs.get(key)!.min).toBe("0")
      expect(rangeInputs.get(key)!.max).toBe("1")
      expect(rangeInputs.get(key)!.step).toBe("any")
    }
  })

  test("uses only native bubbling input and click events for live updates", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const field = createColorFieldStory(document)
    const color = createColorInputStory(document)
    document.appendChild(host)
    host.append(field.element, color.element)
    const events: string[] = []
    host.addEventListener("input", (event) => {
      events.push(`${event.type}:${(event.target as HTMLInputElement).getAttribute("data-channel")}`)
    })
    host.addEventListener("click", (event) => {
      events.push(`${event.type}:${(event.target as HTMLButtonElement).localName}`)
    })

    const fieldRed = field.refs.inputs.get("r")!
    fieldRed.value = "0.4"
    fieldRed.dispatchEvent(new Event("input", {bubbles: true}))
    expect(field.args.value.r).toBe(0.4)

    const rgbaGreen = color.refs.rgbaInputs.get("g")!
    const rangeGreen = color.refs.rangeInputs.get("g")!
    rgbaGreen.value = "0.25"
    rgbaGreen.dispatchEvent(new Event("input", {bubbles: true}))
    expect(color.args.value.g).toBe(0.25)
    expect(rangeGreen.valueAsNumber).toBe(0.25)

    rangeGreen.valueAsNumber = 0.75
    rangeGreen.dispatchEvent(new Event("input", {bubbles: true}))
    expect(color.args.value.g).toBe(0.75)
    expect(rgbaGreen.value).toBe("0.75")

    color.refs.trigger.click()
    expect(color.args.presentation).toBe("open")
    expect(color.refs.picker.hasAttribute("hidden")).toBeFalse()
    expect(events).toEqual(["input:r", "input:g", "input:g", "click:button"])

    const argsBeforeUpdate = color.args
    color.update({...color.args, value: {r: 0.2, g: 0.3, b: 0.4, a: 0.5}})
    expect(events).toHaveLength(4)
    expect(color.args).not.toBe(argsBeforeUpdate)
  })

  test("locks ColorInput without replacing nodes or fabricating activation", () => {
    const story = createColorInputStory(createDocument(), {
      ...colorInputClosedStoryDefaultArgs,
      disabled: true,
    })
    const trigger = story.refs.trigger
    const picker = story.refs.picker
    let clicks = 0
    story.element.addEventListener("click", () => clicks += 1)

    trigger.click()
    expect(clicks).toBe(0)
    expect(story.args.presentation).toBe("closed")
    expect(picker.hasAttribute("hidden")).toBeTrue()
    expect(story.refs.rgbaInputs.get("r")!.disabled).toBeTrue()
    expect(story.refs.rangeInputs.get("r")!.disabled).toBeTrue()

    story.update({...colorInputOpenStoryDefaultArgs, readOnly: true})
    expect(story.refs.trigger).toBe(trigger)
    expect(trigger.disabled).toBeTrue()
    expect(story.refs.rgbaInputs.get("r")!.readOnly).toBeTrue()
    expect(story.refs.rangeInputs.get("r")!.disabled).toBeTrue()
  })

  test("derives honest live HTML, CSS and direct DOM TypeScript", () => {
    const field = createColorFieldStory(createDocument())
    const color = createColorInputStory(createDocument(), colorInputOpenStoryDefaultArgs)

    expect(field.source.html).toContain("<fieldset")
    expect(field.source.html).toContain("<legend")
    expect(field.source.html).toContain('type="text"')
    expect(field.source.html).not.toContain(' value="')
    expect(field.source.css).toBe(colorStoriesCss)
    expect(field.source.typescript).toContain('document.createElement("fieldset")')
    expect(field.source.typescript).toContain('document.createElement("legend")')
    expect(field.source.typescript).toContain('input.type = "text"')
    expect(field.source.typescript).toContain("input.value = channel.value")
    expect(field.source.typescript).toContain('input.addEventListener("input"')
    expect(field.source.typescript).not.toContain("createColorFieldStory")

    const red = color.refs.rgbaInputs.get("r")!
    red.value = "draft"
    expect(color.source.html).not.toContain(' value="')
    expect(color.source.html).toContain('aria-expanded="true"')
    expect(color.source.html).not.toContain(" hidden")
    expect(color.source.css).toBe(colorStoriesCss)
    expect(color.source.typescript).toContain('document.createElement("button")')
    expect(color.source.typescript).toContain('document.createElement("input")')
    expect(color.source.typescript).toContain('input.type = "range"')
    expect(color.source.typescript).toContain("input.valueAsNumber = channel.value")
    expect(color.source.typescript).toContain('"value": "draft"')
    expect(color.source.typescript).toContain('trigger.addEventListener("click"')
    expect(color.source.typescript).not.toContain("createColorInputStory")
  })

  test("rejects invalid RGBA and presentation before mutating stable trees", () => {
    const field = createColorFieldStory(createDocument())
    const color = createColorInputStory(createDocument())
    const fieldArgs = field.args
    const colorArgs = color.args
    const fieldRed = field.refs.inputs.get("r")!
    const trigger = color.refs.trigger

    expect(() => field.update({...field.args, value: {...field.args.value, r: Number.NaN}}))
      .toThrow("Color Field story value.r must be finite")
    expect(() => color.update({...color.args, value: {...color.args.value, a: 2}}))
      .toThrow("ColorInput story value.a must be between 0 and 1")
    expect(() => color.update({...color.args, presentation: "popup" as ColorInputStoryArgs["presentation"]}))
      .toThrow("Unknown ColorInput story presentation: popup")
    expect(field.args).toBe(fieldArgs)
    expect(color.args).toBe(colorArgs)
    expect(field.refs.inputs.get("r")).toBe(fieldRed)
    expect(fieldRed.value).toBe("0.18")
    expect(color.refs.trigger).toBe(trigger)
    expect(color.element.className).toContain("--closed")
  })

  test("disposes owned synchronization listeners without removing consumer trees", () => {
    const field = createColorFieldStory(createDocument())
    const color = createColorInputStory(createDocument())
    const fieldArgs = field.args
    const colorArgs = color.args
    field.dispose()
    color.dispose()

    field.refs.inputs.get("r")!.value = "0.9"
    field.refs.inputs.get("r")!.dispatchEvent(new Event("input", {bubbles: true}))
    color.refs.rgbaInputs.get("r")!.value = "0.9"
    color.refs.rgbaInputs.get("r")!.dispatchEvent(new Event("input", {bubbles: true}))
    color.refs.trigger.click()
    expect(field.args).toBe(fieldArgs)
    expect(color.args).toBe(colorArgs)
    expect(field.element.localName).toBe("fieldset")
    expect(color.element.localName).toBe("fieldset")
  })

  test("exports flat CSS and exact package boundary without retained owners", async () => {
    const source = await Bun.file(new URL("./color-stories.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    expect(colorStoriesCss).toContain("display: flex")
    expect(colorStoriesCss).toContain("flex-direction: column")
    expect(colorStoriesCss).toContain("[hidden]")
    expect(colorStoriesCss).not.toContain("&")
    expect(colorStoriesCss).not.toContain("calc(")
    for (const forbidden of [
      "UiSurface",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"),
      "defineStorybookStoryModule",
      'from "../color-input',
      'from "./internal/color-picker',
      "dispatchEvent",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/color-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-COLOR-STORIES-001")
  })
})
