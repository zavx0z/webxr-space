import {expect, test} from "bun:test"
import {ImmutableNodeMap} from "../src/immutable-node-map.ts"

test("sparse and dense value updates preserve earlier snapshots and insertion order", () => {
  const keys = Array.from({length: 1024}, () => ({}))
  const original = new Map(keys.map((key, index) => [key, index]))
  const first = new ImmutableNodeMap(original)
  original.clear()
  const sparse = first.withMany([{node: keys[3]!, value: -3}, {node: keys[777]!, value: -777}])
  expect(first.get(keys[3]!)).toBe(3)
  expect(sparse.get(keys[3]!)).toBe(-3)
  expect(sparse.get(keys[778]!)).toBe(778)
  const added = {}
  const next = sparse.withMany([
    ...keys.slice(0, 600).map((node, index) => ({node, value: index + 20})),
    {node: added, value: 1}, {node: added, value: 2},
  ])
  expect(next.size).toBe(1025)
  expect(next.get(added)).toBe(2)
  expect([...next.keys()]).toEqual([...keys, added])
  expect([...first.values()]).toEqual(keys.map((_, index) => index))
  expect(sparse.get(keys[3]!)).toBe(-3)
  expect([...next.entries()].at(-1)).toEqual([added, 2])
  const seen: unknown[] = []
  const receiver = {}
  next.forEach(function(this: unknown, value, key, map) {
    if (key === added) seen.push(this, value, map)
  }, receiver)
  expect(seen).toEqual([receiver, 2, next])
  expect(next.withMany([])).toBe(next)
})
