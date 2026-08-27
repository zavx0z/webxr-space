import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLSelectElement,
  HTMLOptionElement,
} from "@zavx0z/dom"
import {
  createSelectStory,
  selectStoryCss,
  selectStoryDefaultArgs,
} from "./select-story.ts"

describe("native DOM Select story", () => {
  test("creates one exact collapsed select with option prototypes", () => {
    const story = createSelectStory(createDocument())
    expect(story.element).toBeInstanceOf(HTMLSelectElement)
    expect(story.element.localName).toBe("select")
    expect(story.element.value).toBe("output")
    expect(story.element.selectedIndex).toBe(1)
    expect(story.element.disabled).toBeFalse()
    expect(story.refs.options.size).toBe(3)
    expect(story.refs.options.get("output")).toBeInstanceOf(HTMLOptionElement)
    expect(story.refs.options.get("output")?.label).toBe("Output")
    expect(story.args).toEqual(selectStoryDefaultArgs)
  })

  test("preserves keyed option identity across reorder and live selection", () => {
    const story = createSelectStory(createDocument())
    const output = story.refs.options.get("output")
    const capture = story.refs.options.get("capture")
    story.update({
      value: "capture",
      disabled: true,
      title: "Capture mode",
      options: [
        {key: "capture", label: "Frame capture", value: "capture", disabled: false},
        {key: "output", label: "Final output", value: "output", disabled: false},
        {key: "stream", label: "Stream", value: "stream", disabled: true},
      ],
    })
    expect(story.refs.options.get("output")).toBe(output)
    expect(story.refs.options.get("capture")).toBe(capture)
    expect(story.element.children[0]).toBe(capture)
    expect(capture?.label).toBe("Frame capture")
    expect(story.element.value).toBe("capture")
    expect(story.element.selectedIndex).toBe(0)
    expect(story.element.disabled).toBeTrue()
    expect(story.refs.options.has("preview")).toBeFalse()
  })

  test("keeps DOM selection events native and owner args controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createSelectStory(document)
    document.appendChild(host)
    host.appendChild(story.element)
    const targets: HTMLSelectElement[] = []
    host.addEventListener("change", (event) => targets.push(event.target as HTMLSelectElement))

    story.update({...story.args, value: "preview"})
    expect(targets).toEqual([])
    story.element.value = "capture"
    story.element.dispatchEvent(new Event("change", {bubbles: true}))
    expect(targets).toEqual([story.element])
    expect(story.args.value).toBe("preview")
    expect(story.element.value).toBe("capture")
  })

  test("derives honest source from attributes plus live value assignment", () => {
    const story = createSelectStory(createDocument())
    expect(story.source.html).toStartWith('<select class="ui-select-story" title="Output mode">')
    expect(story.source.html).toContain('<option data-option-key="output" value="output">Output</option>')
    expect(story.source.html).not.toContain(" selected")
    expect(story.source.typescript).toContain('document.createElement("select")')
    expect(story.source.typescript).toContain('select.value = "output"')
    expect(story.source.css).toBe(selectStoryCss)
  })

  test("rejects duplicate keys and values before mutating the stable select", () => {
    const story = createSelectStory(createDocument())
    const children = [...story.element.childNodes]
    const previous = story.args
    expect(() => story.update({
      ...story.args,
      options: [
        {key: "same", label: "One", value: "one", disabled: false},
        {key: "same", label: "Two", value: "two", disabled: false},
      ],
    })).toThrow("Select option key must be unique: same")
    expect(() => story.update({
      ...story.args,
      options: [
        {key: "one", label: "One", value: "same", disabled: false},
        {key: "two", label: "Two", value: "same", disabled: false},
      ],
    })).toThrow("Select option value must be unique: same")
    expect(story.element.childNodes).toEqual(children)
    expect(story.args).toBe(previous)
  })

  test("exports one exact DOM-only package boundary", async () => {
    const source = await Bun.file(new URL("./select-story.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }
    for (const forbidden of ["@engine/core", "@layout/core", "@ui/elements", "../enum-input", "UiSurface"]) {
      expect(source).not.toContain(forbidden)
    }
    expect(manifest.exports["./dom/select-story"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-SELECT-STORY-001")
  })
})
