import type {Node} from "@zavx0z/dom"
import type {DisplayItem, HitMetadata, RenderBox} from "./types.ts"
import {immutableArrayFromReader, readImmutableArrayEntry} from "./immutable-array.ts"
import {PersistentObjectMap} from "./persistent-object-map.ts"

export type TextStreamSource = Readonly<{
  boxes: readonly RenderBox[]
  display: readonly DisplayItem[]
  hits: readonly HitMetadata[]
}>

export type TextStreamPlacement = Readonly<{source: TextStreamSource; dx: number; dy: number}>
type Binding = Readonly<{source: TextStreamSource; box?: number; hit?: number}>
export type TextStreamIndex = Readonly<{
  sources: ReadonlySet<TextStreamSource>
  bindings: PersistentObjectMap<Binding>
}>
type PositionedBlock = TextStreamPlacement & Readonly<{boxEnd: number; displayEnd: number; hitEnd: number}>

export type TextStreamCollections = Readonly<{
  boxes: readonly RenderBox[]
  display: readonly DisplayItem[]
  hits: readonly HitMetadata[]
  hitNodes: readonly Node[]
  index: TextStreamIndex
  blocks: readonly PositionedBlock[]
  boxIndex(node: Node): number | undefined
  hitIndex(node: Node): number | undefined
  displayIndexes(node: Node): ReadonlyMap<string, number> | undefined
  readBox(node: Node): RenderBox | undefined
  readHit(node: Node): HitMetadata | undefined
  boxKeys(): IterableIterator<Node>
  hitKeys(): IterableIterator<Node>
  statistics(): Readonly<{sources: number; changedSources: number; removedSources: number; materializedBoxes: number; materializedDisplay: number; materializedHits: number}>
}>

/** Keeps the entire logical stream while materializing only queried record positions. */
export function createTextStreamCollections(
  placements: readonly TextStreamPlacement[],
  project: Readonly<{
    box(value: RenderBox, dx: number, dy: number): RenderBox
    display(value: DisplayItem, dx: number, dy: number): DisplayItem
    hit(value: HitMetadata, dx: number, dy: number): HitMetadata
  }>,
  previous?: TextStreamIndex,
  offset: Readonly<{dx: number; dy: number}> = {dx: 0, dy: 0},
): TextStreamCollections {
  let bindings = previous?.bindings ?? new PersistentObjectMap<Binding>()
  const sources = new Set<TextStreamSource>()
  const positions = new Map<TextStreamSource, PositionedBlock>()
  const blocks: PositionedBlock[] = []
  let boxCount = 0
  let displayCount = 0
  let hitCount = 0
  let changedSources = 0
  let removedSources = 0
  for (const placement of placements) {
    const source = placement.source
    if (sources.has(source)) throw new Error("A text stream source cannot occur twice")
    sources.add(source)
    if (!previous?.sources.has(source)) {
      changedSources++
      const additions = new Map<Node, Binding>()
      for (const [box, value] of source.boxes.entries()) additions.set(value.node, {source, box})
      for (const [hit, value] of source.hits.entries()) additions.set(value.node, {...additions.get(value.node), source, hit})
      for (const [node, binding] of additions) bindings = bindings.with(node, Object.freeze(binding))
    }
    boxCount += source.boxes.length
    displayCount += source.display.length
    hitCount += source.hits.length
    const block = Object.freeze({...placement, dx: placement.dx + offset.dx, dy: placement.dy + offset.dy,
      boxEnd: boxCount, displayEnd: displayCount, hitEnd: hitCount})
    positions.set(source, block)
    blocks.push(block)
  }
  for (const source of previous?.sources ?? []) if (!sources.has(source)) {
    removedSources++
    for (const box of source.boxes) if (bindings.get(box.node)?.source === source) bindings = bindings.without(box.node)
    for (const hit of source.hits) if (bindings.get(hit.node)?.source === source) bindings = bindings.without(hit.node)
  }
  const index: TextStreamIndex = Object.freeze({sources, bindings})
  const boxCache = new Map<number, RenderBox>()
  const displayCache = new Map<number, DisplayItem>()
  const hitCache = new Map<number, HitMetadata>()
  const find = (index: number, field: "boxEnd" | "displayEnd" | "hitEnd"): PositionedBlock => {
    let low = 0
    let high = blocks.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (blocks[middle]![field] <= index) low = middle + 1
      else high = middle
    }
    return blocks[low]!
  }
  const boxes = immutableArrayFromReader(boxCount, index => {
    let value = boxCache.get(index)
    if (value !== undefined) return value
    const block = find(index, "boxEnd")
    const source = readImmutableArrayEntry(block.source.boxes, index - block.boxEnd + block.source.boxes.length)!
    value = block.dx === 0 && block.dy === 0 ? source : project.box(source, block.dx, block.dy)
    boxCache.set(index, value)
    return value
  })
  const display = immutableArrayFromReader(displayCount, index => {
    let value = displayCache.get(index)
    if (value !== undefined) return value
    const block = find(index, "displayEnd")
    const source = readImmutableArrayEntry(block.source.display, index - block.displayEnd + block.source.display.length)!
    value = block.dx === 0 && block.dy === 0 ? source : project.display(source, block.dx, block.dy)
    displayCache.set(index, value)
    return value
  })
  const hits = immutableArrayFromReader(hitCount, index => {
    let value = hitCache.get(index)
    if (value !== undefined) return value
    const block = find(index, "hitEnd")
    const source = readImmutableArrayEntry(block.source.hits, index - block.hitEnd + block.source.hits.length)!
    value = block.dx === 0 && block.dy === 0 ? source : project.hit(source, block.dx, block.dy)
    hitCache.set(index, value)
    return value
  })
  const hitNodes = immutableArrayFromReader(hitCount, index => {
    const block = find(index, "hitEnd")
    return readImmutableArrayEntry(block.source.hits, index - block.hitEnd + block.source.hits.length)!.node
  })
  const boxIndex = (node: Node): number | undefined => {
    const binding = bindings.get(node)
    const block = binding === undefined ? undefined : positions.get(binding.source)
    return binding?.box === undefined || block === undefined ? undefined : block.boxEnd - block.source.boxes.length + binding.box
  }
  const hitIndex = (node: Node): number | undefined => {
    const binding = bindings.get(node)
    const block = binding === undefined ? undefined : positions.get(binding.source)
    return binding?.hit === undefined || block === undefined ? undefined : block.hitEnd - block.source.hits.length + binding.hit
  }
  const displayIndexes = (node: Node): ReadonlyMap<string, number> | undefined => {
    const binding = bindings.get(node)
    const block = binding === undefined ? undefined : positions.get(binding.source)
    if (block === undefined) return undefined
    const entries = new Map<string, number>()
    for (const [index, item] of block.source.display.entries()) if (item.node === node) entries.set(item.key, block.displayEnd - block.source.display.length + index)
    return entries.size === 0 ? undefined : entries
  }
  return Object.freeze({
    boxes, display, hits, hitNodes, index, blocks: immutableArrayFromReader(blocks.length, index => blocks[index]!), boxIndex, hitIndex, displayIndexes,
    readBox(node: Node) { const index = boxIndex(node); return index === undefined ? undefined : readImmutableArrayEntry(boxes, index) },
    readHit(node: Node) { const index = hitIndex(node); return index === undefined ? undefined : readImmutableArrayEntry(hits, index) },
    *boxKeys() { for (const block of blocks) for (const box of block.source.boxes) yield box.node },
    *hitKeys() { for (const block of blocks) for (const hit of block.source.hits) yield hit.node },
    statistics() { return Object.freeze({sources: sources.size, changedSources, removedSources,
      materializedBoxes: boxCache.size, materializedDisplay: displayCache.size, materializedHits: hitCache.size}) },
  })
}

/** A full ordered Map view with an inserted retained range and direct indexed lookup. */
export class SplicedNodeMap<Value> implements ReadonlyMap<Node, Value> {
  readonly #outside: ReadonlyMap<Node, Value>
  readonly #insertion: Node | null
  readonly #stream: Readonly<{size: number; keys(): IterableIterator<Node>; read(node: Node): Value | undefined; has(node: Node): boolean}>
  constructor(
    outside: ReadonlyMap<Node, Value>,
    insertion: Node | null,
    stream: Readonly<{size: number; keys(): IterableIterator<Node>; read(node: Node): Value | undefined; has(node: Node): boolean}>,
  ) {
    this.#outside = outside
    this.#insertion = insertion
    this.#stream = stream
    Object.freeze(this)
  }
  get size(): number { return this.#outside.size + this.#stream.size }
  get(node: Node): Value | undefined { return this.#outside.get(node) ?? this.#stream.read(node) }
  has(node: Node): boolean { return this.#outside.has(node) || this.#stream.has(node) }
  *keys(): MapIterator<Node> {
    let inserted = false
    for (const key of this.#outside.keys()) {
      if (key === this.#insertion) { yield* this.#stream.keys(); inserted = true }
      yield key
    }
    if (!inserted) yield* this.#stream.keys()
  }
  *values(): MapIterator<Value> { for (const key of this.keys()) yield this.get(key)! }
  *entries(): MapIterator<[Node, Value]> { for (const key of this.keys()) yield [key, this.get(key)!] }
  [Symbol.iterator](): MapIterator<[Node, Value]> { return this.entries() }
  forEach(callback: (value: Value, key: Node, map: ReadonlyMap<Node, Value>) => void, thisArg?: unknown): void {
    for (const [key, value] of this) callback.call(thisArg, value, key, this)
  }
}
