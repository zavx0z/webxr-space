import {expect, test} from "bun:test"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {createPopoverIndex} from "../src/popover-index.ts"

test("projection-local popover index follows state, subtree insertion, move and removal in DOM order", () => {
  const document = createDocument()
  const root = document.createElement("main")
  const other = document.createElement("aside")
  document.append(root)
  root.append(other)
  const popup = () => {
    const node = document.createElement("section") as HTMLElement
    node.popover = "manual"
    node.textContent = "Details"
    return node
  }
  const first = popup()
  const second = popup()
  root.prepend(first)
  other.append(second)
  first.showPopover()
  const index = createPopoverIndex(root)
  const scoped = createPopoverIndex(other)
  const releaseMutations = document.subscribeMutations(batch => { index.mutations(batch); scoped.mutations(batch) })
  const releaseStates = document.subscribeStateChanges(batch => { index.states(batch); scoped.states(batch) })
  try {
    expect(index.read()).toEqual([first])
    expect(scoped.read()).toEqual([])
    second.showPopover()
    expect(index.read()).toEqual([first, second])
    expect(scoped.read()).toEqual([second])
    root.prepend(other)
    expect(index.read()).toEqual([second, first])
    other.append(first)
    expect(scoped.read()).toEqual([second, first])
    second.hidePopover()
    expect(index.read()).toEqual([first])
    first.remove()
    expect(index.read()).toEqual([])
    expect(scoped.read()).toEqual([])
    root.append(first)
    first.showPopover()
    expect(index.read()).toEqual([first])
    first.popover = null
    expect(index.read()).toEqual([])
  } finally {releaseMutations(); releaseStates(); index.clear(); scoped.clear()}
})

test("empty top-layer reads and streaming appends never revisit unrelated existing text subtrees", () => {
  const document = createDocument()
  const root = document.createElement("main")
  const history = document.createElement("article")
  root.append(history)
  document.append(root)
  for (let line = 0; line < 1000; line++) {
    const row = document.createElement("p")
    row.textContent = `row ${line}`
    history.append(row)
  }
  const index = createPopoverIndex(root)
  const release = document.subscribeMutations(batch => index.mutations(batch))
  Object.defineProperty(history, "firstChild", {configurable: true, get() { throw new Error("Existing history was rescanned") }})
  try {
    const empty = index.read()
    for (let frame = 0; frame < 10; frame++) expect(index.read()).toBe(empty)
    const row = document.createElement("p")
    row.textContent = "appended"
    history.append(row)
    expect(index.read()).toEqual([])
  } finally {delete (history as unknown as {firstChild?: unknown}).firstChild; release(); index.clear()}
})
