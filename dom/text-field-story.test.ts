import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLInputElement,
  type StateChangeBatch,
} from "@zavx0z/dom"
import {
  createTextFieldStory,
  textFieldStoryCss,
  textFieldStoryDefaultArgs,
  type TextFieldStoryArgs,
} from "./text-field-story.ts"

describe("native DOM TextField story", () => {
  test("creates one standard input with live value and no fake value attribute", () => {
    const story = createTextFieldStory(createDocument())

    expect(story.element).toBeInstanceOf(HTMLInputElement)
    expect(story.element.localName).toBe("input")
    expect(story.element.className).toBe("ui-text-field-story")
    expect(story.element.type).toBe("text")
    expect(story.element.value).toBe("Output")
    expect(story.element.defaultValue).toBe("")
    expect(story.element.getAttribute("value")).toBeNull()
    expect(story.element.placeholder).toBe("Enter output")
    expect(story.element.disabled).toBeFalse()
    expect(story.element.readOnly).toBeFalse()
    expect(story.element.title).toBe("Output")
    expect(story.args).toEqual(textFieldStoryDefaultArgs)
    expect(Object.isFrozen(story.args)).toBeTrue()
  })

  test("updates the same input through native-like properties and state changes", () => {
    const document = createDocument()
    const story = createTextFieldStory(document)
    const input = story.element
    const batches: StateChangeBatch[] = []
    document.appendChild(input)
    document.subscribeStateChanges((batch) => batches.push(batch))

    story.update({
      value: "Search value",
      placeholder: "Search output",
      disabled: true,
      readOnly: true,
      type: "search",
      title: "Search output",
    })

    expect(story.element).toBe(input)
    expect(input.type).toBe("search")
    expect(input.value).toBe("Search value")
    expect(input.getAttribute("value")).toBeNull()
    expect(input.placeholder).toBe("Search output")
    expect(input.disabled).toBeTrue()
    expect(input.readOnly).toBeTrue()
    expect(input.title).toBe("Search output")
    expect(batches.flatMap(({records}) => records).some((record) =>
      record.type === "input" &&
      record.target === input &&
      record.property === "value" &&
      record.oldValue === "Output" &&
      record.newValue === "Search value"
    )).toBeTrue()

    const stateVersion = document.stateVersion
    story.update(story.args)
    expect(document.stateVersion).toBe(stateVersion)
  })

  test("keeps native input bubbling and owner-controlled args separate", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createTextFieldStory(document)
    document.appendChild(host)
    host.appendChild(story.element)
    const events: Event[] = []
    host.addEventListener("input", (event) => events.push(event))

    story.element.value = "Typed value"
    story.element.dispatchEvent(new Event("input", {bubbles: true}))

    expect(events).toHaveLength(1)
    expect(events[0]?.target).toBe(story.element)
    expect(events[0]?.bubbles).toBeTrue()
    expect(story.element.value).toBe("Typed value")
    expect(story.args.value).toBe("Output")

    story.update({...story.args, value: "Owner value"})
    expect(story.element.value).toBe("Owner value")
    expect(story.args.value).toBe("Owner value")
  })

  test("distinguishes live value from the actual default value attribute in source", () => {
    const story = createTextFieldStory(createDocument())
    const initial = story.source

    expect(initial.html).toBe('<input class="ui-text-field-story" placeholder="Enter output" title="Output" type="text">')
    expect(initial.html).not.toContain(" value=")
    expect(initial.typescript).toContain('input.value = "Output"')
    expect(initial.typescript).not.toContain("defaultValue")
    expect(initial.typescript).not.toContain("createTextFieldStory")

    story.element.defaultValue = "Default & fallback"
    expect(story.element.value).toBe("Output")
    expect(story.element.defaultValue).toBe("Default & fallback")
    expect(story.source.html).toBe('<input class="ui-text-field-story" placeholder="Enter output" title="Output" type="text" value="Default &amp; fallback">')
    expect(story.source.typescript).toContain('input.value = "Output"')
  })

  test("exports exact flat CSS and live disabled/readOnly/type attributes", () => {
    const story = createTextFieldStory(createDocument(), {
      value: "Find",
      placeholder: "Find output",
      disabled: true,
      readOnly: true,
      type: "search",
      title: "Find",
    })
    const source = story.source

    expect(source.css).toBe(textFieldStoryCss)
    expect(source.css).toContain('.ui-text-field-story[type="search"]')
    expect(source.css).toContain(".ui-text-field-story[readonly]")
    expect(source.css).toContain(".ui-text-field-story[disabled]")
    expect(source.css).not.toContain("&")
    expect(source.html).toBe('<input class="ui-text-field-story" disabled placeholder="Find output" readonly title="Find" type="search">')
    expect(source.typescript).toContain('input.type = "search"')
    expect(source.typescript).toContain("input.disabled = true")
    expect(source.typescript).toContain("input.readOnly = true")
  })

  test("rejects malformed args before changing the native input", () => {
    const story = createTextFieldStory(createDocument())
    const input = story.element
    const previous = story.args

    expect(() => story.update({
      ...textFieldStoryDefaultArgs,
      type: "email" as TextFieldStoryArgs["type"],
    })).toThrow("Unknown TextField story type: email")
    expect(() => story.update({
      ...textFieldStoryDefaultArgs,
      readOnly: "yes" as unknown as boolean,
    })).toThrow("TextField story readOnly must be a boolean")
    expect(story.element).toBe(input)
    expect(story.args).toBe(previous)
    expect(story.element.value).toBe("Output")
  })

  test("keeps the proof independent from production TextField and retained owners", async () => {
    const source = await Bun.file(new URL("./text-field-story.ts", import.meta.url)).text()
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
      "../text-field",
      "./text-field",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/text-field-story"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-TEXT-FIELD-STORY-001")
  })
})
