import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLInputElement,
} from "@zavx0z/dom"
import {
  advancedNativeControlStoriesCss,
  createProgressCheckboxStory,
  createSliderControlStory,
  progressCheckboxStoryDefaultArgs,
  sliderControlStoryDefaultArgs,
} from "./advanced-native-control-stories.ts"

describe("advanced native DOM control stories", () => {
  test("uses one stable range input with controlled native numeric properties", () => {
    const story = createSliderControlStory(createDocument())
    const input = story.element

    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input.type).toBe("range")
    expect(input.min).toBe("0")
    expect(input.max).toBe("100")
    expect(input.step).toBe("1")
    expect(input.valueAsNumber).toBe(50)
    expect(input.getAttribute("value")).toBeNull()
    expect(input.disabled).toBeFalse()
    expect(input.title).toBe("Slider control")
    expect(story.args).toEqual(sliderControlStoryDefaultArgs)

    story.update({min: 10, max: 20, step: 4, value: 16, disabled: true, title: "Stepped slider"})
    expect(story.element).toBe(input)
    expect(input.min).toBe("10")
    expect(input.max).toBe("20")
    expect(input.step).toBe("4")
    expect(input.valueAsNumber).toBe(18)
    expect(story.args.value).toBe(18)
    expect(input.disabled).toBeTrue()
    expect(input.title).toBe("Stepped slider")

    story.update({...story.args, value: 100, disabled: false})
    expect(input.valueAsNumber).toBe(18)
    expect(story.args.value).toBe(18)
    expect(input.getAttribute("value")).toBeNull()
  })

  test("mirrors ProgressCheckbox indeterminate/checked into exact ARIA states", () => {
    const story = createProgressCheckboxStory(createDocument())
    const input = story.element

    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input.type).toBe("checkbox")
    expect(input.checked).toBeTrue()
    expect(input.indeterminate).toBeTrue()
    expect(input.getAttribute("aria-checked")).toBe("mixed")
    expect(input.hasAttribute("checked")).toBeFalse()
    expect(input.hasAttribute("indeterminate")).toBeFalse()
    expect(story.args).toEqual(progressCheckboxStoryDefaultArgs)

    story.update({checked: true, indeterminate: false, disabled: false, title: "Complete"})
    expect(story.element).toBe(input)
    expect(input.getAttribute("aria-checked")).toBe("true")
    story.update({checked: false, indeterminate: false, disabled: true, title: "Pending"})
    expect(input.getAttribute("aria-checked")).toBe("false")
    expect(input.disabled).toBeTrue()

    input.checked = false
    input.indeterminate = true
    input.dispatchEvent(new Event("change", {bubbles: true}))
    expect(input.getAttribute("aria-checked")).toBe("mixed")
    expect(story.args.indeterminate).toBeFalse()
  })

  test("does not fabricate events and preserves native input/change bubbling", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const slider = createSliderControlStory(document)
    const progress = createProgressCheckboxStory(document)
    document.appendChild(host)
    host.append(slider.element, progress.element)
    const inputTargets: HTMLInputElement[] = []
    const changeTargets: HTMLInputElement[] = []
    host.addEventListener("input", (event) => inputTargets.push(event.target as HTMLInputElement))
    host.addEventListener("change", (event) => changeTargets.push(event.target as HTMLInputElement))

    slider.update({...slider.args, value: 75})
    progress.update({...progress.args, checked: false, indeterminate: false})
    expect(inputTargets).toEqual([])
    expect(changeTargets).toEqual([])

    slider.element.valueAsNumber = 25
    slider.element.dispatchEvent(new Event("input", {bubbles: true}))
    progress.element.checked = true
    progress.element.indeterminate = false
    progress.element.dispatchEvent(new Event("change", {bubbles: true}))
    expect(inputTargets).toEqual([slider.element])
    expect(changeTargets).toEqual([progress.element])
    expect(slider.args.value).toBe(75)
    expect(progress.args.checked).toBeFalse()
    expect(progress.element.getAttribute("aria-checked")).toBe("true")
  })

  test("derives honest live sources without value/checked/indeterminate attributes", () => {
    const document = createDocument()
    const slider = createSliderControlStory(document)
    const progress = createProgressCheckboxStory(document)

    expect(slider.source.html).toBe('<input class="ui-slider-control-story" max="100" min="0" step="1" title="Slider control" type="range">')
    expect(slider.source.html).not.toContain(" value=")
    expect(slider.source.typescript).toContain("input.valueAsNumber = 50")
    expect(slider.source.typescript).not.toContain("createSliderControlStory")
    expect(progress.source.html).toBe('<input aria-checked="mixed" class="ui-progress-checkbox-story" title="Progress checkbox" type="checkbox">')
    expect(progress.source.html).not.toContain(" checked")
    expect(progress.source.html).not.toContain(" indeterminate")
    expect(progress.source.typescript).toContain("input.checked = true")
    expect(progress.source.typescript).toContain("input.indeterminate = true")
    expect(progress.source.typescript).toContain('input.addEventListener("change", syncAriaChecked)')
    expect(progress.source.typescript).not.toContain("createProgressCheckboxStory")

    slider.element.valueAsNumber = 80
    progress.element.checked = false
    progress.element.indeterminate = false
    progress.element.dispatchEvent(new Event("change"))
    expect(slider.source.typescript).toContain("input.valueAsNumber = 80")
    expect(progress.source.typescript).toContain("input.checked = false")
    expect(progress.source.typescript).toContain("input.indeterminate = false")
    expect(progress.source.html).toContain('aria-checked="false"')
  })

  test("exports one flat stylesheet for track/thumb and progress indicator projection", () => {
    expect(advancedNativeControlStoriesCss).toContain(".ui-slider-control-story")
    expect(advancedNativeControlStoriesCss).toContain("width: 200px")
    expect(advancedNativeControlStoriesCss).toContain("height: 30px")
    expect(advancedNativeControlStoriesCss).toContain("padding: 4px 10px")
    expect(advancedNativeControlStoriesCss).toContain(".ui-progress-checkbox-story")
    expect(advancedNativeControlStoriesCss).toContain('[aria-checked="mixed"]')
    expect(advancedNativeControlStoriesCss).toContain('[aria-checked="true"]')
    expect(advancedNativeControlStoriesCss).not.toContain("&")
    expect(advancedNativeControlStoriesCss).not.toContain("calc(")
  })

  test("validates advanced args before changing stable inputs", () => {
    const slider = createSliderControlStory(createDocument())
    const progress = createProgressCheckboxStory(createDocument())
    const sliderArgs = slider.args
    const progressArgs = progress.args

    expect(() => slider.update({...slider.args, max: -1}))
      .toThrow("SliderControl story max must be greater than or equal to min")
    expect(() => slider.update({...slider.args, step: 0}))
      .toThrow("SliderControl story step must be greater than zero")
    expect(() => slider.update({...slider.args, value: Number.NaN}))
      .toThrow("SliderControl story value must be finite")
    expect(() => progress.update({...progress.args, indeterminate: "yes" as unknown as boolean}))
      .toThrow("ProgressCheckbox story indeterminate must be a boolean")
    expect(slider.args).toBe(sliderArgs)
    expect(progress.args).toBe(progressArgs)
  })

  test("keeps the batch independent from production factories and retained owners", async () => {
    const source = await Bun.file(new URL("./advanced-native-control-stories.ts", import.meta.url)).text()
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
      "../slider-control",
      "../progress-checkbox",
      "dispatchEvent",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/advanced-native-control-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-ADVANCED-NATIVE-CONTROL-STORIES-001")
  })
})
