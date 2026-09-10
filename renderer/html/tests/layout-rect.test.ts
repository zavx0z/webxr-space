import {expect, test} from "bun:test"
import {createDocument, DOMRectReadOnly, acquireDocumentAuthorStyleSheetOwner, type HTMLElement, type Element} from "@zavx0z/dom"
import {observeElementLayout, flushDocumentLayoutObservers} from "@zavx0z/dom/geometry"
import {createDocumentRenderer} from "../src/index.ts"

function setStyle(element: Element, name: string, value: string) {
  element.setAttribute("style", `${element.getAttribute("style") ?? ""};${name}:${value}`)
}

function fixture() {
  const document = createDocument()
  const root = document.createElement("section") as HTMLElement
  root.setAttribute("style", "display:flex;align-items:flex-start;width:400px;height:300px;position:relative")
  document.append(root)
  let projection = 1
  let metricScale = 1
  const renderer = createDocumentRenderer({
    document, root, viewport: {width: 400, height: 300},
    projectClientPoint: point => ({x: point.x * projection + 200, y: point.y * projection + 100}),
    textMeasurer: {measureTextAdvance: (text, fontSize) => text.length * fontSize / 2 * metricScale},
  })
  const element = document.createElement("article")
  element.setAttribute("style", "display:flex;flex-direction:column;flex:0 0 auto;padding:3.25px;border:1.125px solid red;visibility:hidden")
  const label = document.createElement("span")
  label.setAttribute("style", "font-size:var(--measure-font-size,13px);line-height:17.5px")
  label.textContent = "Text"
  element.append(label)
  root.append(element)
  return {document, root, element, label, renderer, setProjection(value: number) { projection = value }, setMetricScale(value: number) { metricScale = value }}
}

test("[RENDERER-LAYOUT-RECT-001] скрытый flex даёт дробный CSS border-box до GPU, transforms и projection", () => {
  const f = fixture()
  try {
    const first = f.element.getLayoutRect()!
    expect(first).toBeInstanceOf(DOMRectReadOnly)
    expect(first.width).toBe(34.75)
    expect(first.height).toBe(26.25)
    expect(f.label.getLayoutRect(f.element)?.x).toBe(4.375)
    expect(f.label.getLayoutRect(f.element)?.y).toBe(4.375)
    f.setProjection(2.5)
    setStyle(f.root, "transform", "translate(19px,23px) scale(2)")
    expect(f.element.getLayoutRect()?.toJSON()).toEqual(first.toJSON())
    expect(f.element.getBoundingClientRect().width).toBe(first.width * 5)
    const frame = f.renderer.flush()
    f.element.getLayoutRect()
    expect(f.renderer.flush()).toBe(frame)
    expect(f.document.querySelectorAll("canvas")).toHaveLength(0)
    f.label.textContent = "Text longer"
    expect(f.element.getLayoutRect()?.width).toBe(80.25)
    expect(f.root.firstElementChild).toBe(f.element)
    expect(first.width).toBe(34.75)
    setStyle(f.label, "font-size", "19.5px")
    expect(f.element.getLayoutRect()?.width).toBe(116)
    f.setMetricScale(2)
    f.renderer.invalidate(f.root)
    expect(f.element.getLayoutRect()?.width).toBe(223.25)
    setStyle(f.element, "max-width", "90.5px")
    expect(f.element.getLayoutRect()?.width).toBe(99.25)
    setStyle(f.element, "box-sizing", "border-box")
    expect(f.element.getLayoutRect()?.width).toBe(90.5)
  } finally { f.renderer.dispose() }
})

test("[RENDERER-LAYOUT-RECT-002] наблюдение обновляет геометрию после текста, CSS, constraints, удаления и reparent", () => {
  const f = fixture()
  const rects: Array<DOMRectReadOnly | null> = []
  const stop = observeElementLayout(f.element, rect => {
    // Callback находится вне расчёта layout: повторное чтение не рекурсивно.
    expect(f.element.getLayoutRect()?.width ?? null).toBe(rect?.width ?? null)
    rects.push(rect)
  })
  const styles = acquireDocumentAuthorStyleSheetOwner(f.document)
  try {
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    expect(flushDocumentLayoutObservers(f.document)).toBe(false)
    f.setProjection(3)
    setStyle(f.root, "transform", "scale(3)")
    expect(flushDocumentLayoutObservers(f.document)).toBe(false)
    f.label.textContent = "Updated"
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    const previousWidth = rects.at(-1)!.width
    styles.replace([{id: "font-theme", cssText: "section { --measure-font-size: 24px; }"}])
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    expect(rects.at(-1)!.width).toBeGreaterThan(previousWidth)
    setStyle(f.element, "max-width", "35.25px")
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    setStyle(f.element, "display", "none")
    expect(f.element.getLayoutRect()).toBeNull()
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    expect(rects.at(-1)).toBeNull()
    setStyle(f.element, "display", "flex")
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    const second = f.document.createElement("section")
    f.root.append(second)
    const other = createDocumentRenderer({document: f.document, root: second, viewport: {width: 300, height: 200}})
    try {
      second.append(f.element)
      expect(flushDocumentLayoutObservers(f.document)).toBe(true)
      expect(() => f.element.getLayoutRect(f.root)).toThrow("another projection root")
      f.root.append(f.element)
      expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    } finally { other.dispose() }
    f.element.remove()
    expect(f.element.getLayoutRect()).toBeNull()
    expect(flushDocumentLayoutObservers(f.document)).toBe(true)
    expect(rects.at(-1)).toBeNull()
    stop()
    f.root.append(f.element)
    expect(flushDocumentLayoutObservers(f.document)).toBe(false)
  } finally {
    stop()
    styles.release()
    f.renderer.dispose()
  }
})

test("[RENDERER-LAYOUT-RECT-003] relativeTo вычитает общий scroll, fragments объединяются, нулевой box отличим от отсутствующего", () => {
  const f = fixture()
  try {
    setStyle(f.root, "display", "block")
    setStyle(f.root, "overflow", "auto")
    setStyle(f.element, "width", "600px")
    const before = f.label.getLayoutRect(f.element)!
    f.root.scrollLeft = 20
    expect(f.label.getLayoutRect(f.element)?.toJSON()).toEqual(before.toJSON())
    expect(f.element.getLayoutRect()?.x).toBe(-20)
    setStyle(f.element, "width", "60px")
    setStyle(f.label, "display", "inline")
    f.label.textContent = "ab cd ef gh ij kl mn op"
    const rect = f.label.getLayoutRect()!
    const fragments = f.renderer.flush().boxByNode.get(f.label)!.fragments
    expect(rect.height).toBeGreaterThan(17.5)
    if (fragments) expect(rect.width).toBe(Math.max(...fragments.map(value => value.x + value.width)) - Math.min(...fragments.map(value => value.x)))
    f.label.textContent = ""
    f.label.setAttribute("style", "position:absolute;left:11.25px;top:22.5px;width:0;height:0")
    expect(f.label.getLayoutRect()?.width).toBe(0)
    expect(f.label.getLayoutRect()?.x).toBe(11.25)
    f.renderer.dispose()
    expect(f.label.getLayoutRect()).toBeNull()
  } finally { f.renderer.dispose() }
})

test("[RENDERER-LAYOUT-VISIBILITY-001] hidden сохраняет boxes, убирает paint/hit и допускает visible потомка", () => {
  const f = fixture()
  const input = f.document.createElement("input")
  input.value = "Скрытое поле"
  f.element.append(input)
  const shown = f.document.createElement("button")
  shown.setAttribute("style", "visibility:visible;width:25.5px;height:10.25px;background:blue")
  shown.textContent = "Виден"
  f.element.append(shown)
  try {
    const first = f.element.getLayoutRect()!
    const frame = f.renderer.flush()
    expect(frame.boxByNode.has(f.element)).toBe(true)
    expect(frame.hits.has(f.element)).toBe(false)
    expect(frame.hits.has(f.label)).toBe(false)
    expect(frame.hits.has(input)).toBe(false)
    expect(frame.hits.has(shown)).toBe(true)
    expect(frame.displayList.some(item => item.node === f.element || item.node === input || f.label.contains(item.node))).toBe(false)
    expect(frame.displayList.some(item => shown.contains(item.node))).toBe(true)
    setStyle(f.element, "visibility", "visible")
    expect(f.element.getLayoutRect()?.toJSON()).toEqual(first.toJSON())
    expect(f.renderer.flush().hits.has(f.label)).toBe(true)
    setStyle(f.element, "visibility", "hidden")
    expect(f.renderer.flush().hits.has(f.label)).toBe(false)
    f.label.textContent += " обновлено"
    expect(f.renderer.flush().displayList.some(item => f.label.contains(item.node))).toBe(false)
  } finally { f.renderer.dispose() }
})

test("[RENDERER-LAYOUT-RECT-004] дробное перемещение одиночного бокса не меняет его размеры и не создаёт повторное измерение", () => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:400px;height:300px")
  document.append(root)
  const element = document.createElement("div")
  root.append(element)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 400, height: 300}})
  const place = (position: number) => element.setAttribute("style", `position:absolute;left:${position}px;top:${position}px;width:32px;height:32px;visibility:hidden`)
  let deliveries = 0
  const stop = observeElementLayout(element, () => { deliveries++ }, {relativeTo: element})
  try {
    place(0)
    const initial = element.getLayoutRect(element)!
    expect(flushDocumentLayoutObservers(document)).toBe(true)
    for (const position of [96.2, 0, 96.2, 62.4, 63.6]) {
      place(position)
      const rect = element.getLayoutRect()!
      expect(rect.x).toBe(position)
      expect(rect.y).toBe(position)
      expect(rect.width).toBe(32)
      expect(rect.height).toBe(32)
      expect(element.getLayoutRect(element)?.toJSON()).toEqual(initial.toJSON())
      expect(flushDocumentLayoutObservers(document)).toBe(false)
    }
    expect(deliveries).toBe(1)
  } finally {
    stop()
    renderer.dispose()
  }
})
