import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {structuralFrameRanges, type StructuralSourceBlock} from "../src/frame-structural.ts"

test("head trim and append produce exact ordered retained/inserted/removed display ranges", () => {
  const document = createDocument()
  const owner = document.createElement("section")
  const [a, b, c, d] = [{}, {}, {}, {}]
  const block = (source: object, start: number, dy = 0): StructuralSourceBlock => ({source, start, count: 3, dx: 0, dy})
  const result = structuralFrameRanges(owner, {start: 2, end: 11}, {start: 2, end: 11},
    [block(a!, 2), block(b!, 5), block(c!, 8)], [block(b!, 2, -18), block(c!, 5, -18), block(d!, 8)])
  expect(result).toEqual({owner, previousRange: {start: 2, end: 11}, nextRange: {start: 2, end: 11},
    retained: [{previousStart: 5, nextStart: 2, count: 6, dx: 0, dy: -18}],
    inserted: [{start: 8, count: 3}], removed: [{start: 2, count: 3}],
  })
  expect(Object.isFrozen(result)).toBe(true)
  expect(Object.isFrozen(result!.retained)).toBe(true)
  expect(Object.isFrozen(result!.retained[0])).toBe(true)
})

test("invalid, incomplete, overlapping, reordered and mutating-source ranges fail closed", () => {
  const owner = createDocument().createElement("section")
  const a = {}
  const b = {}
  const before = [{source: a, start: 0, count: 2, dx: 0, dy: 0}, {source: b, start: 2, count: 2, dx: 0, dy: 0}]
  for (const next of [
    [{...before[0]!, start: -1}, before[1]!],
    [before[0]!],
    [before[0]!, {...before[1]!, start: 1}],
    [{...before[1]!, start: 0}, {...before[0]!, start: 2}],
    [{...before[0]!, count: 3}, {...before[1]!, start: 3, count: 1}],
    [{...before[0]!, dx: Infinity}, before[1]!],
    [before[0]!, {...before[1]!, source: a}],
  ]) expect(structuralFrameRanges(owner, {start: 0, end: 4}, {start: 0, end: 4}, before, next)).toBeNull()
  expect(structuralFrameRanges(owner, {start: 0, end: 4}, {start: 0, end: 2}, before,
    [{...before[0]!, count: 0}, {...before[1]!, start: 0}])).toBeNull()
})

test("5000 stable paint sources collapse into one bounded translated retained range", () => {
  const owner = createDocument().createElement("section")
  const sources = Array.from({length: 5001}, () => ({}))
  const previous = sources.slice(0, 5000).map((source, index) => ({source, start: 4 + index * 5, count: 5, dx: 0, dy: 0}))
  const next = sources.slice(1).map((source, index) => ({source, start: 4 + index * 5, count: 5, dx: 0, dy: -18}))
  const result = structuralFrameRanges(owner, {start: 4, end: 25004}, {start: 4, end: 25004}, previous, next)!
  expect(result.retained).toEqual([{previousStart: 9, nextStart: 4, count: 24995, dx: 0, dy: -18}])
  expect(result.inserted).toEqual([{start: 24999, count: 5}])
  expect(result.removed).toEqual([{start: 4, count: 5}])
})
