import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {Mesh, Text, TrueTypeFont, type PresentationClipShape} from "@zavx0z/engine"
import {createDocumentRenderer, type RenderClip, type RenderFrame} from "@renderer/html"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
const scrollerStyle = "width:280px;height:120px;overflow:auto;border-radius:6px;transform-origin:0 0;transform:translate(0px,0px)"

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:340px;height:260px;overflow:hidden;border-radius:14px")
  document.append(root)
  const outer = document.createElement("div")
  outer.setAttribute("style", "width:300px;height:190px;overflow:auto;border-radius:10px")
  root.append(outer)
  const scroller = document.createElement("div")
  scroller.setAttribute("style", scrollerStyle)
  outer.append(scroller)
  const rows = Array.from({length: 12}, (_, index) => {
    const row = document.createElement("p")
    row.setAttribute("style", "width:600px;height:24px;margin:0;background:#243344;color:#aabbcc;font-size:12px;line-height:24px")
    row.textContent = `source line ${index}`
    scroller.append(row)
    return row
  })
  const spacer = document.createElement("div")
  spacer.setAttribute("style", "width:600px;height:400px")
  outer.append(spacer)
  // Scalar presentation exposes both row backgrounds and glyphs independently.
  const backend = new RendererWebGpuBackend({font, rectInstancing: "disabled", invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 360, height: 280}, textMeasurer: backend.textMeasurer!})
  return {document, root, outer, scroller, rows, renderer, backend,
    dispose() {
      renderer.dispose()
      backend.dispose()
    },
  }
}

function rowObjects(f: ReturnType<typeof fixture>, frame: RenderFrame, row = 0, backend = f.backend) {
  const rectangleIndex = frame.displayList.findIndex(item => item.kind === "rect" && item.node === f.rows[row])
  const textIndex = frame.displayList.findIndex(item => item.kind === "text" && item.node === f.rows[row]!.firstChild)
  expect(rectangleIndex).toBeGreaterThanOrEqual(0)
  expect(textIndex).toBeGreaterThanOrEqual(0)
  const rectangle = backend.root.children[rectangleIndex]!
  const text = backend.root.children[textIndex]!
  expect(rectangle).toBeInstanceOf(Mesh)
  expect(text).toBeInstanceOf(Text)
  return {rectangle, text: text as Text, rectangleItem: frame.displayList[rectangleIndex]!, textItem: frame.displayList[textIndex]!}
}

function clipValues(clips: readonly PresentationClipShape[]) {
  return clips.map(clip => ({
    kind: clip.kind,
    center: [...clip.center],
    halfSize: [...clip.halfSize],
    radii: [...clip.radii],
    matrix: Array.from(clip.coordinateSpace.matrixWorld.elements),
  }))
}

function withClips(frame: RenderFrame, clips: readonly RenderClip[], revision: number): RenderFrame {
  return Object.freeze({
    ...frame,
    revision,
    displayList: Object.freeze(frame.displayList.map(item => Object.freeze({...item, clips}))),
  })
}

test("nested source rows share one presentation clip chain across backgrounds and text", () => {
  const f = fixture()
  try {
    const frame = f.renderer.flush()
    f.backend.applyFrame(frame)
    const first = rowObjects(f, frame)
    const second = rowObjects(f, frame, 1)
    expect(first.textItem.clips).toHaveLength(3)
    expect(first.textItem.clips).toBe(first.rectangleItem.clips)
    expect(second.textItem.clips).toBe(first.textItem.clips)
    expect(first.text.presentationClips).toBe(first.rectangle.presentationClips)
    expect(second.text.presentationClips).toBe(first.text.presentationClips)
    expect(Object.isFrozen(first.text.presentationClips)).toBe(true)
    expect(first.text.presentationClips.every(Object.isFrozen)).toBe(true)
  } finally { f.dispose() }
})

test("scrolling source content on both axes retains unchanged nested presentation clips", () => {
  const f = fixture()
  try {
    const initial = f.renderer.flush()
    f.backend.applyFrame(initial)
    const before = rowObjects(f, initial)
    const clips = before.text.presentationClips
    const values = clipValues(clips)
    const position = {x: before.text.position.x, y: before.text.position.y}
    for (const [left, top] of [[32, 24], [64, 72], [16, 48], [0, 0]] as const) {
      f.document.transaction(() => {
        f.scroller.scrollLeft = left
        f.scroller.scrollTop = top
      })
      const frame = f.renderer.flush()
      f.backend.applyFrame(frame)
      const current = rowObjects(f, frame)
      expect(current.text).toBe(before.text)
      expect(current.rectangle).toBe(before.rectangle)
      expect(current.textItem.clips).toBe(before.textItem.clips)
      expect(current.text.presentationClips).toBe(clips)
      expect(current.rectangle.presentationClips).toBe(clips)
      expect(clipValues(clips)).toEqual(values)
      expect(current.text.position.x).toBeCloseTo(position.x - left, 8)
      expect(current.text.position.y).toBeCloseTo(position.y + top, 8)
    }
    expect(initial.displayList.find(item => item.kind === "text")!.clips).toBe(before.textItem.clips)
  } finally { f.dispose() }
})

test("moving an inner clip by outer scrolling invalidates it without rewriting previous clip snapshots", () => {
  const f = fixture()
  const reference = new RendererWebGpuBackend({font, rectInstancing: "disabled", invalidateGeometry() {}})
  try {
    const initial = f.renderer.flush()
    f.backend.applyFrame(initial)
    const before = rowObjects(f, initial)
    const clips = before.text.presentationClips
    const values = clipValues(clips)
    f.outer.scrollTop = 35
    const moved = f.renderer.flush()
    f.backend.applyFrame(moved)
    reference.applyFrame(Object.freeze({...moved}))
    const after = rowObjects(f, moved)
    expect(after.textItem.clips).not.toBe(before.textItem.clips)
    expect(after.text.presentationClips).not.toBe(clips)
    expect(clipValues(after.text.presentationClips)).not.toEqual(values)
    expect(clipValues(after.text.presentationClips)).toEqual(clipValues(rowObjects(f, moved, 0, reference).text.presentationClips))
    expect(clipValues(clips)).toEqual(values)
    const snapshotBackend = new RendererWebGpuBackend({font, rectInstancing: "disabled", invalidateGeometry() {}})
    try {
      snapshotBackend.applyFrame(initial)
      expect(clipValues(rowObjects(f, initial, 0, snapshotBackend).text.presentationClips)).toEqual(values)
    } finally { snapshotBackend.dispose() }
  } finally {
    reference.dispose()
    f.dispose()
  }
})

test("a retained clip chain observes its current semantic presentation-owner transform", () => {
  const f = fixture()
  const reference = new RendererWebGpuBackend({font, rectInstancing: "disabled", invalidateGeometry() {}})
  try {
    const initial = f.renderer.flush()
    f.backend.applyFrame(initial)
    const before = rowObjects(f, initial)
    const clips = before.text.presentationClips
    const values = clipValues(clips)
    expect(before.textItem.clips.some(clip => clip.presentationOwner === f.scroller)).toBe(true)
    f.scroller.setAttribute("style", scrollerStyle.replace("translate(0px,0px)", "translate(15px,9px)"))
    const moved = f.renderer.flush()
    const afterItem = moved.displayList.find(item => item.kind === "text" && item.node === f.rows[0]!.firstChild)!
    expect(afterItem.clips).toBe(before.textItem.clips)
    expect(moved.presentationTransforms!.get(f.scroller)).not.toEqual(initial.presentationTransforms!.get(f.scroller))
    f.backend.applyFrame(moved)
    reference.applyFrame(Object.freeze({...moved}))
    const after = rowObjects(f, moved)
    expect(after.text.presentationClips).not.toBe(clips)
    expect(clipValues(after.text.presentationClips)).toEqual(clipValues(rowObjects(f, moved, 0, reference).text.presentationClips))
    expect(clipValues(after.text.presentationClips)).not.toEqual(values)
    expect(clipValues(clips)).toEqual(values)
  } finally {
    reference.dispose()
    f.dispose()
  }
})

test("a partial-axis clip cache follows viewport resizing even when its immutable source is unchanged", () => {
  const f = fixture()
  try {
    const source = f.renderer.flush()
    const zero = Object.freeze({x: 0, y: 0})
    const clip: RenderClip = Object.freeze({
      ...source.displayList[0]!.clips[0]!,
      clipX: true,
      clipY: false,
      radii: Object.freeze({topLeft: zero, topRight: zero, bottomRight: zero, bottomLeft: zero}),
      presentationOwner: null,
    })
    const chain = Object.freeze([clip])
    const initial = withClips(source, chain, source.revision)
    f.backend.applyFrame(initial)
    const before = rowObjects(f, initial)
    const clips = before.text.presentationClips
    const values = clipValues(clips)
    const resized = Object.freeze({...initial, revision: initial.revision + 1, viewport: Object.freeze({width: 400, height: 360})})
    f.backend.applyFrame(resized)
    const after = rowObjects(f, resized)
    expect(after.text.presentationClips).not.toBe(clips)
    expect(after.text.presentationClips[0]!.halfSize[1]).toBe(180)
    expect(after.text.presentationClips[0]!.center[1]).toBe(-180)
    expect(clipValues(clips)).toEqual(values)
  } finally { f.dispose() }
})

test("mutable caller clip values are reread and validated beneath a shallow-frozen chain", () => {
  const f = fixture()
  try {
    const source = f.renderer.flush()
    const original = source.displayList[0]!.clips[0]!
    const radius = {x: 3, y: 3}
    const transform = {...original.transform}
    const mutable = {...original, width: 200, transform, presentationOwner: null,
      radii: {topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius},
    }
    const chain = Object.freeze([Object.freeze(mutable)])
    const initial = withClips(source, chain, source.revision)
    f.backend.applyFrame(initial)
    const clips = rowObjects(f, initial).text.presentationClips
    const values = clipValues(clips)
    transform.translateX = 12
    radius.x = 7
    radius.y = 7
    const updated = withClips(source, chain, source.revision + 1)
    f.backend.applyFrame(updated)
    const after = rowObjects(f, updated).text.presentationClips
    expect(after[0]!.radii).toEqual([7, 7, 7, 7])
    expect(after[0]!.coordinateSpace.matrixWorld.elements[12]).toBe(12)
    expect(clipValues(after)).not.toEqual(values)
    expect(clipValues(clips)).toEqual(values)
    radius.x = Number.NaN
    expect(() => f.backend.applyFrame(withClips(source, chain, source.revision + 2))).toThrow()
  } finally { f.dispose() }
})

test("an immutable clip chain does not cache mutable caller presentation-owner transforms by identity", () => {
  const f = fixture()
  try {
    const source = f.renderer.flush()
    const transform = {...source.presentationTransforms!.get(f.scroller)!}
    const transforms = new Map(source.presentationTransforms)
    transforms.set(f.scroller, transform)
    const initial = Object.freeze({...source, presentationTransforms: transforms})
    f.backend.applyFrame(initial)
    const clips = rowObjects(f, initial).text.presentationClips
    const values = clipValues(clips)
    transform.translateX += 18
    transform.translateY += 6
    const updated = Object.freeze({...initial, revision: initial.revision + 1})
    f.backend.applyFrame(updated)
    const after = rowObjects(f, updated).text.presentationClips
    expect(after[2]!.coordinateSpace.matrixWorld.elements[12]).toBe(18)
    expect(after[2]!.coordinateSpace.matrixWorld.elements[13]).toBe(-6)
    expect(clipValues(clips)).toEqual(values)
    transform.scaleX = Number.NaN
    expect(() => f.backend.applyFrame(Object.freeze({...updated, revision: updated.revision + 1}))).toThrow()
  } finally { f.dispose() }
})

test("clip sharing is backend-root scoped and disposing one backend leaves the other intact", () => {
  const f = fixture()
  const other = new RendererWebGpuBackend({font, rectInstancing: "disabled", invalidateGeometry() {}})
  try {
    const frame = f.renderer.flush()
    f.backend.applyFrame(frame)
    other.applyFrame(frame)
    const first = rowObjects(f, frame)
    const second = rowObjects(f, frame, 0, other)
    const secondClips = second.text.presentationClips
    const secondValues = clipValues(secondClips)
    expect(first.text.presentationClips).not.toBe(secondClips)
    expect(first.text.presentationClips.every((clip, index) => clip.coordinateSpace !== secondClips[index]!.coordinateSpace)).toBe(true)
    f.backend.root.position.x = 40
    f.backend.root.updateWorldMatrix()
    expect(clipValues(first.text.presentationClips)).not.toEqual(secondValues)
    expect(clipValues(secondClips)).toEqual(secondValues)
    f.backend.dispose()
    expect(f.backend.root.children).toHaveLength(0)
    expect(first.text.parent).toBeNull()
    expect(first.rectangle.parent).toBeNull()
    expect(first.text.presentationClips).toHaveLength(0)
    expect(first.rectangle.presentationClips).toHaveLength(0)
    expect(second.text.parent).toBe(other.root)
    expect(second.text.presentationClips).toBe(secondClips)
    expect(clipValues(secondClips)).toEqual(secondValues)
    other.applyFrame(Object.freeze({...frame, revision: frame.revision + 1}))
    expect(second.text.presentationClips).toBe(secondClips)
  } finally {
    other.dispose()
    f.dispose()
  }
})
