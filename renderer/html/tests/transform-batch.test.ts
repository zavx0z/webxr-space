import {expect, test} from "bun:test"
import {createDocument, Node, type HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer, hitTestProjection, type RenderClip, type RenderFrame} from "../src/index.ts"
import {readCanonicalRenderFrameChanges} from "../src/frame-changes.ts"

const fixture = (count = 2, extraRules = "") => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:600px;height:300px;overflow:hidden")
  document.append(root)
  const styleSheets = [`.layer { position:absolute;left:0;top:0;width:200px;height:200px;overflow:hidden;border-radius:8px;transform-origin:0 0 }
    .row {height:20px;line-height:20px;color:#abcdef;background:#243344}
    ${extraRules}`]
  const layers: HTMLElement[] = []
  for (let index = 0; index < count; index++) {
    const layer = document.createElement("div")
    layer.className = "layer"
    layer.setAttribute("style", `transform:translate(${index * 240}px,0px) scale(1)`)
    for (let rowIndex = 0; rowIndex < 80; rowIndex++) {
      const row = document.createElement("div")
      row.className = "row"
      row.textContent = `Layer ${index}, row ${rowIndex}`
      layer.append(row)
    }
    root.append(layer)
    layers.push(layer)
  }
  let measurements = 0
  const options = {document, root, viewport: {width: 600, height: 300}, styleSheets}
  const renderer = createDocumentRenderer({...options,
    textMeasurer: {measureTextAdvance(text) { measurements += 1
      return text.length * 6 }},
  })
  const ids = new WeakMap<Node, number>()
  let nextId = 0
  const snapshot = (frame: RenderFrame) => JSON.parse(JSON.stringify({
    boxes: [...frame.boxes], display: [...frame.displayList], hits: [...frame.hits], hitOrder: frame.hitOrder,
    scrolls: [...frame.scrolls], transforms: [...frame.presentationTransforms ?? []],
  }, (key, value) => {
    if (key === "clips" && Array.isArray(value)) return value.map((clip: RenderClip) => ({
      ...clip,
      transform: clip.presentationOwner == null ? clip.transform : frame.presentationTransforms?.get(clip.presentationOwner) ?? clip.transform,
    }))
    if (value instanceof Node) {
      if (!ids.has(value)) ids.set(value, nextId++)
      return ids.get(value)
    }
    return typeof value === "number" ? Math.round(value * 1e7) / 1e7 : value
  }))
  const compareFresh = (frame: RenderFrame) => {
    const reference = createDocumentRenderer({...options, registerGeometry: false, textMeasurer: {measureTextAdvance: text => text.length * 6}})
    try {
      const fresh = reference.flush()
      expect(snapshot(frame)).toEqual(snapshot(fresh))
      for (const [x, y] of [[10, 10], [50, 30], [140, 80], [300, 70], [490, 180]]) {
        expect(hitTestProjection(frame, x!, y!)?.node === hitTestProjection(fresh, x!, y!)?.node).toBe(true)
      }
    } finally { reference.dispose() }
  }
  return {document, root, layers, renderer, snapshot, compareFresh,
    measured: () => measurements, resetMeasured: () => { measurements = 0 },
  }
}

test("one transaction of independent transforms retains layout and publishes one canonical frame delta", () => {
  const f = fixture()
  try {
    let previous = f.renderer.flush()
    for (const [x, y, scale] of [[16, 8, 1], [32, 20, 0.8], [-30, -12, 1.2], [0, 0, 1]]) {
      const old = f.snapshot(previous)
      f.resetMeasured()
      f.document.transaction(() => {
        for (const [index, layer] of f.layers.entries()) {
          layer.setAttribute("style", `transform:translate(${index * 240 + x!}px,${y}px) scale(${scale})`)
        }
      })
      const next = f.renderer.flush()
      expect(f.measured()).toBe(0)
      expect(next.revision).toBe(previous.revision + 1)
      const changes = readCanonicalRenderFrameChanges(next)!
      expect(changes.previous === previous).toBe(true)
      expect(new Set(changes.indexes).size).toBe(changes.indexes.length)
      for (let index = 0; index < next.displayList.length; index++) {
        if (next.displayList[index] !== previous.displayList[index]) expect(changes.indexes).toContain(index)
      }
      expect(f.snapshot(previous)).toEqual(old)
      f.compareFresh(next)
      previous = next
    }
  } finally { f.renderer.dispose() }
}, 30_000)

test("mixed text or inherited custom-property changes never disappear behind later transform candidates", () => {
  for (const kind of ["text", "custom-property"] as const) {
    for (const transformFirst of [false, true]) {
      const f = fixture(2, ".row { color:var(--tone,#abcdef) }")
      try {
        f.renderer.flush()
        const transform = () => f.layers[0]!.setAttribute("style", "transform:translate(25px,10px) scale(1)")
        const other = () => {
          if (kind === "text") f.layers[1]!.firstChild!.textContent = "Changed retained text"
          else f.root.setAttribute("style", `${f.root.getAttribute("style")};--tone:#ff0011`)
        }
        f.document.transaction(() => {
          if (transformFirst) { transform()
            other() }
          else { other()
            transform() }
        })
        const next = f.renderer.flush()
        expect(readCanonicalRenderFrameChanges(next) === null).toBe(true)
        f.compareFresh(next)
        const texts = next.displayList.filter(item => item.kind === "text")
        if (kind === "text") expect(texts.some(item => item.text === "Changed retained text")).toBe(true)
        else expect(texts.every(item => item.color === "#ff0011")).toBe(true)
      } finally { f.renderer.dispose() }
    }
  }
})

test("nested transform targets and oversized batches conservatively rebuild the full layout", () => {
  for (const count of [2, 9]) {
    const f = fixture(count)
    try {
      if (count === 2) f.layers[0]!.append(f.layers[1]!)
      f.renderer.flush()
      f.document.transaction(() => {
        for (const [index, layer] of f.layers.entries()) {
          layer.setAttribute("style", `transform:translate(${index * 10 + 5}px,10px) scale(0.9)`)
        }
      })
      const next = f.renderer.flush()
      expect(readCanonicalRenderFrameChanges(next) === null).toBe(true)
      f.compareFresh(next)
    } finally { f.renderer.dispose() }
  }
})

test("style-attribute selector dependencies and final caller overrides retain normal cascade semantics", () => {
  for (const rules of [
    ".layer[style] .row {color:#ff0011}",
    "",
  ]) {
    const f = fixture(2, rules)
    try {
      if (rules === "") {
        for (const layer of f.layers) {
          layer.setAttribute("style", `${layer.getAttribute("style")};transform:translate(40px,30px) scale(1)`)
        }
      }
      f.renderer.flush()
      f.document.transaction(() => {
        for (const [index, layer] of f.layers.entries()) {
          if (rules.includes("[style]")) layer.removeAttribute("style")
          else layer.setAttribute("style", `transform:translate(${index * 240 + 15}px,10px) scale(0.9);transform:translate(40px,30px) scale(1)`)
        }
      })
      const next = f.renderer.flush()
      f.compareFresh(next)
      if (rules.includes("[style]")) {
        expect(readCanonicalRenderFrameChanges(next) === null).toBe(true)
        expect(next.displayList.filter(item => item.kind === "text").every(item => item.color === "#abcdef")).toBe(true)
      }
      else expect(next.boxByNode.get(f.layers[0]!)?.transform).toMatchObject({translateX: 40, translateY: 30, scaleX: 1, scaleY: 1})
    } finally { f.renderer.dispose() }
  }
})
