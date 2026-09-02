const markerOpen = "\uE000"
const markerClose = "\uE001"

export type TaggedTemplateStaticSegment = Readonly<{
  type: "static"
  value: string
}>

export type TaggedTemplateSlotSegment = Readonly<{
  type: "slot"
  index: number
}>

export type TaggedTemplateSegment = TaggedTemplateStaticSegment | TaggedTemplateSlotSegment

const shapeCache = new WeakMap<TemplateStringsArray, Map<symbol, unknown>>()

/** Returns one frontend-specific static shape for one exact template object identity. */
export function getTaggedTemplateShape<Shape>(
  strings: TemplateStringsArray,
  frontend: symbol,
  parse: (strings: TemplateStringsArray) => Shape,
): Shape {
  let byFrontend = shapeCache.get(strings)
  if (!byFrontend) {
    byFrontend = new Map()
    shapeCache.set(strings, byFrontend)
  }
  const cached = byFrontend.get(frontend)
  if (cached !== undefined) return cached as Shape
  const shape = parse(strings)
  byFrontend.set(frontend, shape)
  return shape
}

/** Interleaves cooked static strings with stable ordered slot markers. */
export function joinTaggedTemplateSource(strings: readonly string[]): string {
  assertTaggedTemplateStrings(strings)
  return strings.map((value, index) =>
    index < strings.length - 1 ? `${value}${taggedTemplateMarker(index)}` : value
  ).join("")
}

/** Parses ordered static/slot segments from a bounded slice of joined source. */
export function parseTaggedTemplateSegments(
  source: string,
  slotCount: number,
  transformStatic: (value: string) => string = value => value,
): TaggedTemplateSegment[] {
  const result: TaggedTemplateSegment[] = []
  let cursor = 0
  while (cursor < source.length) {
    const markerIndex = source.indexOf(markerOpen, cursor)
    if (markerIndex === -1) {
      const value = transformStatic(source.slice(cursor))
      if (value !== "") result.push(Object.freeze({type: "static", value}))
      break
    }
    if (markerIndex > cursor) {
      const value = transformStatic(source.slice(cursor, markerIndex))
      if (value !== "") result.push(Object.freeze({type: "static", value}))
    }
    const markerEnd = source.indexOf(markerClose, markerIndex + markerOpen.length)
    if (markerEnd === -1) throw new Error("Invalid tagged-template compiler marker")
    const slotText = source.slice(markerIndex + markerOpen.length, markerEnd)
    const index = Number(slotText)
    if (!Number.isInteger(index) || index < 0 || index >= slotCount) {
      throw new Error(`Invalid tagged-template slot ${slotText}`)
    }
    result.push(Object.freeze({type: "slot", index}))
    cursor = markerEnd + markerClose.length
  }
  return result
}

export function containsTaggedTemplateMarker(value: string): boolean {
  return value.includes(markerOpen) || value.includes(markerClose)
}

/** Reads one exact compiler slot marker at a known source position. */
export function readTaggedTemplateMarker(
  source: string,
  start: number,
  slotCount: number,
): Readonly<{end: number; index: number}> | null {
  if (!source.startsWith(markerOpen, start)) return null
  const markerEnd = source.indexOf(markerClose, start + markerOpen.length)
  if (markerEnd === -1) throw new Error("Invalid tagged-template compiler marker")
  const slotText = source.slice(start + markerOpen.length, markerEnd)
  const index = Number(slotText)
  if (!Number.isInteger(index) || index < 0 || index >= slotCount) {
    throw new Error(`Invalid tagged-template slot ${slotText}`)
  }
  return Object.freeze({end: markerEnd + markerClose.length, index})
}

function assertTaggedTemplateStrings(strings: readonly string[]): void {
  if (!Array.isArray(strings) || strings.length === 0) {
    throw new TypeError("A tagged template requires a non-empty strings array")
  }
  for (const value of strings) {
    if (typeof value !== "string") throw new TypeError("Tagged-template strings must be strings")
    if (containsTaggedTemplateMarker(value)) {
      throw new Error("Tagged-template source contains reserved compiler marker characters")
    }
  }
}

function taggedTemplateMarker(index: number): string {
  return `${markerOpen}${index}${markerClose}`
}
