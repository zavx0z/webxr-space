import {describe, expect, test} from "bun:test"
import {Event, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {Inspector} from "./inspector.tsx"
import {InspectorFieldFixture, InspectorFixture} from "./inspector-consumer-fixture.tsx"
import {uiIcons} from "./icons.ts"
import {createDocument} from "./test-document.ts"

describe("compiled production Inspector", () => {
  test("retains keyed category and section components through controlled interaction", () => {
    expect(isCompiledTemplate(Inspector)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const categories = [
      {id: "node", label: "N", iconSrc: uiIcons.settings, sectionIds: ["transform", "data"]},
      {id: "render", label: "R", iconSrc: uiIcons.visibilityOn, sectionIds: ["data"]}
    ]
    const sections = [
      {id: "transform", label: "Transform", content: "Location", expanded: true},
      {id: "data", label: "Data", content: "Output", expanded: false}
    ]
    root.render(InspectorFixture as any, {categories, selectedCategoryId: "node", query: "", sections})
    const inspector = host.querySelector("aside")!
    const category = inspector.querySelectorAll("nav button")[0] as HTMLButtonElement
    const transform = inspector.querySelector('[data-section-id="transform"]')!
    const header = transform.querySelector("button") as HTMLButtonElement
    const categoryIcon = category.querySelector("img")!
    const disclosureIcon = header.querySelector("img")!
    expect(categoryIcon.getAttribute("src")).toBe(uiIcons.settings)
    expect(categoryIcon.getAttribute("alt")).toBe("")
    expect(categoryIcon.getAttribute("aria-hidden")).toBe("true")
    expect(inspector.querySelector('input[type="search"]')!.parentElement!.querySelector("img")?.getAttribute("src"))
      .toBe(uiIcons.search)
    expect(inspector.querySelector('[title="Scene"] img')?.getAttribute("src")).toBe(uiIcons.resource)
    expect(disclosureIcon.getAttribute("src")).toBe(uiIcons.chevronDown)
    header.click()
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(header.querySelector("img")).toBe(disclosureIcon)
    expect(disclosureIcon.getAttribute("src")).toBe(uiIcons.chevronRight)
    const content = document.getElementById(header.getAttribute("aria-controls")!)!
    expect(content.hasAttribute("hidden")).toBe(true)

    const search = inspector.querySelector('input[type="search"]') as HTMLInputElement
    search.value = "data"
    search.dispatchEvent(new Event("input", {bubbles: true}))
    expect(transform.getAttributeNames().some(name => name.startsWith("data-z-"))).toBe(true)

    root.render(InspectorFixture as any, {
      categories: [categories[1]!, categories[0]!],
      selectedCategoryId: "node",
      query: "",
      sections: [sections[1]!, sections[0]!]
    })
    expect(host.querySelector("aside")).toBe(inspector)
    expect(inspector.querySelectorAll("nav button")[1]).toBe(category)
    expect(inspector.querySelector('[data-section-id="transform"]')).toBe(transform)
    expect(inspector.className).toBe("")
    expect(inspector.querySelector("main")).toBeNull()
    root.unmount()
  })

  test("composes a compiled Field as an authored section child", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(InspectorFieldFixture as any, {})
    expect(host.querySelector('[data-section-id="value"] [data-field-id="output"]')).not.toBeNull()
    expect([...host.querySelectorAll("*")].every(element => element.className === "")).toBe(true)
    root.unmount()
  })

  test("preserves exact rail/search geometry with class-free owner sheets", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(InspectorFixture as any, {
      categories: [{id: "node", label: "N", iconSrc: uiIcons.settings, sectionIds: ["data"]}],
      selectedCategoryId: "node",
      query: "",
      sections: [{id: "data", label: "Data", content: "Output", expanded: true}]
    })
    const inspector = host.querySelector("aside")!
    const rail = inspector.querySelector("nav")!
    const search = inspector.querySelector("input")!
    const content = inspector.querySelector('[aria-label="Inspector content"]')!
    const context = content.querySelector("div")!
    const section = inspector.querySelector('[data-section-id="data"]')!
    const sections = section.parentElement!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 320, height: 360}
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(rail)?.width).toBe(30)
    expect(frame.boxByNode.get(search)).toMatchObject({width: 115, height: 22})
    expect(frame.boxByNode.get(sections)?.y).toBe(frame.boxByNode.get(context)!.y + 28)
    expect(frame.boxByNode.get(section)?.y).toBe(frame.boxByNode.get(sections)!.contentY)
    expect(frame.displayList.some(item => item.kind === "image" && item.src === uiIcons.search)).toBe(true)
    renderer.dispose()
    root.unmount()
  })
})
