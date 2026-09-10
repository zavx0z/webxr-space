import {expect, test} from "bun:test"
import {createDocument, type Element} from "@zavx0z/dom"
import {createDocumentRenderer, hitTestProjection} from "../src/index.ts"
import {parseRenderPath, pointInPathFill} from "../vector/index.ts"

function style(node: Element, property: string, value: string) {
  node.setAttribute("style", `${node.getAttribute("style") ?? ""};${property}:${value}`)
}

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:160px;height:160px")
  document.append(root)
  const group = document.createElement("div")
  group.setAttribute("style", "position:absolute;width:100px;height:100px")
  root.append(group)
  const path = document.createElement("vector-path")
  path.d = "M 10 10 L 70 40 L 10 70"
  path.setAttribute("style", "position:absolute;width:0;height:0;stroke-width:0;fill:#ff0000")
  group.append(path)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 160, height: 160}})
  return {document, root, group, path, renderer}
}

test("[VECTOR-FILL-001] fill-only имеет paint и interior hit, но не захватывает пустую часть bounds", () => {
  const f = fixture()
  try {
    const frame = f.renderer.flush()
    expect(frame.displayList.filter(item => item.node === f.path)).toMatchObject([
      {kind: "path", fill: "#ff0000", fillRule: "nonzero", strokeWidth: 0},
    ])
    expect(hitTestProjection(frame, 20, 40)?.node).toBe(f.path)
    expect(hitTestProjection(frame, 65, 15)?.node).not.toBe(f.path)
    expect(frame.boxByNode.has(f.group)).toBe(true)
    f.path.setAttribute("style", "position:absolute;width:0;height:0;stroke:#00ff00;stroke-width:2;fill:none")
    const stroke = f.renderer.flush()
    expect(stroke.displayList.filter(item => item.node === f.path)).toMatchObject([{key: "path", strokeWidth: 2}])
    expect(hitTestProjection(stroke, 20, 40)?.node).not.toBe(f.path)
    expect(hitTestProjection(stroke, 40, 25)?.node).toBe(f.path)
  } finally { f.renderer.dispose() }
})

test("[VECTOR-FILL-002] cascade, currentColor, наследование и геометрия обновляют paint и hit", () => {
  const f = fixture()
  try {
    f.group.setAttribute("style", "fill:currentColor;color:#123456;fill-rule:evenodd")
    f.path.setAttribute("style", "position:absolute;width:0;height:0;stroke-width:0")
    const first = f.renderer.flush().displayList.find(item => item.node === f.path)!
    expect(first).toMatchObject({fill: "#123456", fillRule: "evenodd"})
    style(f.path, "color", "#abcdef")
    const second = f.renderer.flush().displayList.find(item => item.node === f.path)!
    expect(second).toMatchObject({fill: "#abcdef"})
    if (first.kind !== "path" || second.kind !== "path") throw new Error("Ожидался path")
    expect(second.geometry).toBe(first.geometry)
    style(f.group, "fill", "#00ff00")
    expect(f.renderer.flush().displayList.find(item => item.node === f.path)).toMatchObject({fill: "#00ff00"})
    f.path.d = "M 80 80 L 100 80 L 100 100 L 80 100"
    const changed = f.renderer.flush()
    expect(hitTestProjection(changed, 20, 40)?.node).not.toBe(f.path)
    expect(hitTestProjection(changed, 90, 90)?.node).toBe(f.path)
    style(f.path, "fill", "none")
    expect(f.renderer.flush().displayList.some(item => item.node === f.path)).toBe(false)
  } finally { f.renderer.dispose() }
})

test("[VECTOR-FILL-003] transform, clip, opacity, visibility используют общий pipeline", () => {
  const f = fixture()
  try {
    style(f.group, "transform", "translate(20px, 10px) scale(2)")
    style(f.group, "transform-origin", "0 0")
    style(f.group, "width", "30px")
    style(f.group, "overflow", "hidden")
    style(f.group, "opacity", "0.5")
    const frame = f.renderer.flush()
    const fill = frame.displayList.find(item => item.node === f.path)!
    expect(fill.opacity).toBe(0.5)
    expect(fill.clips.length).toBeGreaterThan(0)
    expect(hitTestProjection(frame, 60, 90)?.node).toBe(f.path)
    expect(hitTestProjection(frame, 110, 90)?.node).not.toBe(f.path)
    style(f.group, "visibility", "hidden")
    const hidden = f.renderer.flush()
    expect(hidden.displayList.some(item => item.node === f.path)).toBe(false)
    expect(hidden.hits.has(f.path)).toBe(false)
    expect(hidden.boxByNode.has(f.group)).toBe(true)
    style(f.path, "visibility", "visible")
    expect(f.renderer.flush().displayList.some(item => item.node === f.path)).toBe(true)
  } finally { f.renderer.dispose() }
})

test("[VECTOR-FILL-004] grammar и разные winding rules явно ограничены одним M/L/Q/C контуром", () => {
  for (const source of ["M 0 0 L 20 0 L 20 20 Z", "M 0 0 L 20 0 M 0 20 L 20 20", "M 0 0 A 1 1 0 0 0 20 20"]) {
    expect(parseRenderPath(source)).toBeNull()
  }
  const twice = parseRenderPath("M 0 0 L 20 0 L 20 20 L 0 20 L 0 0 L 20 0 L 20 20 L 0 20")!
  expect(pointInPathFill(twice, 10, 10, "nonzero")).toBe(true)
  expect(pointInPathFill(twice, 10, 10, "evenodd")).toBe(false)
})
