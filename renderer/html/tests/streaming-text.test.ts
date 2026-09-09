import {expect, test} from "bun:test"
import {createDocument, HTMLElement, Node} from "@zavx0z/dom"
import {createDocumentRenderer, fulfillScrollIntoViewRequests, getRangeClientRects,
  hitTestProjection, readRenderedSelectionText, createDocumentInteractionState, type RenderFrame} from "../src/index.ts"
import {textStreamFrameStatistics} from "../src/renderer.ts"

function fixture(style = "display:block;width:320px;height:180px;overflow:auto;border:2px solid #333;border-radius:8px", sheets: readonly string[] = []) {
  const document = createDocument()
  const root = document.createElement("article") as HTMLElement
  root.setAttribute("style", `${style};--ink:#abcdef;font-size:10px;line-height:14px`)
  document.append(root)
  let measurements = 0
  const renderer = createDocumentRenderer({document, root, viewport: {width: 320, height: 180}, styleSheets: sheets,
    textMeasurer: {measureTextAdvance(text) { measurements++; return text.length * 6 }},
  })
  const row = (index: number, parent: Node = root) => {
    const node = document.createElement("p") as HTMLElement
    node.setAttribute("style", "display:block;margin:0;min-height:14px;white-space:pre;line-height:14px")
    const prefix = document.createElement("span")
    prefix.setAttribute("style", "color:var(--ink)")
    prefix.textContent = `row ${index} `
    const tail = document.createTextNode("alpha beta gamma")
    node.append(prefix, tail)
    parent.appendChild(node)
    return node
  }
  const ids = new WeakMap<Node, number>()
  let nextId = 0
  const snapshot = (frame: RenderFrame) => JSON.parse(JSON.stringify({
    boxes: [...frame.boxes], display: [...frame.displayList], hits: [...frame.hits],
    hitOrder: frame.hitOrder, scrolls: [...frame.scrolls], transforms: [...frame.presentationTransforms ?? []],
  }, (_key, value: unknown) => {
    if (value instanceof Node) {
      if (!ids.has(value)) ids.set(value, ++nextId)
      return ids.get(value)
    }
    return typeof value === "number" ? Math.round(value * 1e7) / 1e7 : value
  }))
  const compareFresh = (incremental: RenderFrame) => {
    const before = snapshot(incremental)
    renderer.invalidate(root)
    const fresh = renderer.flush()
    expect(snapshot(fresh)).toEqual(before)
    for (const [x, y] of [[5, 5], [40, 25], [100, 70], [250, 150]]) {
      expect(hitTestProjection(fresh, x!, y!)?.node).toBe(hitTestProjection(incremental, x!, y!)?.node)
    }
    expect(snapshot(incremental)).toEqual(before)
    return fresh
  }
  return {document, root, renderer, row, snapshot, compareFresh,
    measured: () => measurements, resetMeasured() { measurements = 0 },
  }
}

test("streaming append only measures new rich-text rows while preserving full DOM history and Range", () => {
  const f = fixture()
  const rows = Array.from({length: 1000}, (_, index) => f.row(index))
  const range = f.document.createRange()
  range.setStart(rows[0]!.firstChild!.firstChild!, 0)
  range.setEnd(rows[999]!.lastChild!, 5)
  f.document.getSelection().addRange(range)
  try {
    const before = f.renderer.flush()
    const old = f.snapshot(before)
    const copied = readRenderedSelectionText(before)
    f.resetMeasured()
    const added = f.row(1000)
    const after = f.renderer.flush()
    expect(textStreamFrameStatistics(after)).toMatchObject({sources: 1001, changedSources: 1, removedSources: 0,
      materializedBoxes: 0, materializedDisplay: 0, materializedHits: 0})
    expect(f.measured()).toBeLessThan(50)
    expect(after.boxByNode.get(rows[0]!)).toBe(before.boxByNode.get(rows[0]!))
    expect(after.displayList.find(item => item.node === rows[0]!.lastChild)).toBe(before.displayList.find(item => item.node === rows[0]!.lastChild))
    expect(f.root.children).toHaveLength(1001)
    expect(f.root.firstElementChild).toBe(rows[0]!)
    expect(f.document.getSelection().getRangeAt(0)).toBe(range)
    expect(readRenderedSelectionText(after)).toBe(copied)
    expect(getRangeClientRects(after, range).length).toBeGreaterThan(1000)
    expect(f.snapshot(before)).toEqual(old)
    f.compareFresh(after)
    added.scrollIntoView({block: "end"})
    f.resetMeasured()
    const scrolled = fulfillScrollIntoViewRequests(f.renderer)
    expect(f.measured()).toBe(0)
    expect(f.root.scrollTop).toBeGreaterThan(0)
    f.compareFresh(scrolled)
  } finally {f.renderer.dispose()}
}, 30_000)

test.each(["focus-within", "hover", "active"] as const)("same-Document reparent refreshes %s ancestors and cached siblings", pseudo => {
  const document = createDocument()
  const root = document.createElement("article")
  root.setAttribute("style", "display:block;width:300px;height:180px")
  document.append(root)
  const branch = (id: string) => {
    const section = document.createElement("section")
    section.id = id
    const sibling = document.createElement("p")
    sibling.className = "sibling"
    sibling.textContent = `${id} sibling`
    const nested = document.createElement("div")
    section.append(sibling, nested)
    root.append(section)
    return {section, sibling, nested}
  }
  const a = branch("a")
  const b = branch("b")
  const target = document.createElement("button") as HTMLElement
  target.textContent = "Move me"
  a.nested.append(target)
  const interactionState = createDocumentInteractionState(document)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 300, height: 180}, interactionState,
    styleSheets: [`.sibling {color:#000000} section:${pseudo} .sibling {color:#ff0000}`],
  })
  if (pseudo === "focus-within") target.focus()
  else if (pseudo === "hover") interactionState.setHoveredElement(target)
  else interactionState.setActiveElement(target)
  const color = (frame: RenderFrame, node: Node) => {
    const item = frame.displayList.find(item => item.kind === "text" && item.node === node.firstChild)
    return item?.kind === "text" ? item.color : null
  }
  try {
    const before = renderer.flush()
    expect(color(before, a.sibling)).toBe("#ff0000")
    expect(color(before, b.sibling)).toBe("#000000")
    b.nested.append(target)
    if (pseudo === "focus-within") expect(document.activeElement).toBe(target)
    const after = renderer.flush()
    expect(color(after, a.sibling)).toBe("#000000")
    expect(color(after, b.sibling)).toBe("#ff0000")
    renderer.invalidate(root)
    const fresh = renderer.flush()
    expect(color(fresh, a.sibling)).toBe("#000000")
    expect(color(fresh, b.sibling)).toBe("#ff0000")
    expect(color(before, a.sibling)).toBe("#ff0000")
    if (pseudo === "focus-within") target.blur()
    else if (pseudo === "hover") interactionState.setHoveredElement(null)
    else interactionState.setActiveElement(null)
    const released = renderer.flush()
    expect(color(released, a.sibling)).toBe("#000000")
    expect(color(released, b.sibling)).toBe("#000000")
  } finally {renderer.dispose()}
})

test("a changed last row and appended rows agree with full layout, including invisible fragment markers", () => {
  const f = fixture()
  const rows = Array.from({length: 12}, (_, index) => f.row(index))
  const marker = f.document.createComment("keyed list end")
  f.root.append(marker)
  try {
    let frame = f.renderer.flush()
    for (let index = 0; index < 4; index++) {
      const old = f.snapshot(frame)
      f.document.transaction(() => {
        rows.at(-1)!.lastChild!.textContent += ` ${index}`
        const added = f.row(12 + index)
        f.root.insertBefore(added, marker)
        rows.push(added)
      })
      const next = f.renderer.flush()
      expect(f.snapshot(frame)).toEqual(old)
      frame = f.compareFresh(next)
    }
  } finally {f.renderer.dispose()}
})

test("inert keyed markers followed by a visible append retain preceding siblings", () => {
  const f = fixture()
  const rows = Array.from({length: 200}, (_, index) => f.row(index))
  const end = f.document.createComment("range end")
  f.root.append(end)
  try {
    const before = f.renderer.flush()
    f.resetMeasured()
    f.document.transaction(() => {
      f.root.insertBefore(f.document.createComment("new keyed start"), end)
      const node = f.document.createElement("p")
      node.setAttribute("style", rows[0]!.getAttribute("style")!)
      node.textContent = "new text"
      f.root.insertBefore(node, end)
    })
    const after = f.renderer.flush()
    expect(f.measured()).toBeLessThan(50)
    expect(after.boxByNode.get(rows[0]!)).toBe(before.boxByNode.get(rows[0]!))
    f.compareFresh(after)
  } finally {f.renderer.dispose()}
})

test("deferred streaming scroll has the same full geometry as the eager positioned-text fallback", () => {
  const f = fixture()
  const rows = Array.from({length: 160}, (_, index) => f.row(index))
  try {
    f.root.scrollTop = 420
    f.root.scrollLeft = 10
    f.renderer.flush()
    f.row(161)
    const optimized = f.renderer.flush()
    const expected = f.snapshot(optimized)
    // A relative element with no offsets paints identically, but is deliberately
    // outside the static-text retention/deferred-scroll specialization.
    rows[0]!.setAttribute("style", `${rows[0]!.getAttribute("style")};position:relative`)
    const eager = f.renderer.flush()
    expect(f.snapshot(eager)).toEqual(expected)
    expect(f.snapshot(optimized)).toEqual(expected)
    f.compareFresh(eager)
  } finally {f.renderer.dispose()}
})

test("prepending, reordering, removal and reparenting conservatively reflow sibling and inherited styles", () => {
  const f = fixture(undefined, ["article > p { color: #ff0000 } section > p { color: #00ff00 } .muted span { opacity: .5 }"])
  const rows = Array.from({length: 5}, (_, index) => f.row(index))
  const group = f.document.createElement("section")
  group.className = "muted"
  group.setAttribute("style", "display:block;--ink:#123456")
  f.root.append(group)
  try {
    f.renderer.flush()
    for (const mutate of [
      () => f.root.prepend(rows[4]!),
      () => rows[1]!.remove(),
      () => group.append(rows[2]!),
      () => f.root.insertBefore(rows[0]!, rows[3]!),
      () => f.row(8, group),
    ]) {
      mutate()
      f.compareFresh(f.renderer.flush())
    }
  } finally {f.renderer.dispose()}
})

test("custom-property shadows, inherited text metrics and selection policy invalidate cached descendants", () => {
  const f = fixture()
  const rows = Array.from({length: 5}, (_, index) => f.row(index))
  try {
    f.renderer.flush()
    for (const declarations of [
      "--ink:#fedcba;font-size:14px;line-height:20px",
      "--ink:#123456;font-size:11px;line-height:16px;user-select:none",
      "--ink:#456789;font-size:12px;line-height:18px;user-select:contain",
    ]) {
      f.root.setAttribute("style", `display:block;width:160px;height:90px;overflow:auto;${declarations}`)
      f.row(10)
      f.compareFresh(f.renderer.flush())
    }
    rows[0]!.setAttribute("style", "display:block;font-size:18px;white-space:normal;--ink:#111111")
    f.compareFresh(f.renderer.flush())
  } finally {f.renderer.dispose()}
})

test.each(["row", "column"] as const)("streamed text remains correct under %s flex, wrap, resize and nested scrolling", direction => {
  const f = fixture(`display:flex;flex-direction:${direction};flex-wrap:wrap;width:320px;height:180px;overflow:auto`)
  const panel = f.document.createElement("section") as HTMLElement
  panel.setAttribute("style", "display:block;width:130px;height:70px;overflow:auto;border:1px solid #777;transform:scale(.9);transform-origin:0 0")
  f.root.append(panel)
  for (let index = 0; index < 12; index++) f.row(index, panel)
  try {
    f.renderer.flush()
    f.row(13, panel)
    f.compareFresh(f.renderer.flush())
    f.document.transaction(() => {
      panel.scrollLeft = 20
      panel.scrollTop = 40
      f.row(14, panel)
    })
    f.compareFresh(f.renderer.flush())
    panel.setAttribute("style", "display:block;width:90px;height:56px;overflow:auto")
    for (const row of panel.children) row.setAttribute("style", "display:block;margin:0;white-space:normal;line-height:14px")
    f.row(15, panel)
    f.compareFresh(f.renderer.flush())
    f.renderer.resize({width: 230, height: 110})
    f.compareFresh(f.renderer.flush())
  } finally {f.renderer.dispose()}
})

test("native first-legend disabled-state changes are not mistaken for ancestry-local appends", () => {
  const f = fixture(undefined, ["button:disabled { color:#ff0000 } button { color:#00ff00 }"])
  const fieldset = f.document.createElement("fieldset")
  fieldset.setAttribute("disabled", "")
  const button = f.document.createElement("button")
  button.textContent = "Action"
  fieldset.append(button)
  f.root.append(fieldset)
  try {
    f.renderer.flush()
    const legend = f.document.createElement("legend")
    fieldset.append(legend)
    legend.append(button)
    f.compareFresh(f.renderer.flush())
    fieldset.prepend(f.document.createElement("legend"))
    f.compareFresh(f.renderer.flush())
  } finally {f.renderer.dispose()}
})

test("bounded streaming removes a head row without remeasuring retained history or changing directed selection", () => {
  const f = fixture()
  const rows = Array.from({length: 1000}, (_, index) => f.row(index))
  const selection = f.document.getSelection()
  selection.setBaseAndExtent(rows[20]!.lastChild!, 5, rows[10]!.firstChild!.firstChild!, 1)
  try {
    let frame = f.renderer.flush()
    const selected = readRenderedSelectionText(frame)
    for (let index = 0; index < 3; index++) {
      const before = f.snapshot(frame)
      f.resetMeasured()
      f.document.transaction(() => {
        rows.shift()!.remove()
        rows.push(f.row(1000 + index))
      })
      const next = f.renderer.flush()
      expect(f.measured()).toBeLessThan(50)
      expect(textStreamFrameStatistics(next)).toMatchObject({sources: 1000, changedSources: 1, removedSources: 1,
        materializedBoxes: 0, materializedDisplay: 0, materializedHits: 0})
      expect(f.root.children).toHaveLength(1000)
      expect(selection.direction).toBe("backward")
      expect(readRenderedSelectionText(next)).toBe(selected)
      expect(f.snapshot(frame)).toEqual(before)
      frame = f.compareFresh(next)
    }
  } finally {f.renderer.dispose()}
}, 30_000)

test("stream maps keep removed-node snapshots immutable and unsupported middle reorder uses exact fallback", () => {
  const f = fixture()
  const rows = Array.from({length: 300}, (_, index) => f.row(index))
  try {
    const before = f.renderer.flush()
    const originalBox = before.boxByNode.get(rows[0]!)
    rows[0]!.remove()
    f.row(301)
    const after = f.renderer.flush()
    expect(after.boxByNode.has(rows[0]!)).toBe(false)
    expect(after.hits.has(rows[0]!)).toBe(false)
    expect(before.boxByNode.get(rows[0]!)).toBe(originalBox)
    expect([...after.boxByNode.keys()]).not.toContain(rows[0]!)
    expect([...before.boxByNode.keys()]).toContain(rows[0]!)
    f.root.insertBefore(rows[90]!, rows[40]!)
    const reordered = f.renderer.flush()
    expect(textStreamFrameStatistics(reordered)).toBeNull()
    f.compareFresh(reordered)
  } finally {f.renderer.dispose()}
})

test("a picker in another projection does not disable streaming, but an owned picker uses the full path", () => {
  const document = createDocument()
  const page = document.createElement("main")
  const root = document.createElement("article")
  root.setAttribute("style", "display:block;width:300px;height:100px;overflow:auto;font-size:10px;line-height:14px")
  const foreign = document.createElement("select")
  const option = document.createElement("option")
  option.textContent = "Choice"
  foreign.append(option)
  page.append(root, foreign)
  document.append(page)
  const append = () => {
    const row = document.createElement("p")
    row.setAttribute("style", "display:block;margin:0;height:14px;white-space:pre")
    row.textContent = "streaming"
    root.append(row)
  }
  for (let index = 0; index < 300; index++) append()
  const renderer = createDocumentRenderer({document, root, viewport: {width: 300, height: 100}})
  try {
    expect(textStreamFrameStatistics(renderer.flush())?.sources).toBe(300)
    foreign.showPicker()
    append()
    expect(textStreamFrameStatistics(renderer.flush())?.sources).toBe(301)
    root.append(foreign)
    expect(textStreamFrameStatistics(renderer.flush())).toBeNull()
  } finally {renderer.dispose()}
})

test("stacking across a stream boundary stays on the full paint-order path", () => {
  const f = fixture("display:block;width:320px;height:180px;position:relative")
  const log = f.document.createElement("section")
  log.setAttribute("style", "display:block;width:200px;height:80px;overflow:auto")
  f.root.append(log)
  for (let index = 0; index < 300; index++) f.row(index, log)
  const overlay = f.document.createElement("div")
  overlay.setAttribute("style", "position:absolute;z-index:2;top:0;left:0;width:30px;height:30px;background:#fff")
  f.root.append(overlay)
  try {
    const frame = f.renderer.flush()
    expect(textStreamFrameStatistics(frame)).toBeNull()
    f.row(301, log)
    f.compareFresh(f.renderer.flush())
  } finally {f.renderer.dispose()}
})
