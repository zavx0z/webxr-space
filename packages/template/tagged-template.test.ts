import {describe, expect, test} from "bun:test"
import {
  getTaggedTemplateShape,
  joinTaggedTemplateSource,
  parseTaggedTemplateSegments,
} from "./tagged-template.ts"

describe("shared tagged-template primitives", () => {
  test("caches frontend shapes independently on one exact strings identity", () => {
    const firstFrontend = Symbol("first")
    const secondFrontend = Symbol("second")
    let firstParses = 0
    let secondParses = 0
    const capture = (strings: TemplateStringsArray, ..._values: readonly unknown[]) => ({
      first: getTaggedTemplateShape(strings, firstFrontend, value => {
        firstParses += 1
        return joinTaggedTemplateSource(value)
      }),
      second: getTaggedTemplateShape(strings, secondFrontend, value => {
        secondParses += 1
        return joinTaggedTemplateSource(value)
      }),
      strings,
    })
    const callsite = () => capture`start ${"ignored"} end`
    const first = callsite()
    const second = callsite()

    expect(first.strings).toBe(second.strings)
    expect(first.first).toBe(second.first)
    expect(first.second).toBe(second.second)
    expect(firstParses).toBe(1)
    expect(secondParses).toBe(1)
  })

  test("extracts ordered static and slot segments without frontend parsing", () => {
    const source = joinTaggedTemplateSource(["a", "b", "c"])
    expect(parseTaggedTemplateSegments(source, 2)).toEqual([
      {type: "static", value: "a"},
      {type: "slot", index: 0},
      {type: "static", value: "b"},
      {type: "slot", index: 1},
      {type: "static", value: "c"},
    ])
  })
})
