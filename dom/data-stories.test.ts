import {describe, expect, test} from "bun:test"
import {createDocument, HTMLElement} from "@zavx0z/dom"
import {
  createListStory,
  createTableStory,
  dataStoriesCss,
  listStoryDefaultArgs,
  tableStoryDefaultArgs,
} from "./data-stories.ts"

describe("native DOM data stories", () => {
  test("creates semantic listbox/listitem DOM and live source", () => {
    const story = createListStory(createDocument())
    expect(story.element.localName).toBe("ul")
    expect(story.element.getAttribute("role")).toBe("listbox")
    expect(story.refs.items.size).toBe(3)
    expect(story.refs.items.get("output")?.localName).toBe("li")
    expect(story.refs.items.get("output")?.getAttribute("aria-selected")).toBe("true")
    expect(story.source.html).toContain('<li aria-selected="true"')
    expect(story.source.typescript).toContain('document.createElement("ul")')
    expect(story.source.css).toBe(dataStoriesCss)
  })

  test("reorders and updates list rows without replacing retained nodes", () => {
    const story = createListStory(createDocument())
    const output = story.refs.items.get("output")
    story.update({
      title: "Updated scene",
      items: [
        {key: "output", label: "Final output", detail: "WebGPU", selected: false},
        {key: "mesh", label: "Mesh", detail: "Geometry", selected: true},
      ],
    })
    expect(story.refs.items.get("output")).toBe(output)
    expect(story.element.children[0]).toBe(output)
    expect(output?.textContent).toBe("Final outputWebGPU")
    expect(story.refs.items.has("camera")).toBeFalse()
    expect(story.refs.items.get("mesh")).toBeInstanceOf(HTMLElement)
    expect(story.args.items).toHaveLength(2)
  })

  test("creates semantic table ownership with exact keyed maps", () => {
    const story = createTableStory(createDocument())
    expect(story.element.localName).toBe("table")
    expect(story.refs.head.localName).toBe("thead")
    expect(story.refs.body.localName).toBe("tbody")
    expect(story.refs.headers.get("name")?.localName).toBe("th")
    expect(story.refs.rows.get("ui")?.localName).toBe("tr")
    expect(story.refs.cells.get("ui")?.get("time")?.localName).toBe("td")
    expect(story.refs.cells.get("ui")?.get("time")?.textContent).toBe("0.31 ms")
    expect(story.source.html).toContain("<thead")
    expect(story.source.html).toContain("<tbody")
  })

  test("preserves table row, header and cell identities across keyed updates", () => {
    const story = createTableStory(createDocument())
    const header = story.refs.headers.get("name")
    const row = story.refs.rows.get("ui")
    const cell = story.refs.cells.get("ui")?.get("name")
    story.update({
      title: "Updated passes",
      columns: [
        {key: "name", label: "Stage", width: 180},
        {key: "time", label: "Time", width: 120},
      ],
      rows: [
        {key: "ui", cells: {name: "XR UI", time: "0.29 ms"}},
        {key: "post", cells: {name: "Post", time: "0.12 ms"}},
      ],
    })
    expect(story.refs.headers.get("name")).toBe(header)
    expect(story.refs.rows.get("ui")).toBe(row)
    expect(story.refs.cells.get("ui")?.get("name")).toBe(cell)
    expect(story.refs.cells.get("ui")?.get("name")?.textContent).toBe("XR UI")
    expect(story.refs.headers.has("draws")).toBeFalse()
    expect(story.refs.rows.has("opaque")).toBeFalse()
  })

  test("rejects duplicate keys and malformed widths before mutation", () => {
    const list = createListStory(createDocument())
    const listChildren = [...list.element.childNodes]
    const previousListArgs = list.args
    expect(() => list.update({
      title: "Duplicate",
      items: [
        {key: "same", label: "One", detail: "", selected: false},
        {key: "same", label: "Two", detail: "", selected: false},
      ],
    })).toThrow("List item key must be unique: same")
    expect(list.element.childNodes).toEqual(listChildren)
    expect(list.args).toBe(previousListArgs)

    const table = createTableStory(createDocument())
    const previous = table.args
    expect(() => table.update({
      ...tableStoryDefaultArgs,
      columns: [{key: "bad", label: "Bad", width: 0}],
    })).toThrow("Table column width must be a positive finite number")
    expect(table.args).toBe(previous)
  })

  test("exports one exact DOM-only package boundary", async () => {
    const source = await Bun.file(new URL("./data-stories.ts", import.meta.url)).text()
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
      "../list",
      "../table",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/data-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-DATA-STORIES-001")
  })
})
