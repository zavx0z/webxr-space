import {expect, test} from "bun:test"
import {createDocument, Event, type Element} from "@zavx0z/dom"
import {createApplicationStyleSheets} from "../src/application-stylesheets.ts"
import {createBrowserLinkedAuthorStyleSheetHostWithSeams} from "../src/linked-author-style-sheet-host.ts"

function fixture() {
  const native = createDocument()
  const head = native.createElement("head")
  native.append(head)
  const links: HTMLLinkElement[] = []
  const makeElement = native.createElement.bind(native)
  const nativeOwner = Object.assign(native, {
    head,
    createElement() {
      const element = makeElement("link") as unknown as HTMLLinkElement
      Object.defineProperty(element, "sheet", {value: {cssRules: [{type: 1, cssText: "button { color: red; }"}]}})
      element.compareDocumentPosition = other => {
        const children = head.children as unknown as globalThis.Node[]
        return children.indexOf(element) < children.indexOf(other) ? 4 : 2
      }
      links.push(element)
      return element as unknown as Element
    },
  }) as unknown as globalThis.Document
  const document = createDocument()
  const body = document.createElement("body")
  document.append(body)
  const errors: Error[] = []
  const styles = createApplicationStyleSheets({ownerDocument: nativeOwner} as HTMLCanvasElement, document,
    error => errors.push(error), options => createBrowserLinkedAuthorStyleSheetHostWithSeams(options, {
      createMutationObserver() { return {observe() {}, disconnect() {}} },
    }))
  return {styles, document, body, head, links, errors}
}

function declare(body: Element, href: string) {
  const link = body.ownerDocument!.createElement("link")
  link.setAttribute("rel", "stylesheet")
  link.setAttribute("href", href)
  body.append(link)
  return link
}

test("declarative stylesheets: explicit siblings replace the default, updates reuse links, removal and unmount clean up", async () => {
  const {styles, body, head, links, errors} = fixture()
  const first = declare(body, "/dark.css")
  const second = declare(body, "/panel.css")
  await styles.whenReady()
  expect(errors.map(error => error.message)).toEqual([])
  expect(links.map(link => link.href)).toEqual(["/dark.css", "/panel.css"])
  const dark = links[0]!
  let loaded = 0
  first.addEventListener("load", () => { loaded++ })
  dark.dispatchEvent(new Event("load") as unknown as globalThis.Event)
  expect(loaded).toBe(1)
  first.setAttribute("href", "/light.css")
  await styles.whenReady()
  expect(links).toHaveLength(2)
  expect(dark.href).toBe("/light.css")
  body.insertBefore(second, first)
  await styles.whenReady()
  expect(head.children[0]).toBe(links[1] as unknown as Element)
  first.remove()
  await styles.whenReady()
  expect(dark.isConnected).toBe(false)
  dark.dispatchEvent(new Event("load") as unknown as globalThis.Event)
  expect(loaded).toBe(1)
  expect(errors).toEqual([])
  second.remove()
  await styles.whenReady()
  expect(links.at(-1)?.href).toBe("./theme.css")
  expect(head.children).toHaveLength(1)
  styles.dispose()
  expect(head.children).toHaveLength(0)
})

test("declarative stylesheets: pending native loads can be removed without hanging readiness", async () => {
  const document = createDocument()
  const body = document.createElement("body")
  document.append(body)
  const native = createDocument()
  const head = native.createElement("head")
  native.append(head)
  let cancelled = 0
  const canvas = {ownerDocument: {head, createElement: () => native.createElement("link")}} as unknown as HTMLCanvasElement
  const styles = createApplicationStyleSheets(canvas, document, () => {}, options => {
    let reject!: (error: Error) => void
    const ready = options.sources.some(source => source.link.href === "/pending.css") ? new Promise<void>((_resolve, fail) => { reject = fail }) : Promise.resolve()
    void ready.catch(() => {})
    return {...options, ready, disposed: false, refresh() {}, dispose() { cancelled++; reject?.(new Error("cancelled")) }}
  })
  const link = declare(body, "/pending.css")
  const waiting = styles.whenReady()
  link.remove()
  await waiting
  expect(cancelled).toBe(1)
  styles.dispose()
  expect(head.children).toHaveLength(0)
})

test("declarative stylesheets: a synchronous CSSOM failure rejects readiness instead of starting without styles", async () => {
  const document = createDocument()
  const body = document.createElement("body")
  document.append(body)
  const native = createDocument()
  const head = native.createElement("head")
  native.append(head)
  const canvas = {ownerDocument: {head, createElement: () => native.createElement("link")}} as unknown as HTMLCanvasElement
  const failure = new Error("CSSOM is not readable")
  const errors: Error[] = []
  const styles = createApplicationStyleSheets(canvas, document, error => errors.push(error), () => { throw failure })
  declare(body, "/unreadable.css")
  styles.refresh()
  await expect(styles.whenReady()).rejects.toBe(failure)
  expect(errors).toEqual([failure])
  styles.dispose()
  expect(head.children).toHaveLength(0)
})
