import {
  appendImmutableArray,
  immutableArray,
  readImmutableArrayEntry,
  replaceImmutableArrayEntries,
} from "./immutable-array.ts"

/** Shared key order with copy-on-write value chunks; local edits never copy unrelated entries. */
export class ImmutableNodeMap<Key extends object, Value> implements ReadonlyMap<Key, Value> {
  readonly #indexes: ReadonlyMap<Key, number>
  readonly #values: readonly Value[]

  constructor(
    source: ReadonlyMap<Key, Value> | undefined,
    parts?: Readonly<{indexes: ReadonlyMap<Key, number>; values: readonly Value[]}>,
  ) {
    if (parts !== undefined) {
      this.#indexes = parts.indexes
      this.#values = parts.values
    } else {
      const indexes = new Map<Key, number>()
      const values: Value[] = []
      for (const [key, value] of source ?? []) {
        indexes.set(key, values.length)
        values.push(value)
      }
      this.#indexes = indexes
      this.#values = immutableArray(values)
    }
    Object.freeze(this)
  }

  with(node: Key, value: Value): ImmutableNodeMap<Key, Value> {
    return this.withMany([{node, value}])
  }

  withMany(entries: readonly Readonly<{node: Key; value: Value}>[]): ImmutableNodeMap<Key, Value> {
    if (entries.length === 0) return this
    let addedIndexes: Map<Key, number> | undefined
    const added: Value[] = []
    const updates: Array<{index: number; value: Value}> = []
    for (const {node, value} of entries) {
      const index = (addedIndexes ?? this.#indexes).get(node)
      if (index === undefined) {
        addedIndexes ??= new Map(this.#indexes)
        addedIndexes.set(node, this.#values.length + added.length)
        added.push(value)
      } else if (index >= this.#values.length) {
        added[index - this.#values.length] = value
      } else {
        updates.push({index, value})
      }
    }
    const values = appendImmutableArray(replaceImmutableArrayEntries(this.#values, updates), added)
    return new ImmutableNodeMap(undefined, {indexes: addedIndexes ?? this.#indexes, values})
  }

  get size(): number { return this.#indexes.size }
  get(node: Key): Value | undefined {
    const index = this.#indexes.get(node)
    return index === undefined ? undefined : readImmutableArrayEntry(this.#values, index)
  }
  has(node: Key): boolean { return this.#indexes.has(node) }
  keys(): MapIterator<Key> { return this.#indexes.keys() }
  *values(): MapIterator<Value> { for (let index = 0; index < this.size; index++) yield readImmutableArrayEntry(this.#values, index)! }
  *entries(): MapIterator<[Key, Value]> { for (const [node, index] of this.#indexes) yield [node, readImmutableArrayEntry(this.#values, index)!] }
  [Symbol.iterator](): MapIterator<[Key, Value]> { return this.entries() }
  forEach(callback: (value: Value, key: Key, map: ReadonlyMap<Key, Value>) => void, thisArg?: unknown): void {
    for (const [key, value] of this) callback.call(thisArg, value, key, this)
  }
}
