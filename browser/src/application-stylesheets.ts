import {Event, type Document, type Element, type Node} from "@zavx0z/dom"
import {
  createBrowserLinkedAuthorStyleSheetHost,
  type BrowserLinkedAuthorStyleSheetHost,
  type CreateBrowserLinkedAuthorStyleSheetHostOptions,
} from "./linked-author-style-sheet-host.ts"
import {defaultThemeUrl} from "./default-theme.ts"

type Entry = {element: Element | null; link: HTMLLinkElement; signature: string; dispose(): void}

/** One native link per declaration identity; the default is used only without explicit sources. */
export function createApplicationStyleSheets(
  canvas: HTMLCanvasElement,
  document: Document,
  onError: (error: Error) => void,
  createHost = createBrowserLinkedAuthorStyleSheetHost,
  borrowed: readonly {id: string; link: HTMLLinkElement}[] = [],
) {
  const entries = new Map<Element | null, Entry>()
  let host: BrowserLinkedAuthorStyleSheetHost | null = null
  let ready: Promise<void> = Promise.resolve()
  let previous: Entry[] = []
  let disposed = false
  let initialized = false

  const refresh = () => {
    if (disposed) return
    const elements = [...document.querySelectorAll("link")].filter(element =>
      (element.getAttribute("rel") ?? "").toLowerCase().split(/\s+/).includes("stylesheet"))
    const declarations: (Element | null)[] = borrowed.length > 0 || elements.length > 0 ? elements : [null]
    let changed = !initialized || previous.length !== declarations.length
    const next: Entry[] = []
    for (const [index, element] of declarations.entries()) {
      const attributes = element === null
        ? {href: defaultThemeUrl, media: "", type: "", crossorigin: null, disabled: false}
        : {
          href: element.getAttribute("href") ?? "",
          media: element.getAttribute("media") ?? "",
          type: element.getAttribute("type") ?? "",
          crossorigin: element.getAttribute("crossorigin"),
          disabled: element.hasAttribute("disabled"),
        }
      const signature = JSON.stringify(attributes)
      let entry = entries.get(element)
      if (!entry) {
        const link = canvas.ownerDocument.createElement("link")
        const load = () => { element?.dispatchEvent(new Event("load")) }
        const error = () => { element?.dispatchEvent(new Event("error")) }
        link.addEventListener("load", load)
        link.addEventListener("error", error)
        entry = {element, link, signature: "", dispose() {
          link.removeEventListener("load", load)
          link.removeEventListener("error", error)
          link.remove()
        }}
        entries.set(element, entry)
      }
      changed ||= previous[index] !== entry || entry.signature !== signature
      next.push(entry)
    }
    if (!changed) return
    host?.dispose()
    host = null
    for (const [element, entry] of entries) {
      if (!declarations.includes(element)) {
        entry.dispose()
        entries.delete(element)
      }
    }
    for (const entry of next) {
      const element = entry.element
      const href = element === null ? defaultThemeUrl : element.getAttribute("href") ?? ""
      if (element && href.trim() === "") throw new TypeError("A stylesheet link requires a non-empty href")
      const media = element?.getAttribute("media") ?? ""
      const type = element?.getAttribute("type") ?? ""
      const crossorigin = element?.getAttribute("crossorigin") ?? null
      const disabled = element?.hasAttribute("disabled") ?? false
      const signature = JSON.stringify({href, media, type, crossorigin, disabled})
      if (entry.signature !== signature) {
        entry.link.rel = "stylesheet"
        entry.link.media = media
        entry.link.type = type
        entry.link.disabled = disabled
        if (crossorigin === null) entry.link.removeAttribute("crossorigin")
        else entry.link.setAttribute("crossorigin", crossorigin)
        entry.link.href = href
        entry.signature = signature
      }
      // Reorder existing links without replacing their identity.
      canvas.ownerDocument.head.append(entry.link)
    }
    initialized = true
    previous = next
    const sources = [...borrowed, ...next.filter(entry => !entry.link.disabled).map((entry, index) => ({
      id: `application-stylesheet-${index}`,
      link: entry.link,
    }))]
    try {
      host = createHost({canvas, document, sources, onError} satisfies CreateBrowserLinkedAuthorStyleSheetHostOptions)
      ready = host.ready
    } catch (error) {
      ready = Promise.reject(error)
      throw error
    } finally { void ready.catch(() => {}) }
  }
  const containsLink = (node: Node): boolean => node.nodeType === 1 &&
    ((node as Element).localName === "link" || (node as Element).querySelector("link") !== null)
  const unsubscribe = document.subscribeMutations(batch => {
    if (!batch.records.some(record => record.type === "childList"
      ? record.addedNodes.some(containsLink) || record.removedNodes.some(containsLink)
      : record.type === "attributes" && record.target.nodeName.toLowerCase() === "link")) return
    try { refresh() } catch (error) { onError(error instanceof Error ? error : new Error(String(error))) }
  })
  return {
    refresh,
    async whenReady() {
      while (!disposed) {
        const pending = ready
        try { await pending } catch (error) {
          if (pending === ready) throw error
        }
        if (pending === ready) return
      }
      throw new Error("Application stylesheets were disposed")
    },
    dispose() {
      if (disposed) return
      disposed = true
      unsubscribe()
      host?.dispose()
      for (const entry of entries.values()) entry.dispose()
      entries.clear()
    },
  }
}
