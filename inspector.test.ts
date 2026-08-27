import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLButtonElement,
  HTMLInputElement,
  type HTMLElement,
} from "@zavx0z/dom"
import {
  createInspector,
  inspectorCss,
  type InspectorDomProps,
} from "./inspector.ts"

describe("DOM-only Inspector", () => {
  test("creates the standard semantic tree and HTML state attributes", () => {
    const document = createDocument()
    const contentNode = document.createElement("span")
    contentNode.textContent = "Semantic content"
    const controller = createInspector(document, fixture({contentNode}))
    const {refs} = controller

    expect(controller.element).toBe(refs.root)
    expect(refs.root.localName).toBe("aside")
    expect(refs.root.className).toBe("ui-inspector")
    expect(refs.root.children).toEqual([refs.toolbar, refs.body])
    expect(refs.toolbar.localName).toBe("header")
    expect(refs.toolbar.children).toEqual([refs.search])
    expect(refs.search).toBeInstanceOf(HTMLInputElement)
    expect(refs.search.localName).toBe("input")
    expect(refs.search.type).toBe("search")
    expect(refs.search.value).toBe("")
    expect(refs.search.defaultValue).toBe("")
    expect(refs.search.getAttribute("value")).toBeNull()
    expect(refs.search.placeholder).toBe("Search")
    expect(refs.body.localName).toBe("div")
    expect(refs.body.children).toEqual([refs.rail, refs.content])
    expect(refs.rail.localName).toBe("nav")
    expect(refs.rail.getAttribute("aria-label")).toBe("Categories")
    expect(refs.content.localName).toBe("main")
    expect(refs.content.children).toEqual([refs.context, refs.sections])

    const sourceButton = refs.categoryButtons.get("source")
    const eventsButton = refs.categoryButtons.get("events")
    expect(sourceButton).toBeInstanceOf(HTMLButtonElement)
    expect(sourceButton?.localName).toBe("button")
    expect(sourceButton?.title).toBe("Source files")
    expect(sourceButton?.getAttribute("aria-pressed")).toBe("true")
    expect(eventsButton?.title).toBe("Events")
    expect(eventsButton?.getAttribute("aria-pressed")).toBe("false")
    expect(eventsButton?.className).toContain("ui-inspector__category--group-start")

    const htmlSection = refs.sectionElements.get("html")!
    const htmlButton = refs.sectionButtons.get("html")!
    const htmlContent = refs.sectionContents.get("html")!
    expect(htmlSection.localName).toBe("section")
    expect(htmlSection.children).toEqual([htmlButton, htmlContent])
    expect(htmlButton).toBeInstanceOf(HTMLButtonElement)
    expect(htmlButton.getAttribute("aria-expanded")).toBe("true")
    expect(htmlButton.title).toBe("HTML")
    expect(htmlContent.children).toEqual([contentNode])
    expect(refs.context.textContent).toBe("Button")

    expect(inspectorCss).toContain(".ui-inspector__body")
    expect(inspectorCss).toContain("display: flex")
    expect(inspectorCss).toContain('[aria-pressed="true"]')
    expect(inspectorCss).toContain("overflow-y: auto")
    expect(inspectorCss).not.toContain("&")
  })

  test("dispatches click and input intent through standard DOM listeners", () => {
    const document = createDocument()
    const categories: string[] = []
    const sections: Array<[string, boolean]> = []
    const queries: string[] = []
    const controller = createInspector(document, fixture({
      onCategoryChange: (id) => categories.push(id),
      onSectionToggle: (id, expanded) => sections.push([id, expanded]),
      onQueryChange: (query) => queries.push(query),
    }))
    const bubbled: string[] = []
    controller.element.addEventListener("click", (event) => {
      if (event.target === controller.refs.categoryButtons.get("events")) bubbled.push("events")
    })

    controller.refs.categoryButtons.get("events")?.click()
    controller.refs.sectionButtons.get("html")?.click()
    controller.refs.search.value = "css"
    controller.refs.search.dispatchEvent(new Event("input", {bubbles: true}))

    expect(categories).toEqual(["events"])
    expect(sections).toEqual([["html", false]])
    expect(queries).toEqual(["css"])
    expect(bubbled).toEqual(["events"])
    expect(controller.refs.categoryButtons.get("source")?.getAttribute("aria-pressed")).toBe("true")
    expect(controller.refs.sectionButtons.get("html")?.getAttribute("aria-expanded")).toBe("true")

    controller.update(fixture({
      disabledCategoryId: "events",
      onCategoryChange: (id) => categories.push(`disabled:${id}`),
    }))
    controller.refs.categoryButtons.get("events")?.click()
    expect(categories).toEqual(["events"])

    const sourceButton = controller.refs.categoryButtons.get("source")!
    controller.dispose()
    sourceButton.click()
    controller.refs.search.value = "disposed"
    controller.refs.search.dispatchEvent(new Event("input"))
    expect(categories).toEqual(["events"])
    expect(queries).toEqual(["css"])
    expect(controller.refs.categoryButtons.size).toBe(0)
    expect(() => controller.update(fixture())).toThrow("Inspector DOM controller is disposed")
  })

  test("preserves keyed nodes across updates, reorder and controlled state changes", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const contentNode = document.createElement("span")
    contentNode.textContent = "Stable"
    const firstEvents: string[] = []
    const controller = createInspector(document, fixture({
      contentNode,
      onCategoryChange: (id) => firstEvents.push(`old:${id}`),
    }))
    host.appendChild(controller.element)

    const root = controller.element
    const regions = {...controller.refs}
    const sourceButton = controller.refs.categoryButtons.get("source")!
    const eventsButton = controller.refs.categoryButtons.get("events")!
    const htmlSection = controller.refs.sectionElements.get("html")!
    const htmlButton = controller.refs.sectionButtons.get("html")!
    const htmlContent = controller.refs.sectionContents.get("html")!
    const nextEvents: string[] = []

    controller.update({
      ariaLabel: "Updated inspector",
      categories: [
        {id: "events", label: "Event log", sectionIds: ["events"]},
        {id: "source", label: "Sources", title: "Updated source title", groupStart: true, sectionIds: ["html"]},
      ],
      selectedCategoryId: "events",
      query: "event",
      searchPlaceholder: "Filter",
      context: {label: "Updated context"},
      sections: [
        {id: "events", label: "Events", expanded: true, content: "Event body"},
        {id: "html", label: "Markup", expanded: false, content: contentNode},
      ],
      onCategoryChange: (id) => nextEvents.push(id),
    })

    expect(controller.element).toBe(root)
    expect(controller.refs.toolbar).toBe(regions.toolbar)
    expect(controller.refs.search).toBe(regions.search)
    expect(controller.refs.body).toBe(regions.body)
    expect(controller.refs.rail).toBe(regions.rail)
    expect(controller.refs.content).toBe(regions.content)
    expect(controller.refs.context).toBe(regions.context)
    expect(controller.refs.sections).toBe(regions.sections)
    expect(controller.refs.search.value).toBe("event")
    expect(controller.refs.search.placeholder).toBe("Filter")
    expect(controller.refs.search.getAttribute("value")).toBeNull()
    expect(controller.refs.categoryButtons.get("source")).toBe(sourceButton)
    expect(controller.refs.categoryButtons.get("events")).toBe(eventsButton)
    expect(controller.refs.sectionElements.get("html")).toBe(htmlSection)
    expect(controller.refs.sectionButtons.get("html")).toBe(htmlButton)
    expect(controller.refs.sectionContents.get("html")).toBe(htmlContent)
    expect(htmlContent.children).toEqual([contentNode])
    expect(controller.refs.rail.children).toEqual([eventsButton, sourceButton])
    expect(eventsButton.getAttribute("aria-pressed")).toBe("true")
    expect(sourceButton.title).toBe("Updated source title")
    expect(htmlButton.getAttribute("aria-expanded")).toBe("false")
    expect(htmlSection.hasAttribute("hidden")).toBeTrue()
    sourceButton.click()
    expect(firstEvents).toEqual([])
    expect(nextEvents).toEqual(["source"])

    controller.update({
      categories: [{id: "events", label: "Event log", sectionIds: ["events"]}],
      selectedCategoryId: "events",
      query: "",
      sections: [{id: "events", label: "Events", expanded: true}],
    })
    sourceButton.click()
    htmlButton.click()
    expect(sourceButton.parentNode).toBeNull()
    expect(htmlSection.parentNode).toBeNull()
    expect(controller.refs.categoryButtons.has("source")).toBeFalse()
    expect(controller.refs.sectionElements.has("html")).toBeFalse()
    expect(nextEvents).toEqual(["source"])
  })

  test("validates identities before changing an existing tree", () => {
    const document = createDocument()
    const controller = createInspector(document, fixture())
    const sourceButton = controller.refs.categoryButtons.get("source")
    const sectionCount = controller.refs.sectionElements.size

    expect(() => controller.update({
      categories: [{id: "source", label: "A"}, {id: "source", label: "B"}],
      selectedCategoryId: "source",
      query: "",
      sections: [],
    })).toThrow("Inspector category id must be unique: source")
    expect(() => controller.update({
      categories: [{id: "source", label: "A", sectionIds: ["missing"]}],
      selectedCategoryId: "source",
      query: "",
      sections: [],
    })).toThrow("Inspector category references unknown section: source/missing")
    expect(() => controller.update({
      categories: [{id: "source", label: "A"}],
      selectedCategoryId: "missing",
      query: "",
      sections: [],
    })).toThrow("Inspector selected category does not exist: missing")
    const sharedContent = document.createElement("span")
    expect(() => controller.update({
      categories: [{id: "source", label: "A"}],
      selectedCategoryId: "source",
      query: "",
      sections: [
        {id: "one", label: "One", expanded: true, content: sharedContent},
        {id: "two", label: "Two", expanded: true, content: sharedContent},
      ],
    })).toThrow("Inspector content node has multiple owners: two")

    expect(controller.refs.categoryButtons.get("source")).toBe(sourceButton)
    expect(controller.refs.sectionElements.size).toBe(sectionCount)
  })

  test("keeps the public leaf DOM-only and wired through its exact package path", async () => {
    const source = await Bun.file(new URL("./inspector.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("./package.json", import.meta.url)).json() as {
      exports: Record<string, string>
      dependencies: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    expect(source).toContain("search.value")
    expect(source).not.toContain('getAttribute("value")')
    for (const forbidden of ["UiSurface", "@engine/core", "@layout/core", "@ui/elements", "@zavx0z/renderer"]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).not.toMatch(/\b(?:x|y|width|height): number\b/)
    expect(manifest.exports["./inspector"]).toBe("./inspector.ts")
    expect(manifest.exports["./dom/inspector"]).toBeUndefined()
    expect(manifest.dependencies["@zavx0z/dom"]).toBe("link:@zavx0z/dom")
    expect(requirements).toContain("UI-DOM-INSPECTOR-001")
    expect(requirements).toContain("HTMLInputElement")
  })
})

function fixture(options: Readonly<{
  contentNode?: HTMLElement
  disabledCategoryId?: string
  onCategoryChange?(id: string): void
  onQueryChange?(query: string): void
  onSectionToggle?(id: string, expanded: boolean): void
}> = {}): InspectorDomProps {
  return {
    ariaLabel: "Inspector",
    categories: [
      {id: "source", label: "Source", title: "Source files", sectionIds: ["html"]},
      {
        id: "events",
        label: "Events",
        groupStart: true,
        sectionIds: ["events"],
        ...(options.disabledCategoryId === "events" ? {disabled: true} : {}),
      },
    ],
    selectedCategoryId: "source",
    query: "",
    searchLabel: "Search sections",
    searchPlaceholder: "Search",
    context: {label: "Button"},
    sections: [
      {
        id: "html",
        label: "HTML",
        expanded: true,
        ...(options.contentNode === undefined ? {content: "Markup"} : {content: options.contentNode}),
      },
      {id: "events", label: "Events", expanded: false, content: "Event stream"},
    ],
    ...(options.onCategoryChange === undefined ? {} : {onCategoryChange: options.onCategoryChange}),
    ...(options.onQueryChange === undefined ? {} : {onQueryChange: options.onQueryChange}),
    ...(options.onSectionToggle === undefined ? {} : {onSectionToggle: options.onSectionToggle}),
  }
}
