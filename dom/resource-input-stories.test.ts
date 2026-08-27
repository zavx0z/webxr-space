import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLButtonElement,
  HTMLInputElement,
  HTMLOptionElement,
  HTMLSelectElement,
} from "@zavx0z/dom"
import {
  collectionInputStoryDefaultArgs,
  createCollectionInputStory,
  createPathInputStory,
  createReferenceInputStory,
  pathInputStoryDefaultArgs,
  referenceInputStoryDefaultArgs,
  resourceInputStoriesCss,
  type CollectionInputStoryArgs,
  type ReferenceInputStoryArgs,
} from "./resource-input-stories.ts"

describe("native DOM resource input stories", () => {
  test("creates one collapsed Reference select with keyed options", () => {
    const story = createReferenceInputStory(createDocument())

    expect(story.element).toBeInstanceOf(HTMLSelectElement)
    expect(story.element.value).toBe("material")
    expect(story.refs.options.size).toBe(3)
    expect(story.args).toEqual(referenceInputStoryDefaultArgs)
    for (const option of story.refs.options.values()) expect(option).toBeInstanceOf(HTMLOptionElement)
    expect(story.refs.options.get("material")?.selected).toBeTrue()
  })

  test("reorders Reference options without replacing persistent identities", () => {
    const story = createReferenceInputStory(createDocument())
    const select = story.element
    const material = story.refs.options.get("material")!
    const world = story.refs.options.get("world")!
    const none = story.refs.options.get("none")!
    story.update({
      value: "world",
      disabled: true,
      title: "World reference",
      options: [
        {key: "world", label: "Scene World", value: "world", disabled: false},
        {key: "none", label: "No reference", value: "", disabled: false},
        {key: "material", label: "Material", value: "material", disabled: true},
      ],
    })

    expect(story.element).toBe(select)
    expect(story.refs.options.get("material")).toBe(material)
    expect(story.refs.options.get("world")).toBe(world)
    expect(story.refs.options.get("none")).toBe(none)
    expect([...select.children]).toEqual([world, none, material])
    expect(world.textContent).toBe("Scene World")
    expect(material.disabled).toBeTrue()
    expect(select.value).toBe("world")
    expect(select.disabled).toBeTrue()
    expect(select.title).toBe("World reference")
  })

  test("creates a stable semantic Path label/input/button relation", () => {
    const story = createPathInputStory(createDocument())
    const {root, label, labelText, input, browse, controlId} = story.refs

    expect(story.element).toBe(root)
    expect(root.children).toEqual([label, input, browse])
    expect(label.localName).toBe("label")
    expect(label.children).toEqual([labelText])
    expect(label.getAttribute("for")).toBe(controlId)
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input.id).toBe(controlId)
    expect(input.getAttribute("aria-labelledby")).toBe(label.id)
    expect(input.type).toBe("text")
    expect(input.value).toBe("/output/render.png")
    expect(input.getAttribute("value")).toBeNull()
    expect(browse).toBeInstanceOf(HTMLButtonElement)
    expect(story.args).toEqual(pathInputStoryDefaultArgs)

    const browseText = browse.firstChild
    story.update({
      label: "Destination",
      value: "/tmp/output.exr",
      placeholder: "Select output",
      disabled: false,
      readOnly: true,
      title: "Destination path",
      browseTitle: "Choose destination",
    })
    expect(story.refs.root).toBe(root)
    expect(story.refs.input).toBe(input)
    expect(story.refs.browse).toBe(browse)
    expect(browse.firstChild).toBe(browseText)
    expect(input.value).toBe("/tmp/output.exr")
    expect(input.readOnly).toBeTrue()
    expect(browse.disabled).toBeTrue()
    expect(labelText.textContent).toBe("Destination")
  })

  test("creates keyed Collection listbox options and stable action buttons", () => {
    const story = createCollectionInputStory(createDocument())
    const {root, list, itemElements, addButton, removeButton} = story.refs

    expect(story.element).toBe(root)
    expect(list.localName).toBe("ul")
    expect(list.getAttribute("role")).toBe("listbox")
    expect(itemElements.size).toBe(3)
    expect(itemElements.get("second")?.getAttribute("role")).toBe("option")
    expect(itemElements.get("second")?.getAttribute("aria-selected")).toBe("true")
    expect(addButton).toBeInstanceOf(HTMLButtonElement)
    expect(removeButton).toBeInstanceOf(HTMLButtonElement)
    expect(story.args).toEqual(collectionInputStoryDefaultArgs)

    const first = itemElements.get("first")!
    const third = itemElements.get("third")!
    const second = itemElements.get("second")!
    const addText = addButton.firstChild
    story.update({
      title: "Reordered collection",
      selectedKey: "first",
      disabled: false,
      addTitle: "Append",
      removeTitle: "Delete",
      items: [
        {key: "third", label: "Third updated", disabled: false},
        {key: "first", label: "First updated", disabled: false},
        {key: "fourth", label: "Fourth", disabled: true},
      ],
    })
    expect(story.refs.itemElements.get("third")).toBe(third)
    expect(story.refs.itemElements.get("first")).toBe(first)
    expect([...list.children]).toEqual([third, first, story.refs.itemElements.get("fourth")!])
    expect(first.getAttribute("aria-selected")).toBe("true")
    expect(third.textContent).toBe("Third updated")
    expect(second.parentNode).toBeNull()
    expect(story.refs.itemElements.has("second")).toBeFalse()
    expect(addButton.firstChild).toBe(addText)
    expect(addButton.title).toBe("Append")
    expect(removeButton.disabled).toBeFalse()
  })

  test("preserves standard bubbling without fabricating input/change/click", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const reference = createReferenceInputStory(document)
    const path = createPathInputStory(document)
    const collection = createCollectionInputStory(document)
    document.appendChild(host)
    host.append(reference.element, path.element, collection.element)
    const events: Array<[string, unknown]> = []
    for (const type of ["input", "change", "click"]) {
      host.addEventListener(type, (event) => events.push([event.type, event.target]))
    }

    reference.update({...reference.args, value: "world"})
    path.update({...path.args, value: "/owned"})
    collection.update({...collection.args, selectedKey: "first"})
    expect(events).toEqual([])

    reference.element.value = "material"
    reference.element.dispatchEvent(new Event("change", {bubbles: true}))
    path.refs.input.value = "/typed"
    path.refs.input.dispatchEvent(new Event("input", {bubbles: true}))
    path.refs.browse.click()
    collection.refs.addButton.click()
    collection.refs.removeButton.click()
    collection.refs.itemElements.get("first")?.dispatchEvent(new Event("click", {bubbles: true}))

    expect(events.map(([type]) => type)).toEqual(["change", "input", "click", "click", "click", "click"])
    expect(events[0]?.[1]).toBe(reference.element)
    expect(events[1]?.[1]).toBe(path.refs.input)
    expect(reference.args.value).toBe("world")
    expect(path.args.value).toBe("/owned")
    expect(collection.args.selectedKey).toBe("first")
  })

  test("projects compact density and read-only collection state without replacing owners", () => {
    const path = createPathInputStory(createDocument())
    const collection = createCollectionInputStory(createDocument())
    const pathRoot = path.element
    const collectionRoot = collection.element
    const item = collection.refs.itemElements.get("second")

    path.update({...path.args, density: "compact"})
    collection.update({...collection.args, density: "compact", readOnly: true})

    expect(path.element).toBe(pathRoot)
    expect(path.element.className).toContain("ui-path-input-story--compact")
    expect(collection.element).toBe(collectionRoot)
    expect(collection.element.className).toContain("ui-collection-input-story--compact")
    expect(collection.refs.itemElements.get("second")).toBe(item)
    expect(collection.refs.list.getAttribute("aria-readonly")).toBe("true")
    expect(collection.refs.addButton.disabled).toBeTrue()
    expect(collection.refs.removeButton.disabled).toBeTrue()
  })

  test("derives honest live DOM/CSS/TypeScript sources", () => {
    const document = createDocument()
    const reference = createReferenceInputStory(document)
    const path = createPathInputStory(document)
    const collection = createCollectionInputStory(document)
    reference.element.value = "world"
    path.refs.input.value = "/live/path"

    expect(reference.source.css).toBe(resourceInputStoriesCss)
    expect(reference.source.html).toContain("<select")
    expect(reference.source.html).not.toContain(" selected")
    expect(reference.source.typescript).toContain('select.value = "world"')
    expect(reference.source.typescript).not.toContain("createReferenceInputStory")
    expect(path.source.css).toBe(resourceInputStoriesCss)
    expect(path.source.html).toContain(`<label class="ui-path-input-story__label" for="${path.refs.controlId}"`)
    expect(path.source.html).not.toContain(" value=")
    expect(path.source.typescript).toContain('input.value = "/live/path"')
    expect(path.source.typescript).not.toContain("createPathInputStory")
    expect(collection.source.css).toBe(resourceInputStoriesCss)
    expect(collection.source.html).toContain('role="listbox"')
    expect(collection.source.html).toContain('role="option"')
    expect(collection.source.typescript).toContain('document.createElement("li")')
    expect(collection.source.typescript).toContain('document.createElement("button")')
    expect(collection.source.typescript).not.toContain("createCollectionInputStory")
  })

  test("rejects invalid keyed resource data before mutating live trees", () => {
    const reference = createReferenceInputStory(createDocument())
    const collection = createCollectionInputStory(createDocument())
    const referenceChildren = [...reference.element.childNodes]
    const collectionChildren = [...collection.refs.list.childNodes]
    const referenceArgs = reference.args
    const collectionArgs = collection.args
    const duplicateReference: ReferenceInputStoryArgs = {
      ...reference.args,
      options: [
        {key: "same", label: "A", value: "a", disabled: false},
        {key: "same", label: "B", value: "b", disabled: false},
      ],
    }
    const danglingCollection: CollectionInputStoryArgs = {
      ...collection.args,
      selectedKey: "missing",
    }

    expect(() => reference.update(duplicateReference)).toThrow("ReferenceInput option key must be unique: same")
    expect(() => reference.update({...reference.args, value: "missing"}))
      .toThrow("ReferenceInput selected value does not exist: missing")
    expect(() => collection.update(danglingCollection))
      .toThrow("CollectionInput selected key does not exist: missing")
    expect(reference.element.childNodes).toEqual(referenceChildren)
    expect(collection.refs.list.childNodes).toEqual(collectionChildren)
    expect(reference.args).toBe(referenceArgs)
    expect(collection.args).toBe(collectionArgs)
  })

  test("keeps flat CSS and exact package boundary independent from old owners", async () => {
    const source = await Bun.file(new URL("./resource-input-stories.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    expect(resourceInputStoriesCss).toContain("display: flex")
    expect(resourceInputStoriesCss).toContain("flex-grow: 1")
    expect(resourceInputStoriesCss).toContain("overflow-y: auto")
    expect(resourceInputStoriesCss).toContain('[aria-selected="true"]')
    expect(resourceInputStoriesCss).not.toContain("&")
    for (const forbidden of [
      "UiSurface",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"),
      "defineStorybookStoryModule",
      "../reference-input",
      "../path-input",
      "../collection-input",
      "dispatchEvent",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/resource-input-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-RESOURCE-INPUT-STORIES-001")
  })
})
