import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "../src/index.ts"

test("resize preserves old snapshots, recalculates percentages and validates before mutation", () => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:100%;height:100%;overflow:auto")
  const child = document.createElement("div")
  child.setAttribute("style", "width:50%;height:300px")
  root.append(child)
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 200, height: 100}})
  try {
    const first = renderer.flush()
    renderer.resize({width: 80, height: 60})
    const second = renderer.flush()
    expect(second.revision).toBeGreaterThan(first.revision)
    expect(first.viewport).toEqual({width: 200, height: 100})
    expect(renderer.viewport).toEqual({width: 80, height: 60})
    expect(second.boxByNode.get(child)?.width).toBe(40)
    expect(second.scrolls.get(root)?.maxScrollTop).toBe(240)
    renderer.resize({width: 80, height: 60})
    expect(renderer.flush() === second).toBe(true)
    expect(() => renderer.resize({width: NaN, height: 60})).toThrow()
    expect(renderer.flush() === second).toBe(true)
  } finally {
    renderer.dispose()
  }
  expect(() => renderer.resize({width: 20, height: 20})).toThrow()
})
