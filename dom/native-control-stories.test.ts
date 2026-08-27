import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLInputElement,
} from "@zavx0z/dom"
import {
  checkboxStoryDefaultArgs,
  createCheckboxStory,
  createNumberInputStory,
  createSwitcherStory,
  nativeControlStoriesCss,
  numberInputStoryDefaultArgs,
  switcherStoryDefaultArgs,
} from "./native-control-stories.ts"

describe("native DOM control stories", () => {
  test("uses one stable number input with honest live value", () => {
    const story = createNumberInputStory(createDocument())
    const input = story.element

    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input.type).toBe("number")
    expect(input.value).toBe("42")
    expect(input.defaultValue).toBe("")
    expect(input.getAttribute("value")).toBeNull()
    expect(input.disabled).toBeFalse()
    expect(input.readOnly).toBeFalse()
    expect(input.title).toBe("Number input")
    expect(story.args).toEqual(numberInputStoryDefaultArgs)

    story.update({value: "7.5", disabled: true, readOnly: true, title: "Exact number"})
    expect(story.element).toBe(input)
    expect(input.type).toBe("number")
    expect(input.value).toBe("7.5")
    expect(input.getAttribute("value")).toBeNull()
    expect(input.disabled).toBeTrue()
    expect(input.readOnly).toBeTrue()
    expect(input.title).toBe("Exact number")
  })

  test("uses one stable checkbox with live checked and no checked attribute", () => {
    const story = createCheckboxStory(createDocument())
    const input = story.element

    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input.type).toBe("checkbox")
    expect(input.checked).toBeTrue()
    expect(input.defaultChecked).toBeFalse()
    expect(input.hasAttribute("checked")).toBeFalse()
    expect(input.title).toBe("Checkbox")
    expect(story.args).toEqual(checkboxStoryDefaultArgs)

    story.update({checked: false, disabled: true, title: "Disabled checkbox"})
    expect(story.element).toBe(input)
    expect(input.checked).toBeFalse()
    expect(input.hasAttribute("checked")).toBeFalse()
    expect(input.disabled).toBeTrue()
    expect(input.title).toBe("Disabled checkbox")
  })

  test("mirrors Switcher checked into role and aria-checked", () => {
    const story = createSwitcherStory(createDocument())
    const input = story.element

    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input.type).toBe("checkbox")
    expect(input.getAttribute("role")).toBe("switch")
    expect(input.checked).toBeTrue()
    expect(input.getAttribute("aria-checked")).toBe("true")
    expect(story.args).toEqual(switcherStoryDefaultArgs)

    story.update({checked: false, disabled: false, title: "Switcher off"})
    expect(story.element).toBe(input)
    expect(input.checked).toBeFalse()
    expect(input.getAttribute("aria-checked")).toBe("false")

    input.checked = true
    input.dispatchEvent(new Event("change", {bubbles: true}))
    expect(input.getAttribute("aria-checked")).toBe("true")
    expect(story.args.checked).toBeFalse()
  })

  test("does not fabricate events and preserves native input/change bubbling", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const number = createNumberInputStory(document)
    const checkbox = createCheckboxStory(document)
    const switcher = createSwitcherStory(document)
    document.appendChild(host)
    host.append(number.element, checkbox.element, switcher.element)
    const inputTargets: HTMLInputElement[] = []
    const changeTargets: HTMLInputElement[] = []
    host.addEventListener("input", (event) => inputTargets.push(event.target as HTMLInputElement))
    host.addEventListener("change", (event) => changeTargets.push(event.target as HTMLInputElement))

    number.update({...number.args, value: "64"})
    checkbox.update({...checkbox.args, checked: false})
    switcher.update({...switcher.args, checked: false})
    expect(inputTargets).toEqual([])
    expect(changeTargets).toEqual([])

    number.element.value = "128"
    number.element.dispatchEvent(new Event("input", {bubbles: true}))
    checkbox.element.checked = true
    checkbox.element.dispatchEvent(new Event("change", {bubbles: true}))
    switcher.element.checked = true
    switcher.element.dispatchEvent(new Event("change", {bubbles: true}))

    expect(inputTargets).toEqual([number.element])
    expect(changeTargets).toEqual([checkbox.element, switcher.element])
    expect(number.args.value).toBe("64")
    expect(checkbox.args.checked).toBeFalse()
    expect(switcher.args.checked).toBeFalse()
    expect(switcher.element.getAttribute("aria-checked")).toBe("true")
  })

  test("derives live source without fabricated value or checked attributes", () => {
    const document = createDocument()
    const number = createNumberInputStory(document)
    const checkbox = createCheckboxStory(document)
    const switcher = createSwitcherStory(document)

    expect(number.source.html).toBe('<input class="ui-number-input-story" title="Number input" type="number">')
    expect(number.source.html).not.toContain(" value=")
    expect(number.source.typescript).toContain('input.value = "42"')
    expect(checkbox.source.html).toBe('<input class="ui-checkbox-story" title="Checkbox" type="checkbox">')
    expect(checkbox.source.html).not.toContain(" checked")
    expect(checkbox.source.typescript).toContain("input.checked = true")
    expect(switcher.source.html).toBe('<input aria-checked="true" class="ui-switcher-story" role="switch" title="Switcher" type="checkbox">')
    expect(switcher.source.html).not.toContain(" checked")
    expect(switcher.source.typescript).toContain('input.setAttribute("role", "switch")')
    expect(switcher.source.typescript).toContain('input.addEventListener("change", syncAriaChecked)')

    number.element.value = "128.5"
    checkbox.element.checked = false
    switcher.element.checked = false
    switcher.element.dispatchEvent(new Event("change"))
    expect(number.source.typescript).toContain('input.value = "128.5"')
    expect(checkbox.source.typescript).toContain("input.checked = false")
    expect(switcher.source.typescript).toContain("input.checked = false")
    expect(switcher.source.html).toContain('aria-checked="false"')
  })

  test("exports one flat stylesheet for value and checked indicator projection", () => {
    expect(nativeControlStoriesCss).toContain(".ui-number-input-story")
    expect(nativeControlStoriesCss).toContain(".ui-checkbox-story")
    expect(nativeControlStoriesCss).toContain(".ui-switcher-story")
    expect(nativeControlStoriesCss).toContain('[aria-checked="true"]')
    expect(nativeControlStoriesCss).toContain("width: 120px")
    expect(nativeControlStoriesCss).toContain("width: 18px")
    expect(nativeControlStoriesCss).toContain("width: 36px")
    expect(nativeControlStoriesCss).not.toContain("&")
    expect(nativeControlStoriesCss).not.toContain("calc(")
  })

  test("validates args before changing stable controls", () => {
    const document = createDocument()
    const number = createNumberInputStory(document)
    const checkbox = createCheckboxStory(document)
    const switcher = createSwitcherStory(document)
    const numberArgs = number.args
    const checkboxArgs = checkbox.args
    const switcherArgs = switcher.args

    expect(() => number.update({...number.args, value: 1 as unknown as string}))
      .toThrow("NumberInput story value must be a string")
    expect(() => checkbox.update({...checkbox.args, checked: "yes" as unknown as boolean}))
      .toThrow("Checkbox story checked must be a boolean")
    expect(() => switcher.update({...switcher.args, disabled: "yes" as unknown as boolean}))
      .toThrow("Switcher story disabled must be a boolean")
    expect(number.args).toBe(numberArgs)
    expect(checkbox.args).toBe(checkboxArgs)
    expect(switcher.args).toBe(switcherArgs)
  })

  test("keeps the batch independent from production factories and retained owners", async () => {
    const source = await Bun.file(new URL("./native-control-stories.ts", import.meta.url)).text()
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
      "../number-input",
      "../checkbox",
      "../switcher",
      "dispatchEvent",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/native-control-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-NATIVE-CONTROL-STORIES-001")
  })
})
