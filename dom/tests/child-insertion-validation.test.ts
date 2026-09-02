import {expect, test} from "bun:test"
import {Element, createDocument} from "../src/index.ts"
import type {Document, Node} from "../src/index.ts"

class MeshElement extends Element {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-mesh")
  }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    const removed = new Set(replacing)
    const moving = new Set(nodes.filter(node => node.parentNode === this))
    const retainedGeometryCount = this.childNodes.filter(node =>
      !removed.has(node) &&
      !moving.has(node) &&
      node instanceof Element &&
      node.localName === "xr-geometry"
    ).length
    const insertedGeometryCount = nodes.filter(node =>
      node instanceof Element && node.localName === "xr-geometry"
    ).length
    if (retainedGeometryCount + insertedGeometryCount > 1) {
      throw new TypeError("Mesh accepts at most one Geometry child")
    }
  }
}

test("a failed child preflight leaves the connected tree and mutations unchanged", () => {
  const document = createDocument()
  const mesh = new MeshElement(document)
  const first = new Element(document, "xr-geometry")
  const second = new Element(document, "xr-geometry")
  document.appendChild(mesh)
  mesh.appendChild(first)
  const batches: unknown[] = []
  document.subscribeMutations(batch => batches.push(batch))

  expect(() => mesh.appendChild(second)).toThrow(
    "Mesh accepts at most one Geometry child",
  )
  expect(mesh.childNodes).toEqual([first])
  expect(first.parentNode).toBe(mesh)
  expect(second.parentNode).toBeNull()
  expect(batches).toEqual([])
})

test("replacement preflight sees replaced children and accepts an exact swap", () => {
  const document = createDocument()
  const mesh = new MeshElement(document)
  const first = new Element(document, "xr-geometry")
  const second = new Element(document, "xr-geometry")
  mesh.appendChild(first)

  expect(mesh.replaceChild(second, first)).toBe(first)
  expect(mesh.childNodes).toEqual([second])
  expect(first.parentNode).toBeNull()
  expect(second.parentNode).toBe(mesh)
})

test("failed replaceChildren does not detach candidate nodes before validation", () => {
  const document = createDocument()
  const mesh = new MeshElement(document)
  const current = new Element(document, "xr-geometry")
  const staging = new Element(document, "staging")
  const firstCandidate = new Element(document, "xr-geometry")
  const secondCandidate = new Element(document, "xr-geometry")
  document.appendChild(mesh)
  mesh.appendChild(current)
  staging.append(firstCandidate, secondCandidate)
  const batches: unknown[] = []
  document.subscribeMutations(batch => batches.push(batch))

  expect(() => mesh.replaceChildren(firstCandidate, secondCandidate)).toThrow(
    "Mesh accepts at most one Geometry child",
  )
  expect(mesh.childNodes).toEqual([current])
  expect(staging.childNodes).toEqual([firstCandidate, secondCandidate])
  expect(firstCandidate.parentNode).toBe(staging)
  expect(secondCandidate.parentNode).toBe(staging)
  expect(batches).toEqual([])
})
