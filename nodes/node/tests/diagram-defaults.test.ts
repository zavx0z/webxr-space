import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {DiagramNodeProps} from "../diagram/contract/input.ts"
import "./compiler.ts"

const {DiagramNode} = await import("../diagram/index.tsx")
const theme = await Bun.file(resolve(import.meta.dir, "../../../ui/themes/theme.css")).text()

for (const shape of ["rectangle", "oval", "circle"] as const) {
  test(`[DIAGRAM-DEFAULTS] ${shape}: общий вид и естественные размеры без Mermaid`, () => {
    const document = createDocument()
    const owner = document.createElement("div")
    document.append(owner)
    const root = createRoot(owner)
    const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 800, height: 800}, styleSheets: [theme]})
    try {
      const props: DiagramNodeProps = {id: "node", description: "Пример", shape, intrinsic: true}
      root.render(DiagramNode as unknown as CompiledTemplate<DiagramNodeProps>, props)
      const node = owner.querySelector("article")!
      if (shape === "circle") {
        const rect = node.getLayoutRect()!
        root.render(DiagramNode as unknown as CompiledTemplate<DiagramNodeProps>, {...props, rect: {x: 0, y: 0, width: rect.width, height: rect.height}})
        expect(owner.querySelector("article")).toBe(node)
      }
      const rect = node.getLayoutRect()!
      const pane = node.querySelector("section")!
      const label = node.querySelector("span")!
      const frame = renderer.flush()
      const box = frame.boxByNode.get(pane)!
      expect(box.padding.top).toBe(11)
      expect(box.padding.left).toBe(shape === "circle" ? 31 : 15)
      expect(box.border.colors.top.match(/[\d.]+/g)!.map(Number)).toEqual([255, 255, 255, .156])
      if (shape === "rectangle") expect(box.border.radii.topLeft).toBe(10)
      const fill = frame.displayList.find(item => item.node === pane && item.kind === "rect")
      if (!fill || fill.kind !== "rect") throw new Error("Нет фона Pane")
      expect(fill.color.match(/[\d.]+/g)!.map(Number)).toEqual([54, 54, 54, .96])
      const text = frame.displayList.find(item => item.kind === "text" && item.text === "Пример")
      if (!text || text.kind !== "text") throw new Error("Нет текста")
      expect(text.fontSize).toBe(16)
      expect(text.lineHeight).toBe(20)
      expect(text.color).toBe("#ffffff")
      expect(rect.width - label.getLayoutRect()!.width).toBeCloseTo(shape === "circle" ? 64 : 32, 6)
      if (shape === "circle") expect(rect.width).toBeCloseTo(rect.height, 6)
      else expect(rect.height).toBe(44)
    } finally {
      root.unmount()
      renderer.dispose()
      owner.remove()
    }
  })
}
