import {expect, test} from "bun:test"
import {appendImmutableArray, immutableArray, replaceImmutableArray, replaceImmutableArrayEntries, sharedImmutableArrayChunks} from "../src/immutable-array.ts"

test("small native arrays and shared chunks retain immutable Array behavior", () => {
  const first = immutableArray(Array.from({length: 1024}, (_, index) => index))
  const sparse = replaceImmutableArray(first, 300, -1)
  expect(Array.isArray(sparse)).toBe(true)
  expect(sharedImmutableArrayChunks(first, sparse)).toBe(3)
  expect(first[300]).toBe(300)
  expect(sparse[300]).toBe(-1)
  expect(sparse.slice(298, 302)).toEqual([298, 299, -1, 301])
  const dense = replaceImmutableArrayEntries(sparse, Array.from({length: 512}, (_, index) => ({index, value: -index})))
  expect(Array.isArray(dense)).toBe(true)
  expect(dense[300]).toBe(-300)
  expect(sparse[300]).toBe(-1)
  expect([...dense.keys()].at(-1)).toBe(1023)
  expect([...dense.values()]).toEqual([...dense])
  expect(appendImmutableArray(dense, [1024, 1025]).slice(-3)).toEqual([1023, 1024, 1025])
  for (const values of [first, sparse, dense]) {
    expect(() => (values as number[])[0] = 1).toThrow()
    expect(() => replaceImmutableArray(values, values.length, 1)).toThrow(RangeError)
    expect(() => replaceImmutableArray(values, -1, 1)).toThrow(RangeError)
  }
})
