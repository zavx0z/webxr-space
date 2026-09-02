import {describe, expect, test} from "bun:test"
import {compiledStyleSheet, defineCompiledTemplate} from "./compiled.ts"
import {encodeCompiledStyleText} from "./style-codec.ts"

describe("compiled stylesheet ABI", () => {
  test("materializes compact transport before ordinary ABI validation", () => {
    const sheet = compiledStyleSheet(
      "z:compact",
      encodeCompiledStyleText("[data-z-owner]{display:block;background:var(--surface)}"),
    )

    expect(sheet).toEqual({
      id: "z:compact",
      cssText: "[data-z-owner]{display:block;background:var(--surface)}"
    })
    expect(Object.isFrozen(sheet)).toBe(true)
  })

  test("owns immutable deduplicated stylesheet metadata", () => {
    const source = {
      id: "button.root",
      cssText: "[data-z-button]{display:flex}",
      source: {
        kind: "authored-css" as const,
        moduleId: "@ui/components/button.tsx",
        componentName: "Button",
        cssText: "& { display: flex; }",
      },
    }
    const template = defineCompiledTemplate({
      bindingCount: 0,
      styleSheets: [source, {...source}],
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    })

    source.cssText = "changed"
    expect(template.styleSheets).toEqual([
      {
        id: "button.root",
        cssText: "[data-z-button]{display:flex}",
        source: {
          kind: "authored-css",
          moduleId: "@ui/components/button.tsx",
          componentName: "Button",
          cssText: "& { display: flex; }",
        },
      }
    ])
    expect(Object.isFrozen(template.styleSheets)).toBe(true)
    expect(Object.isFrozen(template.styleSheets[0])).toBe(true)
    expect(Object.isFrozen(template.styleSheets[0]!.source)).toBe(true)
    expect(defineCompiledTemplate({
      bindingCount: 0,
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    }).styleSheets).toEqual([])
  })

  test("fails closed for invalid and conflicting metadata", () => {
    expect(() => defineCompiledTemplate({
      bindingCount: 0,
      styleSheets: [{id: "", cssText: "a"}],
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    })).toThrow("non-empty id")
    expect(() => defineCompiledTemplate({
      bindingCount: 0,
      styleSheets: [
        {id: "same", cssText: "a"},
        {id: "same", cssText: "b"}
      ],
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    })).toThrow("conflicting cssText")
    expect(() => defineCompiledTemplate({
      bindingCount: 0,
      styleSheets: [{
        id: "invalid-source",
        cssText: "a",
        source: {
          kind: "authored-css",
          moduleId: "",
          componentName: "Button",
          cssText: "& { color: red; }",
        },
      }],
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    })).toThrow("invalid authored CSS source")
    expect(() => defineCompiledTemplate({
      bindingCount: 0,
      styleSheets: [
        {
          id: "same-source",
          cssText: "a",
          source: {
            kind: "authored-css",
            moduleId: "@fixture/one.tsx",
            componentName: "One",
            cssText: "& { color: red; }",
          },
        },
        {
          id: "same-source",
          cssText: "a",
          source: {
            kind: "authored-css",
            moduleId: "@fixture/two.tsx",
            componentName: "Two",
            cssText: "& { color: red; }",
          },
        },
      ],
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    })).toThrow("conflicting source metadata")
  })
})
