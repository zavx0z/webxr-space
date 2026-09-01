import {describe, expect, test} from "bun:test"
import {css} from "./css.ts"
import {getCssTemplateShape, parseCssTemplateShape} from "./css-shape.ts"

describe("scoped css tagged template", () => {
  test("caches one parsed shape by exact TemplateStringsArray identity", () => {
    const render = (color: string, offset: number) => css`
      color: ${color};
      transform: translateX(${offset}px);
      &:hover { background: var(--hover-color, rgb(1 2 3)); }
    `
    const first = render("red", 4)
    const second = render("blue", 8)
    const firstShape = getCssTemplateShape(first.strings)
    const secondShape = getCssTemplateShape(second.strings)

    expect(first.strings).toBe(second.strings)
    expect(firstShape).toBe(secondShape)
    expect(first.values).toEqual(["red", 4])
    expect(second.values).toEqual(["blue", 8])
    expect(Object.isFrozen(first.values)).toBe(true)
    expect(firstShape.rules).toHaveLength(2)
    expect(firstShape.rules[0]).toMatchObject({
      attributeSelectors: [],
      type: "rule",
      pseudo: "",
      pseudoClass: "",
      declarations: [
        {property: "color"},
        {property: "transform"},
      ],
    })
    expect(firstShape.rules[0]!.declarations[0]!.segments).toEqual([
      {type: "slot", index: 0},
    ])
    expect(firstShape.rules[0]!.declarations[1]!.segments).toEqual([
      {type: "static", value: "translateX("},
      {type: "slot", index: 1},
      {type: "static", value: "px)"},
    ])
    expect(firstShape.rules[1]!.declarations[0]!.segments).toEqual([
      {type: "static", value: "var(--hover-color, rgb(1 2 3))"},
    ])
  })

  test("preserves cooked strings and parses comments without String.raw", () => {
    const result = css`
      content: "line;{value}";
      transform: translateX(calc(2px + 3px));
      /* owner */ color: red;
    `
    const shape = getCssTemplateShape(result.strings)
    expect(result.strings[0]).toContain("line;{value}")
    expect(shape.rules[0]!.declarations.map(({property}) => property))
      .toEqual(["content", "transform", "color"])
  })

  test("fails raw generic runtime consumption with a precise error", () => {
    const result = css`color: red;`
    expect(() => Object.entries(result)).toThrow("generic runtime style binding")
  })

  test("rejects the redundant base selector with a migration diagnostic", () => {
    expect(() => css`& { color: red; }`)
      .toThrow("write base declarations directly and remove the & { } wrapper")
  })

  test("fails closed outside declaration values and outside the scoped selector profile", () => {
    expect(() => css`${"&"} { color: red; }`).toThrow("must start with &")
    expect(() => css`&:hover { ${"color"}: red; }`).toThrow("property names cannot contain interpolations")
    expect(() => css`${"color"}: red;`).toThrow("property names cannot contain interpolations")
    expect(() => css`color: red; ${"bad"}`).toThrow("CSS rule fragments require")
    expect(() => css`:root { color: red; }`).toThrow("must start with &")
    expect(() => css`& > span { color: red; }`).toThrow("Unsupported component CSS selector")
    expect(() => css`&:hover { color: red; &:focus { color: blue; } }`).toThrow("Nested")
    expect(() => css`@media (width > 1px) { color: red; }`).toThrow("must start with &")
  })

  test("preserves direct declarations, selector rules, and fragments in authored order", () => {
    const nested = css`&[data-size="large"]:hover { color: red; }`
    const result = css`
      display: block;
      ${false}
      color: red;
      ${nested}
      visibility: visible;
      ${undefined}
    `

    expect(result.values).toEqual([false, nested, undefined])
    const shape = getCssTemplateShape(result.strings)
    expect(shape.fragmentSlots).toEqual([0, 1, 2])
    expect(shape.items.map(item => item.type)).toEqual([
      "rule",
      "fragment",
      "rule",
      "fragment",
      "rule",
      "fragment",
    ])
    expect(shape.rules.map(rule =>
      rule.declarations.map(declaration => declaration.property)
    )).toEqual([["display"], ["color"], ["visibility"]])
    expect(getCssTemplateShape(nested.strings).rules[0]?.pseudo)
      .toBe('[data-size="large"]:hover')
    expect(getCssTemplateShape(nested.strings).rules[0]?.pseudoClass)
      .toBe(":hover")
    expect(getCssTemplateShape(nested.strings).rules[0]?.attributeSelectors)
      .toEqual([{name: "data-size", value: "large"}])
    expect(() => css`display: block; ${"color: red"}`).toThrow("CSS rule fragments require")
    expect(() => css`display: block; ${[nested] as never}`).toThrow("CSS rule fragments require")
  })

  test("rejects invalid values and malformed static source", () => {
    expect(() => css`color: ${{bad: true} as never};`).toThrow("finite primitive")
    expect(() => css`&:hover { color: red`).toThrow("closing brace")
    expect(() => parseCssTemplateShape(["&:hover { color: red; "])).toThrow("closing brace")
  })
})
