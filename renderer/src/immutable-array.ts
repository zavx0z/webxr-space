const CHUNK_SIZE = 256

type PropertyKeyValue = string | symbol

class ChunkedArrayData<Value> {
  readonly #chunks: readonly (readonly Value[])[]
  readonly length: number

  constructor(chunks: readonly (readonly Value[])[], length: number) {
    this.#chunks = chunks
    this.length = length
    Object.freeze(this)
  }

  static from<Value>(values: readonly Value[]): ChunkedArrayData<Value> {
    const chunks: Value[][] = []
    for (let start = 0; start < values.length; start += CHUNK_SIZE) {
      chunks.push(Array.prototype.slice.call(values, start, start + CHUNK_SIZE))
    }
    return new ChunkedArrayData(chunks, values.length)
  }

  get(index: number): Value | undefined {
    if (index < 0 || index >= this.length) return undefined
    return this.#chunks[Math.floor(index / CHUNK_SIZE)]?.[index % CHUNK_SIZE]
  }

  with(index: number, value: Value): ChunkedArrayData<Value> {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.length) {
      throw new RangeError("Immutable array replacement index is out of bounds")
    }
    const chunkIndex = Math.floor(index / CHUNK_SIZE)
    const nextChunk = [...this.#chunks[chunkIndex]!]
    nextChunk[index % CHUNK_SIZE] = value
    const nextChunks = [...this.#chunks]
    nextChunks[chunkIndex] = nextChunk
    return new ChunkedArrayData(nextChunks, this.length)
  }

  withMany(entries: readonly Readonly<{index: number; value: Value}>[]): ChunkedArrayData<Value> {
    if (entries.length === 0) return this
    const nextChunks = [...this.#chunks]
    const mutableChunks = new Map<number, Value[]>()
    for (const {index, value} of entries) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= this.length) {
        throw new RangeError("Immutable array replacement index is out of bounds")
      }
      const chunkIndex = Math.floor(index / CHUNK_SIZE)
      let chunk = mutableChunks.get(chunkIndex)
      if (chunk === undefined) {
        chunk = [...this.#chunks[chunkIndex]!]
        mutableChunks.set(chunkIndex, chunk)
        nextChunks[chunkIndex] = chunk
      }
      chunk[index % CHUNK_SIZE] = value
    }
    return new ChunkedArrayData(nextChunks, this.length)
  }

  move(fromIndex: number, toIndex: number, replacement: Value): ChunkedArrayData<Value> {
    if (
      !Number.isSafeInteger(fromIndex) ||
      !Number.isSafeInteger(toIndex) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.length ||
      toIndex >= this.length
    ) throw new RangeError("Immutable array move index is out of bounds")
    if (fromIndex === toIndex) return this.with(fromIndex, replacement)
    const nextChunks = [...this.#chunks]
    const mutableChunks = new Map<number, Value[]>()
    const write = (index: number, value: Value): void => {
      const chunkIndex = Math.floor(index / CHUNK_SIZE)
      let chunk = mutableChunks.get(chunkIndex)
      if (chunk === undefined) {
        chunk = [...this.#chunks[chunkIndex]!]
        mutableChunks.set(chunkIndex, chunk)
        nextChunks[chunkIndex] = chunk
      }
      chunk[index % CHUNK_SIZE] = value
    }
    if (fromIndex < toIndex) {
      for (let index = fromIndex; index < toIndex; index += 1) {
        write(index, this.get(index + 1)!)
      }
    } else {
      for (let index = fromIndex; index > toIndex; index -= 1) {
        write(index, this.get(index - 1)!)
      }
    }
    write(toIndex, replacement)
    return new ChunkedArrayData(nextChunks, this.length)
  }

  append(values: readonly Value[]): ChunkedArrayData<Value> {
    if (values.length === 0) return this
    const nextChunks = [...this.#chunks]
    let offset = 0
    const tailLength = this.length % CHUNK_SIZE
    if (tailLength !== 0) {
      const tailIndex = nextChunks.length - 1
      const tail = [...nextChunks[tailIndex]!]
      const available = CHUNK_SIZE - tail.length
      const count = Math.min(available, values.length)
      for (; offset < count; offset += 1) tail.push(values[offset]!)
      nextChunks[tailIndex] = tail
    }
    while (offset < values.length) {
      const chunk = Array.prototype.slice.call(
        values,
        offset,
        offset + CHUNK_SIZE,
      ) as Value[]
      nextChunks.push(chunk)
      offset += chunk.length
    }
    return new ChunkedArrayData(nextChunks, this.length + values.length)
  }

  chunks(): readonly (readonly Value[])[] {
    return this.#chunks
  }
}

const dataByArray = new WeakMap<readonly unknown[], ChunkedArrayData<unknown>>()
const readersByArray = new WeakMap<readonly unknown[], (index: number) => unknown>()
type ArraySegment<Value> = Readonly<{source: readonly Value[]; end: number}>
const segmentsByArray = new WeakMap<readonly unknown[], readonly ArraySegment<unknown>[]>()

/** Private owner registration: the reader must expose a stable immutable snapshot. */
export const registerImmutableArrayReader = <Value>(
  values: readonly Value[],
  read: (index: number) => Value | undefined,
): void => {
  if (readersByArray.has(values) || dataByArray.has(values)) throw new Error("Immutable array reader is already registered")
  readersByArray.set(values, read)
}

export const isImmutableArray = (values: readonly unknown[]): boolean =>
  dataByArray.has(values) || readersByArray.has(values) || Object.isFrozen(values)

/** Internal indexed consumers bypass the Array-compatible proxy's string-key conversion. */
export const readImmutableArrayEntry = <Value>(values: readonly Value[], index: number): Value | undefined => {
  const data = dataByArray.get(values) as ChunkedArrayData<Value> | undefined
  if (data !== undefined) return data.get(index)
  const reader = readersByArray.get(values)
  return reader === undefined ? values[index] : reader(index) as Value | undefined
}

export const immutableArray = <Value>(values: readonly Value[]): readonly Value[] => {
  if (dataByArray.has(values) || readersByArray.has(values)) return values
  return values.length <= CHUNK_SIZE ? Object.freeze([...values]) : proxyFor(ChunkedArrayData.from(values))
}

export const replaceImmutableArray = <Value>(
  values: readonly Value[],
  index: number,
  value: Value,
): readonly Value[] => replaceImmutableArrayEntries(values, [{index, value}])

export const replaceImmutableArrayEntries = <Value>(
  values: readonly Value[],
  entries: readonly Readonly<{index: number; value: Value}>[],
): readonly Value[] => {
  if (entries.length === 0) return values
  // Small lists use native indexing; larger frames keep copy-on-write chunks.
  if (values.length <= CHUNK_SIZE) {
    const data = dataByArray.get(values) as ChunkedArrayData<Value> | undefined
    const next: Value[] = data === undefined ? Array.prototype.slice.call(values) : data.chunks().flat() as Value[]
    for (const {index, value} of entries) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= values.length) {
        throw new RangeError("Immutable array replacement index is out of bounds")
      }
      next[index] = value
    }
    return Object.freeze(next)
  }
  return proxyFor(dataFor(values).withMany(entries))
}

export const moveImmutableArrayEntry = <Value>(
  values: readonly Value[],
  fromIndex: number,
  toIndex: number,
  replacement: Value,
): readonly Value[] => proxyFor(dataFor(values).move(fromIndex, toIndex, replacement))

export const appendImmutableArray = <Value>(
  values: readonly Value[],
  appended: readonly Value[],
): readonly Value[] => {
  if (appended.length === 0 && readersByArray.has(values)) return values
  if (values.length === 0 && readersByArray.has(appended)) return appended
  if (!readersByArray.has(values) && !readersByArray.has(appended)) {
    return proxyFor(dataFor(values).append(appended))
  }
  const segments: ArraySegment<Value>[] = []
  let length = 0
  for (const input of [values, appended]) {
    if (input.length === 0) continue
    const flattened = segmentsByArray.get(input) as readonly ArraySegment<Value>[] | undefined
    if (flattened !== undefined) {
      for (const segment of flattened) {
        length += segment.source.length
        segments.push(Object.freeze({source: segment.source, end: length}))
      }
    } else {
      const source = immutableArray(input)
      length += source.length
      segments.push(Object.freeze({source, end: length}))
    }
  }
  if (segments.length === 0) return Object.freeze([])
  if (segments.length === 1) return segments[0]!.source
  const retained = Object.freeze(segments)
  const read = (index: number): Value | undefined => {
    if (index < 0 || index >= length) return undefined
    let low = 0
    let high = retained.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (retained[middle]!.end <= index) low = middle + 1
      else high = middle
    }
    const segment = retained[low]!
    return readImmutableArrayEntry(segment.source, index - (segment.end - segment.source.length))
  }
  const result = readonlyArrayProxy(length, read, function* () {
    for (const segment of retained) yield* segment.source
  })
  registerImmutableArrayReader(result, read)
  segmentsByArray.set(result, retained as readonly ArraySegment<unknown>[])
  return result
}

export const sharedImmutableArrayChunks = (
  left: readonly unknown[],
  right: readonly unknown[],
): number => {
  const leftChunks = dataFor(left).chunks()
  const rightChunks = dataFor(right).chunks()
  const count = Math.min(leftChunks.length, rightChunks.length)
  let shared = 0
  for (let index = 0; index < count; index += 1) {
    if (leftChunks[index] === rightChunks[index]) shared += 1
  }
  return shared
}

const dataFor = <Value>(values: readonly Value[]): ChunkedArrayData<Value> => {
  const data = dataByArray.get(values) as ChunkedArrayData<Value> | undefined
  if (data !== undefined) return data
  const created = ChunkedArrayData.from(values)
  if (readersByArray.has(values) || Object.isFrozen(values)) dataByArray.set(values, created as ChunkedArrayData<unknown>)
  return created
}

const proxyFor = <Value>(data: ChunkedArrayData<Value>): readonly Value[] => {
  const proxy = readonlyArrayProxy(data.length, index => data.get(index), function* () {
    for (const chunk of data.chunks()) yield* chunk
  })
  dataByArray.set(proxy, data as ChunkedArrayData<unknown>)
  return proxy
}

const readonlyArrayProxy = <Value>(
  length: number,
  read: (index: number) => Value | undefined,
  iterate: () => IterableIterator<Value>,
): readonly Value[] => {
  const target = new Array<Value>(length)
  const proxy = new Proxy(target, {
    get(array, property, receiver) {
      if (property === Symbol.iterator) return iterate
      const index = arrayIndex(property)
      return index === null ? Reflect.get(array, property, receiver) : read(index)
    },
    has(array, property) {
      const index = arrayIndex(property)
      return index === null
        ? Reflect.has(array, property)
        : index >= 0 && index < length
    },
    ownKeys() {
      return [
        ...Array.from({length}, (_, index) => String(index)),
        "length",
      ]
    },
    getOwnPropertyDescriptor(array, property) {
      const index = arrayIndex(property)
      if (index === null) return Reflect.getOwnPropertyDescriptor(array, property)
      if (index < 0 || index >= length) return undefined
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: read(index),
      }
    },
    set() {
      throw readonlyArrayError()
    },
    deleteProperty() {
      throw readonlyArrayError()
    },
    defineProperty() {
      throw readonlyArrayError()
    },
    setPrototypeOf() {
      throw readonlyArrayError()
    },
    preventExtensions() {
      throw readonlyArrayError()
    },
  })
  return proxy
}

const arrayIndex = (property: PropertyKeyValue): number | null => {
  if (typeof property !== "string" || !/^(?:0|[1-9]\d*)$/.test(property)) {
    return null
  }
  const index = Number(property)
  return Number.isSafeInteger(index) ? index : null
}

const readonlyArrayError = (): TypeError => new TypeError("Render frame arrays are immutable")
