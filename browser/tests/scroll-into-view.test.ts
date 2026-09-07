import {expect, test} from "bun:test"
import {createDocument, HTMLElement, readDocumentScrollIntoViewRequests} from "@zavx0z/dom"
import type {TrueTypeFont} from "@zavx0z/engine"
import {createDocumentPlaneRuntime} from "../src/plane-runtime.ts"
import {createDocumentOverlayRuntime} from "../src/overlay-runtime.ts"

const font = {
  unitsPerEm: 1000,
  ascent: 800,
  descent: 200,
  mapCharToGlyph: () => 0,
  getGlyphOutline: () => ({points: new Float32Array(), onCurve: new Uint8Array(), contours: new Uint16Array()}),
  getHMetric: () => ({advanceWidth: 500, lsb: 0}),
} as unknown as TrueTypeFont

test.each(["plane", "overlay"] as const)("%s fulfills pending scrollIntoView in its existing frame pipeline", kind => {
  const document = createDocument()
  const root = document.createElement("main") as HTMLElement
  root.setAttribute("style", "display:block;width:100px;height:60px;overflow:auto")
  const rows = Array.from({length: 20}, () => {
    const row = document.createElement("div")
    row.setAttribute("style", "display:block;height:20px;background:#333")
    root.append(row)
    return row
  })
  document.append(root)
  rows[10]!.scrollIntoView({block: "center"})
  let requested = 0
  const options = {document, root, font, styleSheets: [], viewport: {width: 100, height: 60},
    requestFrame() { requested++ }, requestPresentation() {}, invalidateGeometry() {}}
  const runtime = kind === "plane" ? createDocumentPlaneRuntime({...options, worldUnitsPerPixel: 1}) : createDocumentOverlayRuntime(options)
  try {
    expect(root.scrollTop).toBe(180)
    expect(runtime.frame.scrolls.get(root)?.scrollTop).toBe(180)
    expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
    const count = requested
    rows[15]!.scrollIntoView({block: "end"})
    expect(requested).toBe(count + 1)
    runtime.flush()
    expect(root.scrollTop).toBe(260)
    const before = runtime.frame
    rows[15]!.scrollIntoView({block: "nearest"})
    runtime.flush()
    expect(runtime.frame.displayList).toBe(before.displayList)
    expect(root.scrollTop).toBe(260)
    expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
  } finally {runtime.dispose()}
})

test.each(["plane", "overlay"] as const)("%s disposal cancels its pending target request without scheduling a new owner", kind => {
  const document = createDocument()
  const root = document.createElement("main")
  root.setAttribute("style", "display:block;width:100px;height:60px;overflow:auto")
  const row = document.createElement("div")
  row.setAttribute("style", "display:block;height:300px;background:#333")
  root.append(row)
  document.append(root)
  const options = {document, root, font, styleSheets: [], viewport: {width: 100, height: 60},
    requestFrame() {}, requestPresentation() {}, invalidateGeometry() {}}
  const runtime = kind === "plane" ? createDocumentPlaneRuntime({...options, worldUnitsPerPixel: 1}) : createDocumentOverlayRuntime(options)
  row.scrollIntoView({block: "end"})
  expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(1)
  runtime.dispose()
  expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
})
