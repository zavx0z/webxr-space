import {expect, test} from "bun:test"
import {PersistentObjectMap} from "../src/persistent-object-map.ts"

test("object identity, missing entries and stored undefined remain distinct", () => {
  const first = Object.freeze({name: "same"})
  const second = Object.freeze({name: "same"})
  const callable = () => undefined
  const empty = new PersistentObjectMap<number | undefined>()
  const values = empty.with(first, 1).with(second, undefined).with(callable, 3)

  expect(empty.size).toBe(0)
  expect(empty.has(first)).toBe(false)
  expect(empty.without(first)).toBe(empty)
  expect(values.size).toBe(3)
  expect(values.get(first)).toBe(1)
  expect(values.has(second)).toBe(true)
  expect(values.get(second)).toBeUndefined()
  expect(values.get(callable)).toBe(3)
  expect(values.get({name: "same"})).toBeUndefined()
  expect(values.has({name: "same"})).toBe(false)
  expect(values.without({})).toBe(values)
  expect(values.with(second, undefined)).toBe(values)
  expect(Object.isFrozen(empty)).toBe(true)
  expect(Object.isFrozen(values)).toBe(true)
})

test("replacement and removal preserve immutable snapshots and disjoint descendants", () => {
  const keys = Array.from({length: 127}, () => ({}))
  let base = new PersistentObjectMap<object>()
  const originalValues = keys.map((_, index) => ({index}))
  for (let index = 0; index < keys.length; index++) base = base.with(keys[index]!, originalValues[index]!)

  const leftValue = {index: -1}
  const rightValue = {index: -2}
  const left = base.with(keys[0]!, leftValue).without(keys[31]!)
  const right = base.with(keys[126]!, rightValue).without(keys[95]!)
  const leftChild = left.with(keys[31]!, rightValue)

  expect(base.size).toBe(127)
  expect(left.size).toBe(126)
  expect(right.size).toBe(126)
  expect(leftChild.size).toBe(127)
  for (let index = 0; index < keys.length; index++) {
    expect(base.get(keys[index]!)).toBe(originalValues[index])
    expect(left.get(keys[index]!)).toBe(index === 0 ? leftValue : index === 31 ? undefined : originalValues[index])
    expect(right.get(keys[index]!)).toBe(index === 126 ? rightValue : index === 95 ? undefined : originalValues[index])
  }
  expect(leftChild.get(keys[31]!)).toBe(rightValue)
  expect(left.has(keys[31]!)).toBe(false)
  expect(base.with(keys[63]!, originalValues[63]!)).toBe(base)
})

test("Object.is value no-ops preserve snapshot identity without freezing caller values", () => {
  const key = {}
  const value = {count: 1}
  const objects = new PersistentObjectMap<object>().with(key, value)
  expect(objects.with(key, value)).toBe(objects)
  expect(Object.isFrozen(key)).toBe(false)
  expect(Object.isFrozen(value)).toBe(false)
  const numbers = new PersistentObjectMap<number>().with(key, NaN)
  expect(numbers.with(key, NaN)).toBe(numbers)
  const zero = numbers.with(key, 0)
  const negativeZero = zero.with(key, -0)
  expect(negativeZero).not.toBe(zero)
  expect(Object.is(negativeZero.get(key), -0)).toBe(true)
  expect(Object.is(zero.get(key), 0)).toBe(true)
})

test("preexisting identities support ascending, descending and double-rotation insert orders", () => {
  const keys = Array.from({length: 7}, () => ({}))
  let identities = new PersistentObjectMap<number>()
  for (let index = 0; index < keys.length; index++) identities = identities.with(keys[index]!, index)
  const orders = [
    [0, 1, 2, 3, 4, 5, 6],
    [6, 5, 4, 3, 2, 1, 0],
    [2, 0, 1, 5, 6, 3, 4],
    [0, 2, 1, 6, 4, 5, 3],
  ]
  for (const order of orders) {
    let map = new PersistentObjectMap<number>()
    for (const index of order) map = map.with(keys[index]!, index)
    const populated = map
    for (const index of order) {
      expect(map.get(keys[index]!)).toBe(index)
      map = map.without(keys[index]!)
      expect(map.has(keys[index]!)).toBe(false)
      expect(populated.get(keys[index]!)).toBe(index)
    }
    expect(map.size).toBe(0)
    expect(populated.size).toBe(keys.length)
  }
  expect(identities.size).toBe(keys.length)
})

test("50,000 object keys support ordered inserts, replacements and removal in both directions", () => {
  const count = 50_000
  const keys = Array.from({length: count}, () => ({}))
  let map = new PersistentObjectMap<number>()
  for (let index = 0; index < count; index++) map = map.with(keys[index]!, index)
  const original = map
  for (let index = 0; index < count; index++) {
    expect(map.get(keys[index]!)).toBe(index)
    expect(map.has(keys[index]!)).toBe(true)
  }
  expect(map.size).toBe(count)

  for (let index = 0; index < count; index += 2) map = map.with(keys[index]!, -index - 1)
  const changed = map
  for (let index = 0; index < count; index += 2) map = map.without(keys[index]!)
  expect(map.size).toBe(count / 2)
  for (let index = 0; index < count; index++) {
    expect(original.get(keys[index]!)).toBe(index)
    expect(changed.get(keys[index]!)).toBe(index % 2 === 0 ? -index - 1 : index)
    expect(map.get(keys[index]!)).toBe(index % 2 === 0 ? undefined : index)
  }
  for (let index = count - 1; index >= 1; index -= 2) map = map.without(keys[index]!)
  expect(map.size).toBe(0)
  expect(map.without(keys[0]!)).toBe(map)
  expect(original.size).toBe(count)
  expect(changed.size).toBe(count)
})

test("deterministic mixed updates match Map and keep earlier snapshots independent", () => {
  const keys = Array.from({length: 1_024}, () => ({}))
  let map = new PersistentObjectMap<number>()
  const oracle = new Map<object, number>()
  const snapshots: Array<{map: PersistentObjectMap<number>; oracle: Map<object, number>}> = []
  let random = 0x12345678
  for (let operation = 0; operation < 20_000; operation++) {
    random = (Math.imul(random, 1_664_525) + 1_013_904_223) >>> 0
    const key = keys[random % keys.length]!
    if ((random >>> 16) % 3 === 0) {
      const existed = oracle.delete(key)
      const previous = map
      map = map.without(key)
      if (!existed) expect(map).toBe(previous)
    } else {
      oracle.set(key, operation)
      map = map.with(key, operation)
    }
    expect(map.size).toBe(oracle.size)
    expect(map.get(key)).toBe(oracle.get(key))
    if (operation % 2_000 === 0) snapshots.push({map, oracle: new Map(oracle)})
  }
  snapshots.push({map, oracle})
  for (const snapshot of snapshots) {
    expect(snapshot.map.size).toBe(snapshot.oracle.size)
    for (const key of keys) {
      expect(snapshot.map.has(key)).toBe(snapshot.oracle.has(key))
      expect(snapshot.map.get(key)).toBe(snapshot.oracle.get(key))
    }
  }
})

test("long replacement and removal history does not accumulate logical entries", () => {
  const keep = {}
  let map = new PersistentObjectMap<number>().with(keep, 0)
  const initial = map
  for (let index = 1; index <= 50_000; index++) {
    const temporary = {}
    map = map.with(keep, index).with(temporary, index).without(temporary)
    expect(map.size).toBe(1)
    expect(map.has(temporary)).toBe(false)
  }
  expect(map.get(keep)).toBe(50_000)
  expect(initial.get(keep)).toBe(0)
  expect(map.without(keep).size).toBe(0)
})
