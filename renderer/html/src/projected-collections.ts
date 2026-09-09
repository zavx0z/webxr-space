import {immutableArray, readImmutableArrayEntry, registerImmutableArrayReader} from "./immutable-array.ts"

const projections = new WeakSet<readonly unknown[]>()
export const isProjectedArray = (values: readonly unknown[]): boolean => projections.has(values)

/** Immutable dense frame view. Only records actually read are projected and cached. */
export function projectArray<Value>(
  source: readonly Value[],
  first: number,
  end: number,
  project: (value: Value, index: number) => Value,
): readonly Value[] {
  source = immutableArray(source)
  const cache = new Map<number, Value>()
  const at = (index: number): Value | undefined => {
    if (index < 0 || index >= source.length) return undefined
    const value = readImmutableArrayEntry(source, index)!
    if (index < first || index >= end) return value
    if (!cache.has(index)) cache.set(index, project(value, index))
    return cache.get(index)!
  }
  const numeric = (key: PropertyKey): number | null => {
    if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/.test(key)) return null
    const index = Number(key)
    return Number.isSafeInteger(index) ? index : null
  }
  const readonly = (): never => { throw new TypeError("Render frame arrays are immutable") }
  const target = new Array<Value>(source.length)
  const result = new Proxy(target, {
    get(array, key, receiver) {
      if (key === Symbol.iterator) return function* () { for (let index = 0; index < source.length; index++) yield at(index)! }
      const index = numeric(key)
      return index === null ? Reflect.get(array, key, receiver) : at(index)
    },
    has(array, key) {
      const index = numeric(key)
      return index === null ? Reflect.has(array, key) : index < source.length
    },
    ownKeys() { return [...Array.from({length: source.length}, (_, index) => String(index)), "length"] },
    getOwnPropertyDescriptor(array, key) {
      const index = numeric(key)
      if (index === null) return Reflect.getOwnPropertyDescriptor(array, key)
      return index >= source.length ? undefined : {configurable: true, enumerable: true, writable: false, value: at(index)}
    },
    set: readonly,
    deleteProperty: readonly,
    defineProperty: readonly,
    setPrototypeOf: readonly,
    preventExtensions: readonly,
  })
  registerImmutableArrayReader(result, at)
  projections.add(result)
  return result
}

export class ProjectedMap<Key, Value> implements ReadonlyMap<Key, Value> {
  readonly #source: ReadonlyMap<Key, Value>
  readonly #project: (key: Key, value: Value) => Value
  constructor(
    source: ReadonlyMap<Key, Value>,
    project: (key: Key, value: Value) => Value,
  ) {
    this.#source = source
    this.#project = project
    Object.freeze(this)
  }
  get size(): number { return this.#source.size }
  has(key: Key): boolean { return this.#source.has(key) }
  get(key: Key): Value | undefined {
    const value = this.#source.get(key)
    return value === undefined && !this.#source.has(key) ? undefined : this.#project(key, value!)
  }
  keys(): MapIterator<Key> { return this.#source.keys() }
  *values(): MapIterator<Value> { for (const [key, value] of this.#source) yield this.#project(key, value) }
  *entries(): MapIterator<[Key, Value]> { for (const [key, value] of this.#source) yield [key, this.#project(key, value)] }
  [Symbol.iterator](): MapIterator<[Key, Value]> { return this.entries() }
  forEach(callback: (value: Value, key: Key, map: ReadonlyMap<Key, Value>) => void, thisArg?: unknown): void {
    for (const [key, value] of this) callback.call(thisArg, value, key, this)
  }
}
