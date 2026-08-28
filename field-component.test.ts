import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {Field, fieldComponentCss, type FieldDefinition} from "./field-component.tsx"
import {DuplicateIdFieldsFixture} from "./field-consumer-fixture.tsx"

describe("compiled discriminated Field composition", () => {
  test("retains the owner and exact native control while proposing controlled text", () => {
    expect(isCompiledTemplate(Field)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    root.render(Field as any, {definition: {
      id: "name",
      label: "Name",
      kind: "text",
      value: "Alpha",
      onChange: (value: string) => values.push(value)
    }})
    const owner = host.querySelector('[data-field-id="name"]')!
    const input = owner.querySelector("input") as HTMLInputElement
    input.value = "Beta"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual(["Beta"])

    root.render(Field as any, {definition: {id: "name", label: "Name", kind: "text", value: "Beta"}})
    expect(host.querySelector('[data-field-id="name"]')).toBe(owner)
    expect(owner.querySelector("input")).toBe(input)
    expect(input.value).toBe("Beta")
    expect(owner.querySelector('[role="group"]')!.getAttribute("aria-labelledby")).toBe(owner.querySelector("span")!.id)
    root.unmount()
  })

  test("covers every semantic kind through production component owners", () => {
    const definitions: FieldDefinition[] = [
      {id: "f", label: "Text", kind: "text", value: "value"},
      {id: "f", label: "Number", kind: "number", value: 1},
      {id: "f", label: "Slider", kind: "number", value: 1, presentation: "slider", min: 0, max: 2},
      {id: "f", label: "Integer", kind: "integer", value: 1},
      {id: "f", label: "Boolean", kind: "boolean", value: true},
      {id: "f", label: "Switch", kind: "boolean", value: false, presentation: "switch"},
      {id: "f", label: "Enum", kind: "enum", value: "a", options: [{value: "a", label: "Alpha"}]},
      {id: "f", label: "Color", kind: "color", value: {r: 1, g: 0, b: 0, a: 1}},
      {id: "f", label: "Vector", kind: "vector", value: [1, 2, 3]},
      {id: "f", label: "Rotation", kind: "rotation", value: [0, 0, 0]},
      {id: "f", label: "Matrix", kind: "matrix", value: [[1, 0], [0, 1]]},
      {id: "f", label: "Reference", kind: "reference", value: {id: "node", label: "Node"}},
      {id: "f", label: "Collection", kind: "collection", items: [{id: "a", label: "Alpha"}], selectedId: "a"},
      {id: "f", label: "Path", kind: "path", value: "/tmp"},
      {id: "f", label: "Readonly", kind: "readonly", value: "Ready"}
    ]
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    let owner: import("@zavx0z/dom").Element | null = null
    for (const definition of definitions) {
      root.render(Field as any, {definition})
      const next = host.querySelector('[data-field-id="f"]')!
      if (owner !== null) expect(next).toBe(owner)
      owner = next
      expect(next.getAttribute("data-field-kind")).toBe(definition.kind)
      expect(next.querySelector('[role="group"]')!.childNodes.some(node => node.nodeType === 1)).toBe(true)
    }
    expect([...host.querySelectorAll("*")].every(element => element.className === "")).toBe(true)
    root.unmount()
  })

  test("keeps the 28px field row law and a class-free aggregate sheet", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(Field as any, {definition: {id: "status", label: "Status", kind: "readonly", value: "Ready"}})
    const owner = host.querySelector('[data-field-id="status"]')!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 480, height: 120},
      styleSheets: [fieldComponentCss]
    })
    expect(renderer.flush().boxByNode.get(owner)?.height).toBe(28)
    expect(fieldComponentCss).not.toContain(".ui-")
    renderer.dispose()
    root.unmount()
  })

  test("uses unique stable label ids even when semantic Field ids repeat", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(DuplicateIdFieldsFixture as any, {})
    const fields = [...host.querySelectorAll('[data-field-id="same"]')]
    const labels = fields.map(field => field.querySelector("span")!.id)
    expect(new Set(labels).size).toBe(2)
    expect(fields.map(field => field.querySelector('[role="group"]')!.getAttribute("aria-labelledby"))).toEqual(labels)
    root.render(DuplicateIdFieldsFixture as any, {})
    expect(fields.map(field => field.querySelector("span")!.id)).toEqual(labels)
    root.unmount()
  })
})
