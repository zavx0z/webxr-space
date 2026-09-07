import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {TrueTypeFont} from "@zavx0z/engine"
import {createDocumentInteractionController, createDocumentRenderer, hitTestProjection, type RectDisplayItem, type RenderClip, type RenderFrame} from "@zavx0z/renderer"
import {isRendererOwnedFrame, readCanonicalRenderFrameChanges} from "@zavx0z/renderer/frame-changes"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

const fixture = (clipped = true) => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", `position:relative;width:300px;height:100px;${clipped ? "overflow:hidden" : ""}`)
  document.append(root)
  const nodes = [document.createElement("div"), document.createElement("div")]
  for (const [index, node] of nodes.entries()) {
    node.setAttribute("style", `position:absolute;left:${index * 20}px;top:0;width:10px;height:10px;background:#ff000080`)
    root.append(node)
  }
  const renderer = createDocumentRenderer({document, root, viewport: {width: 300, height: 100}})
  const initial = renderer.flush()
  const backend = (rectInstancing: "safe" | "disabled" = "safe") => new RendererWebGpuBackend({rectInstancing, invalidateGeometry() {}})
  const withClips = (clips: readonly RenderClip[], revision: number): RenderFrame => Object.freeze({
    ...initial,
    revision,
    displayList: Object.freeze(initial.displayList.map(item => Object.freeze({...item, clips}))),
  })
  return {document, root, nodes, renderer, initial, backend, withClips}
}

test("owned canonical transform deltas skip descriptor eligibility only after validated initial paint", () => {
  const f = fixture(false)
  const backend = f.backend()
  const descriptors = Object.getOwnPropertyDescriptors
  let inspected = new Set<unknown>(f.initial.displayList)
  let reads = 0
  Object.getOwnPropertyDescriptors = ((value: object) => {
    if (inspected.has(value)) reads += 1
    return descriptors(value)
  }) as typeof Object.getOwnPropertyDescriptors
  try {
    expect(isRendererOwnedFrame(f.initial)).toBe(true)
    backend.applyFrame(f.initial)
    expect(reads).toBeGreaterThan(0)
    f.document.transaction(() => {
      for (const node of f.nodes) {
        node!.setAttribute("style", `${node!.getAttribute("style")};transform:translate(5px,5px)`)
      }
    })
    const frame = f.renderer.flush()
    expect(isRendererOwnedFrame(frame)).toBe(true)
    expect(readCanonicalRenderFrameChanges(frame)?.previous === f.initial).toBe(true)
    inspected = new Set(frame.displayList)
    reads = 0
    backend.applyFrame(frame)
    expect(backend.diagnostics.rectPlanReused).toBe(true)
    expect(reads).toBe(0)
    expect(isRendererOwnedFrame(Object.freeze({...frame}))).toBe(false)
  } finally {
    Object.getOwnPropertyDescriptors = descriptors
    backend.dispose()
    f.renderer.dispose()
  }
})

test("tooltip composition propagates provenance only from actual Renderer frames", async () => {
  const f = fixture()
  const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const ownedInteraction = createDocumentInteractionController({document: f.document, hitTest: hitTestProjection, tooltipDelayMs: 0})
  const callerInteraction = createDocumentInteractionController({document: f.document, hitTest: hitTestProjection, tooltipDelayMs: 0})
  let x = 0
  let color = "#ff0000"
  const callerFrame = Object.freeze({...f.initial, displayList: Object.freeze(f.initial.displayList.slice(0, 1).map(item =>
    Object.freeze({...item, get x() { return x }, get color() { return color }}),
  ))})
  try {
    f.root.title = "Tooltip source"
    ownedInteraction.pointerMove(f.initial, {clientX: 5, clientY: 5, timeStamp: 0})
    const owned = ownedInteraction.composeFrame(f.initial, 10)
    expect(owned.displayList.length).toBeGreaterThan(f.initial.displayList.length)
    expect(isRendererOwnedFrame(owned)).toBe(true)
    expect(isRendererOwnedFrame(callerFrame)).toBe(false)
    callerInteraction.pointerMove(callerFrame, {clientX: 5, clientY: 5, timeStamp: 0})
    const first = callerInteraction.composeFrame(callerFrame, 10)
    expect(isRendererOwnedFrame(first)).toBe(false)
    backend.applyFrame(first)
    expect(backend.root.children[0]!.position.x).toBe(5)

    color = "#00ff00"
    callerInteraction.pointerMove(callerFrame, {clientX: 6, clientY: 5, timeStamp: 10})
    const next = callerInteraction.composeFrame(callerFrame, 20)
    // Caller accessors can change outside Renderer invalidation; composition
    // cannot certify that only its tooltip changed.
    expect(readCanonicalRenderFrameChanges(next)).toBeNull()
    expect(isRendererOwnedFrame(next)).toBe(false)
    backend.applyFrame(next)
    expect((backend.root.children[0] as unknown as {material: {fill: {g: number}}}).material.fill.g).toBe(1)

    x = Number.NaN
    f.root.title = "Changed tooltip"
    const invalid = callerInteraction.composeFrame(callerFrame, 30)
    expect(isRendererOwnedFrame(invalid)).toBe(false)
    expect(() => backend.applyFrame(invalid)).toThrow()
    const publicApi = await import("@zavx0z/renderer/frame-changes")
    expect("markRendererOwnedFrame" in publicApi).toBe(false)
    expect("recordRendererOwnedFrameChanges" in publicApi).toBe(false)
  } finally {
    ownedInteraction.dispose()
    callerInteraction.dispose()
    backend.dispose()
    f.renderer.dispose()
  }
})

test("a reused rectangle batch tests overlap against the latest position of every instance", () => {
  const f = fixture(false)
  const backend = f.backend()
  const fresh = f.backend()
  const {presentationTransforms: _transforms, ...source} = f.initial
  let frame: RenderFrame = Object.freeze(source)
  try {
    backend.applyFrame(frame)
    expect(backend.diagnostics.rectInstancedInstances).toBe(2)
    frame = Object.freeze({...frame, revision: 2, displayList: Object.freeze(frame.displayList.map(item =>
      item.node === f.nodes[0] ? Object.freeze({...item, x: 100}) : item,
    ))})
    backend.applyFrame(frame)
    expect(backend.diagnostics.rectPlanReused).toBe(true)
    expect(backend.diagnostics.rectInstancedInstances).toBe(2)

    frame = Object.freeze({...frame, revision: 3, displayList: Object.freeze(frame.displayList.map(item =>
      item.node === f.nodes[1] ? Object.freeze({...item, x: 100}) : item,
    ))})
    backend.applyFrame(frame)
    fresh.applyFrame(frame)
    expect(backend.diagnostics.rectPlanReused).toBe(false)
    expect(backend.diagnostics.rectScalarDraws).toBe(2)
    expect(backend.diagnostics.rectInstancedInstances).toBe(0)
    expect(backend.diagnostics.rectScalarDraws).toBe(fresh.diagnostics.rectScalarDraws)
  } finally {
    backend.dispose()
    fresh.dispose()
    f.renderer.dispose()
  }
})

for (const rectInstancing of ["safe", "disabled"] as const) {
  test(`${rectInstancing}: inherited frozen clip fields remain live and uncacheable`, () => {
    const f = fixture()
    const backend = f.backend(rectInstancing)
    const fresh = f.backend(rectInstancing)
    const original = f.initial.displayList[0]!.clips[0]!
    const prototype = {...original, presentationOwner: null}
    const inherited = Object.freeze(Object.create(prototype)) as RenderClip
    const chain = Object.freeze([inherited])
    try {
      backend.applyFrame(f.withClips(chain, 1))
      const snapshot = backend.root.children[0]!.presentationClips[0]!
      expect(snapshot.halfSize[0]).toBe(150)
      prototype.width = 50
      const frame = f.withClips(chain, 2)
      backend.applyFrame(frame)
      fresh.applyFrame(frame)
      expect(backend.root.children[0]!.presentationClips[0]!.halfSize[0]).toBe(25)
      expect(backend.root.children[0]!.presentationClips[0]!.halfSize).toEqual(fresh.root.children[0]!.presentationClips[0]!.halfSize)
      expect(snapshot.halfSize[0]).toBe(150)
      prototype.width = Number.NaN
      expect(() => backend.applyFrame(f.withClips(chain, 3))).toThrow()
    } finally {
      backend.dispose()
      fresh.dispose()
      f.renderer.dispose()
    }
  })

  test(`${rectInstancing}: inherited transforms are snapshotted by value rather than own spread fields`, () => {
    const f = fixture()
    const backend = f.backend(rectInstancing)
    const original = f.initial.displayList[0]!.clips[0]!
    const prototype = {...original.transform}
    const transform = Object.freeze(Object.create(prototype)) as RenderClip["transform"]
    const clip = Object.freeze({...original, presentationOwner: null, transform})
    const chain = Object.freeze([clip])
    try {
      backend.applyFrame(f.withClips(chain, 1))
      const snapshot = backend.root.children[0]!.presentationClips[0]!
      expect(snapshot.coordinateSpace.matrixWorld.elements[12]).toBe(0)
      prototype.translateX = 12
      backend.applyFrame(f.withClips(chain, 2))
      expect(backend.root.children[0]!.presentationClips[0]!.coordinateSpace.matrixWorld.elements[12]).toBe(12)
      expect(snapshot.coordinateSpace.matrixWorld.elements[12]).toBe(0)
      prototype.scaleX = Number.NaN
      expect(() => backend.applyFrame(f.withClips(chain, 3))).toThrow()
    } finally {
      backend.dispose()
      f.renderer.dispose()
    }
  })

  test(`${rectInstancing}: frozen display getters and inherited fields do not reuse prepared paint`, () => {
    const f = fixture(false)
    const backend = f.backend(rectInstancing)
    const {presentationTransforms: _transforms, ...source} = f.initial
    const original = source.displayList[0] as RectDisplayItem
    const prototype = {...original}
    let color = "#ff0000"
    const inherited = Object.freeze(Object.create(prototype)) as RectDisplayItem
    const accessor = Object.freeze({...original, get color() { return color }})
    try {
      for (const item of [inherited, accessor]) {
        prototype.color = "#ff0000"
        color = "#ff0000"
        const initial = Object.freeze({...source, revision: 1, displayList: Object.freeze([item])})
        const current = f.backend(rectInstancing)
        const reference = f.backend(rectInstancing)
        try {
          current.applyFrame(initial)
          const first = current.root.children[0]!
          const firstFill = {...(first as unknown as {material: {fill: object}}).material.fill}
          prototype.color = "#00ff00"
          color = "#00ff00"
          const next = Object.freeze({...initial, revision: 2})
          current.applyFrame(next)
          reference.applyFrame(next)
          expect(current.diagnostics.rectPlanReused).toBe(false)
          expect((current.root.children[0] as unknown as {material: {fill: object}}).material.fill).toEqual(
            (reference.root.children[0] as unknown as {material: {fill: object}}).material.fill,
          )
          expect((first as unknown as {material: {fill: object}}).material.fill).not.toEqual(firstFill)
        } finally {
          current.dispose()
          reference.dispose()
        }
      }
    } finally {
      backend.dispose()
      f.renderer.dispose()
    }
  })

  test(`${rectInstancing}: an unbranded frame rereads mutable presentation-map values and replacements`, () => {
    const f = fixture()
    const backend = f.backend(rectInstancing)
    const original = f.initial.displayList[0]!.clips[0]!
    const clip = Object.freeze({...original, presentationOwner: f.root})
    const transform = {...clip.transform}
    const transforms = new Map([[f.root, transform]])
    const frame = Object.freeze({...f.withClips(Object.freeze([clip]), 1), presentationTransforms: transforms})
    try {
      backend.applyFrame(frame)
      const snapshot = backend.root.children[0]!.presentationClips[0]!
      transform.translateX = 40
      backend.applyFrame(Object.freeze({...frame, revision: 2}))
      expect(backend.root.children[0]!.presentationClips[0]!.coordinateSpace.matrixWorld.elements[12]).toBe(40)
      expect(snapshot.coordinateSpace.matrixWorld.elements[12]).toBe(0)
      transforms.set(f.root, Object.freeze({...transform, translateX: 80}))
      backend.applyFrame(Object.freeze({...frame, revision: 3}))
      expect(backend.root.children[0]!.presentationClips[0]!.coordinateSpace.matrixWorld.elements[12]).toBe(80)
      transforms.set(f.root, {...transform, scaleX: Number.NaN})
      expect(() => backend.applyFrame(Object.freeze({...frame, revision: 4}))).toThrow()
    } finally {
      backend.dispose()
      f.renderer.dispose()
    }
  })
}
