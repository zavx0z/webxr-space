import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLDivElement,
  HTMLInputElement,
  HTMLSpanElement,
  Text,
} from "@zavx0z/dom"
import {
  controlGroupStoryDefaultArgs,
  createControlGroupStory,
  createFieldStory,
  fieldStoriesCss,
  fieldStoryDefaultArgs,
  type ControlGroupStoryArgs,
  type ControlGroupStoryRow,
  type FieldStoryArgs,
} from "./field-stories.ts"

describe("native DOM Field stories", () => {
  test("creates one stable semantic Field tree with generated label relation", () => {
    const story = createFieldStory(createDocument())
    const {root, label, labelText, control, controlId} = story.refs

    expect(story.element).toBe(root)
    expect(root).toBeInstanceOf(HTMLDivElement)
    expect(root.children).toEqual([label, control])
    expect(label.localName).toBe("label")
    expect(label.children).toEqual([labelText])
    expect(labelText).toBeInstanceOf(HTMLSpanElement)
    expect(labelText.firstChild).toBeInstanceOf(Text)
    expect(label.getAttribute("for")).toBe(controlId)
    expect(control).toBeInstanceOf(HTMLInputElement)
    expect(control.id).toBe(controlId)
    expect(control.getAttribute("aria-labelledby")).toBe(label.id)
    expect(controlId).toMatch(/^ui-field-story-control-\d+$/)
    expect(control.type).toBe("text")
    expect(control.value).toBe("Output")
    expect(control.getAttribute("value")).toBeNull()
    expect(story.args).toEqual(fieldStoryDefaultArgs)

    const second = createFieldStory(createDocument())
    expect(second.refs.controlId).not.toBe(controlId)
  })

  test("updates Field label/control properties without replacing semantic nodes", () => {
    const story = createFieldStory(createDocument())
    const refs = {...story.refs}
    const text = story.refs.labelText.firstChild

    story.update({
      label: "Iterations",
      value: "8",
      type: "number",
      disabled: true,
      readOnly: true,
      title: "Iteration count",
    })

    expect(story.refs.root).toBe(refs.root)
    expect(story.refs.label).toBe(refs.label)
    expect(story.refs.labelText).toBe(refs.labelText)
    expect(story.refs.labelText.firstChild).toBe(text)
    expect(story.refs.control).toBe(refs.control)
    expect(story.refs.control.id).toBe(refs.controlId)
    expect(story.refs.label.getAttribute("for")).toBe(refs.controlId)
    expect(text?.textContent).toBe("Iterations")
    expect(story.refs.control.type).toBe("number")
    expect(story.refs.control.value).toBe("8")
    expect(story.refs.control.disabled).toBeTrue()
    expect(story.refs.control.readOnly).toBeTrue()
    expect(story.refs.control.title).toBe("Iteration count")

    story.update({...story.args, value: "not-a-number", disabled: false})
    expect(story.refs.control.value).toBe("")
    expect(story.args.value).toBe("")
    expect(story.refs.control.getAttribute("value")).toBeNull()
  })

  test("keeps Field input bubbling and owner args controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createFieldStory(document)
    document.appendChild(host)
    host.appendChild(story.element)
    const events: Event[] = []
    host.addEventListener("input", (event) => events.push(event))

    story.refs.control.value = "Typed"
    story.refs.control.dispatchEvent(new Event("input", {bubbles: true}))

    expect(events).toHaveLength(1)
    expect(events[0]?.target).toBe(story.refs.control)
    expect(story.refs.control.value).toBe("Typed")
    expect(story.args.value).toBe("Output")
    story.update({...story.args, value: "Owned"})
    expect(story.refs.control.value).toBe("Owned")
  })

  test("creates keyed ControlGroup rows with stable per-row label relations", () => {
    const story = createControlGroupStory(createDocument())

    expect(story.element).toBeInstanceOf(HTMLDivElement)
    expect(story.refs.rowElements.size).toBe(3)
    expect(story.args).toEqual(controlGroupStoryDefaultArgs)
    const ids = new Set<string>()
    for (const row of story.args.rows) {
      const rowElement = story.refs.rowElements.get(row.key)
      const label = story.refs.labels.get(row.key)
      const labelText = story.refs.labelTexts.get(row.key)
      const control = story.refs.controls.get(row.key)
      expect(rowElement?.getAttribute("data-row-key")).toBe(row.key)
      expect(label?.localName).toBe("label")
      expect(labelText).toBeInstanceOf(HTMLSpanElement)
      expect(control).toBeInstanceOf(HTMLInputElement)
      expect(label?.getAttribute("for")).toBe(control?.id)
      expect(control?.getAttribute("aria-labelledby")).toBe(label?.id)
      ids.add(control!.id)
    }
    expect(ids.size).toBe(3)
    expect(story.element.children.at(-1)?.className).toContain("--last")
  })

  test("reorders persistent ControlGroup rows without changing their identities", () => {
    const story = createControlGroupStory(createDocument())
    const xRow = story.refs.rowElements.get("x")!
    const xLabel = story.refs.labels.get("x")!
    const xControl = story.refs.controls.get("x")!
    const xId = xControl.id
    const nameRow = story.refs.rowElements.get("name")!
    const yRow = story.refs.rowElements.get("y")!
    const nextRows: readonly ControlGroupStoryRow[] = [
      {key: "name", label: "Output", value: "Result", type: "text", disabled: false, readOnly: false, title: "Output name"},
      {key: "x", label: "Horizontal", value: "3.5", type: "number", disabled: false, readOnly: true, title: "Horizontal value"},
      {key: "z", label: "Z", value: "9", type: "number", disabled: true, readOnly: false, title: "Z value"},
    ]

    story.update({title: "Reordered coordinates", rows: nextRows})

    expect(story.refs.rowElements.get("name")).toBe(nameRow)
    expect(story.refs.rowElements.get("x")).toBe(xRow)
    expect(story.refs.labels.get("x")).toBe(xLabel)
    expect(story.refs.controls.get("x")).toBe(xControl)
    expect(story.refs.controls.get("x")?.id).toBe(xId)
    expect(story.element.children).toEqual([
      nameRow,
      xRow,
      story.refs.rowElements.get("z")!,
    ])
    expect(story.refs.labelTexts.get("x")?.textContent).toBe("Horizontal")
    expect(story.refs.controls.get("x")?.value).toBe("3.5")
    expect(story.refs.controls.get("x")?.readOnly).toBeTrue()
    expect(story.refs.rowElements.has("y")).toBeFalse()
    expect(yRow.parentNode).toBeNull()
    expect(story.element.children.at(-1)?.className).toContain("--last")
    expect(nameRow.className).not.toContain("--last")
  })

  test("rejects invalid ControlGroup keys before mutating the existing tree", () => {
    const story = createControlGroupStory(createDocument())
    const children = [...story.element.childNodes]
    const xControl = story.refs.controls.get("x")
    const previous = story.args
    const duplicate: ControlGroupStoryArgs = {
      title: "Duplicate",
      rows: [
        {key: "x", label: "A", value: "1", type: "number", disabled: false, readOnly: false, title: "A"},
        {key: "x", label: "B", value: "2", type: "number", disabled: false, readOnly: false, title: "B"},
      ],
    }

    expect(() => story.update(duplicate)).toThrow("ControlGroup row key must be unique: x")
    expect(() => story.update({title: "Empty", rows: [
      {key: "", label: "A", value: "1", type: "number", disabled: false, readOnly: false, title: "A"},
    ]})).toThrow("ControlGroup row key must not be empty")
    expect(story.element.childNodes).toEqual(children)
    expect(story.refs.controls.get("x")).toBe(xControl)
    expect(story.args).toBe(previous)
  })

  test("derives live DOM/CSS/TypeScript sources without value attributes", () => {
    const document = createDocument()
    const field = createFieldStory(document)
    const group = createControlGroupStory(document)
    field.refs.control.value = "Live field"
    group.refs.controls.get("name")!.value = "Live group"

    expect(field.source.css).toBe(fieldStoriesCss)
    expect(group.source.css).toBe(fieldStoriesCss)
    expect(field.source.html).toContain(`<label class="ui-field-story__label" for="${field.refs.controlId}" id="${field.refs.label.id}">`)
    expect(field.source.html).toContain(`<input aria-labelledby="${field.refs.label.id}" class="ui-field-story__control" id="${field.refs.controlId}" title="Output name" type="text">`)
    expect(field.source.html).not.toContain(" value=")
    expect(field.source.typescript).toContain('control.value = "Live field"')
    expect(field.source.typescript).toContain('document.createElement("label")')
    expect(field.source.typescript).not.toContain("createFieldStory")
    expect(group.source.html).toContain('data-row-key="name"')
    expect(group.source.html).not.toContain(" value=")
    expect(group.source.typescript).toContain('"value": "Live group"')
    expect(group.source.typescript).toContain('label.setAttribute("for", row.controlId)')
    expect(group.source.typescript).not.toContain("createControlGroupStory")
  })

  test("keeps flat CSS and package boundary independent from retained owners", async () => {
    const source = await Bun.file(new URL("./field-stories.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    expect(fieldStoriesCss).toContain("display: flex")
    expect(fieldStoriesCss).toContain("flex-direction: row")
    expect(fieldStoriesCss).toContain("gap: 8px")
    expect(fieldStoriesCss).toContain("border-bottom: 1px")
    expect(fieldStoriesCss).not.toContain("&")
    for (const forbidden of [
      "UiSurface",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"),
      "defineStorybookStoryModule",
      "../field",
      "../control-group",
      "dispatchEvent",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/field-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-FIELD-STORIES-001")
  })

  test("validates Field args before changing stable nodes", () => {
    const story = createFieldStory(createDocument())
    const previous = story.args
    const control = story.refs.control

    expect(() => story.update({...fieldStoryDefaultArgs, type: "email" as FieldStoryArgs["type"]}))
      .toThrow("Unknown Field story type: email")
    expect(() => story.update({...fieldStoryDefaultArgs, disabled: "yes" as unknown as boolean}))
      .toThrow("Field story disabled must be a boolean")
    expect(story.args).toBe(previous)
    expect(story.refs.control).toBe(control)
  })
})
