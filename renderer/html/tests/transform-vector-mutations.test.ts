import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer, type RenderFrame} from "../src/index.ts"
import {readCanonicalRenderFrameChanges} from "../src/frame-changes.ts"

function paths(frame: RenderFrame) {
  return frame.displayList.filter(item => item.kind === "path").map(item => ({
    id: item.node.getAttribute("id"), geometry: item.geometry,
    transform: item.presentationOwner === null || item.presentationOwner === undefined ? item.transform : frame.presentationTransforms?.get(item.presentationOwner),
  }))
}

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:500px;height:300px;position:relative")
  document.append(root)
  const layer = document.createElement("div")
  const move = (x: number) => layer.setAttribute("style", `position:relative;transform:translate(${x}px,0px);transform-origin:0 0`)
  move(0)
  root.append(layer)
  const lines = [0, 1].map(index => {
    const path = document.createElement("vector-path")
    path.setAttribute("id", String(index))
    path.setAttribute("style", "position:absolute;left:0;top:0;width:0;height:0;stroke:red;stroke-width:2px;fill:none")
    path.setAttribute("d", `M 10 ${20 + index * 40} L 110 ${20 + index * 40}`)
    if (index === 1) path.setAttribute("hidden", "")
    layer.append(path)
    return path
  })
  const options = {document, root, viewport: {width: 500, height: 300}, styleSheets: ["vector-path[hidden] {display:none}"]}
  const renderer = createDocumentRenderer(options)
  const compareFresh = (frame: RenderFrame) => {
    const fresh = createDocumentRenderer({...options, registerGeometry: false})
    try {
      expect(paths(frame)).toEqual(paths(fresh.flush()))
      expect([...frame.hits.keys()]).toEqual([...fresh.flush().hits.keys()])
    } finally { fresh.dispose() }
  }
  return {document, root, layer, lines, move, renderer, compareFresh}
}

for (const change of ["hidden", "d"] as const) {
  test.each([{order: "transform → path", transformFirst: true}, {order: "path → transform", transformFirst: false}])(
    `[RENDERER-TRANSFORM-VECTOR-MIXED] ${change}, $order: все изменения видны в том же кадре`,
    ({transformFirst}) => {
      const f = fixture()
      try {
        const initial = f.renderer.flush()
        const snapshot = paths(initial)
        expect(snapshot.map(path => path.id)).toEqual(["0"])
        const updatePath = () => {
          if (change === "hidden") {
            f.lines[0]!.setAttribute("hidden", "")
            f.lines[1]!.removeAttribute("hidden")
          } else f.lines[0]!.setAttribute("d", "M 30 40 L 150 90")
        }
        f.document.transaction(() => {
          if (transformFirst) {
            f.move(20)
            updatePath()
          } else {
            updatePath()
            f.move(20)
          }
        })
        const updated = f.renderer.flush()
        f.compareFresh(updated)
        expect(paths(updated).map(path => path.id)).toEqual([change === "hidden" ? "1" : "0"])
        if (change === "d") expect(paths(updated)[0]!.geometry.bounds).toMatchObject({x: 30, y: 40, width: 120, height: 50})
        expect(paths(initial)).toEqual(snapshot)
        expect(f.root.firstElementChild).toBe(f.layer)
        expect([...f.layer.children]).toEqual(f.lines)
      } finally { f.renderer.dispose() }
    },
  )
}

test("[RENDERER-TRANSFORM-VECTOR-FAST] отдельные transform и d сохраняют canonical incremental frame", () => {
  const f = fixture()
  try {
    const initial = f.renderer.flush()
    f.move(-20)
    const moved = f.renderer.flush()
    expect(readCanonicalRenderFrameChanges(moved)?.previous).toBe(initial)
    f.compareFresh(moved)
    f.lines[0]!.setAttribute("d", "M 30 40 L 150 90")
    const changed = f.renderer.flush()
    expect(readCanonicalRenderFrameChanges(changed)?.previous).toBe(moved)
    f.compareFresh(changed)
  } finally { f.renderer.dispose() }
})
