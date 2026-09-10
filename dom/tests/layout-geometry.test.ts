import {expect, test} from "bun:test"
import {createDocument, DOMRectReadOnly} from "../src/index.ts"
import {flushDocumentLayoutObservers, readElementLayoutRect, observeElementLayout, registerDocumentGeometryReader, registerDocumentLayoutObserverScheduler} from "../geometry.ts"

test("[DOM-LAYOUT-RECT-001] локальные snapshots и closest owner сохраняют дроби и отделяют отсутствие бокса", () => {
  const document = createDocument()
  const root = document.createElement("div")
  const child = document.createElement("span")
  root.append(child)
  expect(child.getLayoutRect()).toBeNull()
  document.append(root)
  expect(child.getLayoutRect()).toBeNull()
  const stop = registerDocumentGeometryReader(document, root, () => [{width: 999}], element => element === root
    ? {x: 10.25, y: 20.5, width: 100, height: 100}
    : {x: 13.375, y: 25.75, width: 0, height: 0})
  try {
    expect(child.getBoundingClientRect().width).toBe(999)
    const snapshot = child.getLayoutRect(root)!
    expect(snapshot).toBeInstanceOf(DOMRectReadOnly)
    expect(snapshot.toJSON()).toEqual({x: 3.125, y: 5.25, width: 0, height: 0, top: 5.25, right: 3.125, bottom: 5.25, left: 3.125})
    expect(() => { (snapshot as {width: number}).width = 9 }).toThrow()
    expect(() => child.getLayoutRect(createDocument().createElement("div"))).toThrow(TypeError)
    child.remove()
    expect(child.getLayoutRect()).toBeNull()
    expect(snapshot.width).toBe(0)
  } finally { stop() }
})

test("[DOM-LAYOUT-RECT-002] подписка до provider, стабильная доставка, reentrant защита и отписка", () => {
  const document = createDocument()
  const element = document.createElement("div")
  document.append(element)
  const received: Array<number | null> = []
  let requested = 0
  let width = 10.25
  const releaseScheduler = registerDocumentLayoutObserverScheduler(document, () => { requested++ })
  const stop = observeElementLayout(element, rect => {
    expect(() => flushDocumentLayoutObservers(document)).toThrow("recursively")
    received.push(rect?.width ?? null)
  })
  expect(requested).toBe(1)
  const release = registerDocumentGeometryReader(document, element, () => [], () => ({width}))
  try {
    expect(flushDocumentLayoutObservers(document)).toBe(true)
    expect(received).toEqual([10.25])
    expect(flushDocumentLayoutObservers(document)).toBe(false)
    width = 20.5
    expect(flushDocumentLayoutObservers(document)).toBe(true)
    release()
    expect(flushDocumentLayoutObservers(document)).toBe(true)
    expect(received).toEqual([10.25, 20.5, null])
    stop()
    stop()
    expect(flushDocumentLayoutObservers(document)).toBe(false)
  } finally {
    stop()
    release()
    releaseScheduler()
  }
})


test("[DOM-LAYOUT-RECT-003] повторный cleanup старого scheduler не освобождает новое подключение", () => {
  const document = createDocument()
  const element = document.createElement("div")
  let requests = 0
  const schedule = () => { requests++ }
  const first = registerDocumentLayoutObserverScheduler(document, schedule)
  first()
  const second = registerDocumentLayoutObserverScheduler(document, schedule)
  first()
  const stop = observeElementLayout(element, () => {})
  expect(requests).toBe(1)
  stop()
  second()
})


test("[DOM-LAYOUT-RECT-004] geometry boundary отвергает чужой объект до доступа к его полям", () => {
  const document = createDocument()
  const element = document.createElement("div")
  let reads = 0
  const foreign = Object.create(null) as globalThis.Element
  Object.defineProperty(foreign, "ownerDocument", {get() {
    reads++
    return document
  }})
  expect(() => readElementLayoutRect(foreign)).toThrow("WebXR semantic Element")
  expect(() => readElementLayoutRect(element, foreign)).toThrow("WebXR semantic Element")
  expect(() => observeElementLayout(foreign, () => {})).toThrow("WebXR semantic Element")
  expect(() => observeElementLayout(element, () => {}, {relativeTo: foreign})).toThrow("WebXR semantic Element")
  expect(() => element.getLayoutRect(foreign)).toThrow("WebXR semantic Element")
  expect(reads).toBe(0)
})
