import {expect, test} from "bun:test"
import {projectArray, ProjectedMap} from "../src/projected-collections.ts"
import {appendImmutableArray, immutableArray, isImmutableArray, readImmutableArrayEntry} from "../src/immutable-array.ts"

test("projected arrays and maps compute only requested immutable records", () => {
  const source = Object.freeze(Array.from({length: 1000}, (_, value) => Object.freeze({value})))
  let reads = 0
  const projected = projectArray(source, 200, 600, value => {
    reads++
    return Object.freeze({value: value.value + 10})
  })
  expect(Array.isArray(projected)).toBe(true)
  expect(reads).toBe(0)
  expect(projected[0]).toBe(source[0])
  expect(projected[300]).toEqual({value: 310})
  expect(projected[300]).toBe(projected[300])
  expect(reads).toBe(1)
  expect(projected.slice(299, 302).map(value => value.value)).toEqual([309, 310, 311])
  expect(source[300]?.value).toBe(300)
  expect(() => (projected as {value: number}[])[0] = {value: 0}).toThrow()
  const map = new ProjectedMap(new Map([["a", 0], ["b", 300]]), (_key, index) => projected[index]!.value)
  expect(map.size).toBe(2)
  expect([...map.keys()]).toEqual(["a", "b"])
  expect([...map.values()]).toEqual([0, 310])
  expect(map.get("missing")).toBeUndefined()
})

test("appending to a projected array does not materialize untouched records", () => {
  const source = immutableArray(Array.from({length: 1000}, (_, value) => Object.freeze({value})))
  let reads = 0
  const projected = projectArray(source, 0, source.length, item => {
    reads += 1
    return Object.freeze({value: item.value + 10})
  })
  const tail = Object.freeze({value: -1})
  const appended = appendImmutableArray(projected, [tail])
  expect(Array.isArray(appended)).toBe(true)
  expect(isImmutableArray(appended)).toBe(true)
  expect(immutableArray(appended)).toBe(appended)
  expect(reads).toBe(0)
  expect(appended.length).toBe(1001)
  expect(appended[1000]).toBe(tail)
  expect(300 in appended).toBe(true)
  expect(reads).toBe(0)
  const value = readImmutableArrayEntry(appended, 300)
  expect(value).toEqual({value: 310})
  expect(appended[300]).toBe(value)
  expect(projected[300]).toBe(value)
  expect(reads).toBe(1)
  const descriptor = Object.getOwnPropertyDescriptor(appended, "300")
  expect(descriptor?.value).toBe(value)
  expect(descriptor?.writable).toBe(false)
  expect(appended.slice(299, 302).map(item => item.value)).toEqual([309, 310, 311])
  expect(reads).toBe(3)
  expect(() => (appended as {value: number}[])[0] = tail).toThrow()
  expect(() => (appended as {value: number}[]).push(tail)).toThrow()
  expect(() => Reflect.deleteProperty(appended, "300")).toThrow()
  expect(() => Object.defineProperty(appended, "300", {value: tail})).toThrow()
  expect(source[300]?.value).toBe(300)
})

test("nested lazy appends flatten segments without recursively retaining concat chains", () => {
  let reads = 0
  const projected = projectArray(immutableArray(Array.from({length: 1000}, (_, value) => value)), 0, 1000, value => {
    reads += 1
    return value + 10
  })
  const first = appendImmutableArray(projected, [-1])
  let current = first
  for (let index = 0; index < 12; index++) current = appendImmutableArray(current, current)
  expect(current.length).toBe(1001 * 4096)
  expect(reads).toBe(0)
  expect(current.at(-1)).toBe(-1)
  expect(reads).toBe(0)
  expect(current[current.length - 701]).toBe(310)
  expect(reads).toBe(1)
  expect(first.length).toBe(1001)
  expect(first[300]).toBe(310)
  expect(first.at(-1)).toBe(-1)
  expect(reads).toBe(1)
})

test("mutable caller inputs are snapshotted on either side of a lazy concatenation", () => {
  const source = [1, 2]
  let reads = 0
  const projected = projectArray(source, 0, 2, value => {
    reads += 1
    return value * 10
  })
  const tail = [3, 4]
  const joined = appendImmutableArray(projected, tail)
  const prefix = [5, 6]
  const prefixed = appendImmutableArray(prefix, joined)
  source[0] = 100
  source.push(200)
  tail[0] = 300
  tail.push(400)
  prefix[0] = 500
  expect(reads).toBe(0)
  expect([...prefixed]).toEqual([5, 6, 10, 20, 3, 4])
  expect([...joined]).toEqual([10, 20, 3, 4])
  expect(reads).toBe(2)
  expect(Object.keys(prefixed)).toEqual(["0", "1", "2", "3", "4", "5"])
  expect([...prefixed.values()]).toEqual([...prefixed])
  expect(prefixed.map(value => value + 1)).toEqual([6, 7, 11, 21, 4, 5])
  expect(appendImmutableArray(joined, [])).toBe(joined)
})
