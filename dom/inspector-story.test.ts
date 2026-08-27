import {describe, expect, test} from "bun:test"
import {
  createDocument,
  CustomEvent,
  Event,
  HTMLInputElement,
} from "@zavx0z/dom"
import {inspectorCss} from "../inspector.ts"
import {
  createInspectorStory,
  INSPECTOR_STORY_ARGS_CHANGE_EVENT,
  inspectorStoryDefaultArgs,
  type InspectorStoryArgs,
  type InspectorStoryArgsChange,
} from "./inspector-story.ts"

describe("DOM-only Inspector story", () => {
  test("owns one Inspector controller and returns its standard DOM element", () => {
    const document = createDocument()
    const story = createInspectorStory(document)

    expect(story.element).toBe(story.controller.element)
    expect(story.element.localName).toBe("aside")
    expect(story.controller.refs.search).toBeInstanceOf(HTMLInputElement)
    expect(story.controller.refs.search.type).toBe("search")
    expect(story.args).toEqual(inspectorStoryDefaultArgs)
    expect(Object.isFrozen(story.args)).toBeTrue()
    expect(story.controller.refs.categoryButtons.get("source")?.getAttribute("aria-pressed")).toBe("true")
    expect(story.controller.refs.sectionButtons.get("html")?.getAttribute("aria-expanded")).toBe("true")
  })

  test("updates the same controller, element and keyed DOM nodes from args", () => {
    const document = createDocument()
    const story = createInspectorStory(document)
    const controller = story.controller
    const element = story.element
    const sourceButton = controller.refs.categoryButtons.get("source")
    const eventsButton = controller.refs.categoryButtons.get("events")
    const eventsSection = controller.refs.sectionElements.get("events")

    story.update({
      category: "events",
      query: "event",
      htmlExpanded: false,
      cssExpanded: true,
      eventsExpanded: false,
    })

    expect(story.controller).toBe(controller)
    expect(story.element).toBe(element)
    expect(controller.refs.categoryButtons.get("source")).toBe(sourceButton)
    expect(controller.refs.categoryButtons.get("events")).toBe(eventsButton)
    expect(controller.refs.sectionElements.get("events")).toBe(eventsSection)
    expect(controller.refs.search.value).toBe("event")
    expect(controller.refs.search.getAttribute("value")).toBeNull()
    expect(sourceButton?.getAttribute("aria-pressed")).toBe("false")
    expect(eventsButton?.getAttribute("aria-pressed")).toBe("true")
    expect(controller.refs.sectionButtons.get("events")?.getAttribute("aria-expanded")).toBe("false")
    expect(controller.refs.sectionContents.get("events")?.hasAttribute("hidden")).toBeTrue()
  })

  test("turns native click and input into DOM-observable control updates", () => {
    const document = createDocument()
    const story = createInspectorStory(document)
    const changes: InspectorStoryArgsChange[] = []
    story.element.addEventListener(INSPECTOR_STORY_ARGS_CHANGE_EVENT, (event) => {
      changes.push((event as CustomEvent<InspectorStoryArgsChange>).detail)
    })

    story.controller.refs.categoryButtons.get("events")?.click()
    story.controller.refs.search.value = "event"
    story.controller.refs.search.dispatchEvent(new Event("input", {bubbles: true}))
    story.controller.refs.sectionButtons.get("events")?.click()

    expect(story.args).toEqual({
      category: "events",
      query: "event",
      htmlExpanded: true,
      cssExpanded: true,
      eventsExpanded: false,
    })
    expect(changes.map(({control, value}) => [control, value])).toEqual([
      ["category", "events"],
      ["query", "event"],
      ["eventsExpanded", false],
    ])
    expect(changes.every(({args}) => Object.isFrozen(args))).toBeTrue()
    expect(story.controller.refs.categoryButtons.get("events")?.getAttribute("aria-pressed")).toBe("true")
    expect(story.controller.refs.sectionButtons.get("events")?.getAttribute("aria-expanded")).toBe("false")
  })

  test("derives source from the live tree, exact CSS and current args", () => {
    const document = createDocument()
    const story = createInspectorStory(document)
    story.element.setAttribute("data-source-proof", "live & exact")
    story.update({
      category: "events",
      query: "log",
      htmlExpanded: false,
      cssExpanded: true,
      eventsExpanded: true,
    })
    const source = story.source

    expect(source.css).toBe(inspectorCss)
    expect(source.html).toStartWith('<aside aria-label="Inspector story" class="ui-inspector" data-source-proof="live &amp; exact">')
    expect(source.html).toContain('<input aria-label="Search sections" class="ui-inspector__search" placeholder="Search sections" type="search">')
    expect(source.html).toContain('aria-pressed="true"')
    expect(source.html).toContain("<section")
    expect(source.typescript).toContain('from "@ui/components/inspector"')
    expect(source.typescript).toContain('"selectedCategoryId": "events"')
    expect(source.typescript).toContain('"query": "log"')
    expect(source.typescript).not.toContain("surface")
  })

  test("keeps the leaf independent from retained and old Storybook contracts", async () => {
    const source = await Bun.file(new URL("./inspector-story.ts", import.meta.url)).text()
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
      "storybook/source.ts",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/inspector-story"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-INSPECTOR-006")

    const story = createInspectorStory(createDocument())
    story.dispose()
    expect(() => story.update(inspectorStoryDefaultArgs)).toThrow("Inspector DOM story is disposed")
  })

  test("rejects malformed runtime args before changing the story", () => {
    const document = createDocument()
    const story = createInspectorStory(document)
    const previous = story.args

    expect(() => story.update({
      ...inspectorStoryDefaultArgs,
      category: "unknown" as InspectorStoryArgs["category"],
    })).toThrow("Unknown Inspector story category: unknown")
    expect(() => story.update({
      ...inspectorStoryDefaultArgs,
      htmlExpanded: "yes" as unknown as boolean,
    })).toThrow("Inspector story htmlExpanded must be a boolean")
    expect(story.args).toBe(previous)
  })
})
