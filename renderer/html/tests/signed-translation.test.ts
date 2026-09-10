import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer, hitTestProjection} from "../src/index.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:800px;height:600px")
  document.append(root)
  const element = document.createElement("div")
  const style = (transform: string, width = 120) => {
    element.setAttribute("style", `position:absolute;left:200px;top:180px;width:${width}px;height:80px;background:red;transform-origin:0 0;transform:${transform}`)
  }
  root.append(element)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 800, height: 600}})
  return {root, element, style, renderer}
}

test.each([
  {transform: "translate(-30px,-40px)", x: 170, y: 140, scale: 1},
  {transform: "translateX(-25%)", x: 170, y: 180, scale: 1},
  {transform: "translateY(-50%)", x: 200, y: 140, scale: 1},
  {transform: "translate(-25%,10%)", x: 170, y: 188, scale: 1},
  {transform: "translate(-20px,-10px) scale(2)", x: 180, y: 170, scale: 2},
  {transform: "scale(2) translate(-20px,-10px)", x: 160, y: 160, scale: 2},
])("[RENDERER-SIGNED-TRANSLATE] $transform: client geometry и hit сохраняют знак без изменения layout", ({transform, x, y, scale}) => {
  const f = fixture()
  try {
    f.style(transform)
    const frame = f.renderer.flush()
    const rect = f.element.getBoundingClientRect()
    expect(rect.x).toBeCloseTo(x)
    expect(rect.y).toBeCloseTo(y)
    expect(rect.width).toBe(120 * scale)
    expect(rect.height).toBe(80 * scale)
    expect(f.element.getLayoutRect()?.toJSON()).toMatchObject({x: 200, y: 180, width: 120, height: 80})
    expect(hitTestProjection(frame, x + rect.width / 2, y + rect.height / 2)?.node).toBe(f.element)
    expect(hitTestProjection(frame, x - 1, y - 1)?.node).not.toBe(f.element)
  } finally { f.renderer.dispose() }
})

test("[RENDERER-SIGNED-TRANSLATE-RESIZE] проценты пересчитываются от собственного бокса, а размеры остаются неотрицательными", () => {
  const f = fixture()
  try {
    f.style("translate(-25%,-50%)")
    expect(f.element.getBoundingClientRect().x).toBe(170)
    f.style("translate(-25%,-50%)", 240)
    const rect = f.element.getBoundingClientRect()
    expect(rect.x).toBe(140)
    expect(rect.y).toBe(140)
    expect(rect.width).toBe(240)
    f.element.setAttribute("style", "position:absolute;width:calc(10px - 30px);height:calc(20px - 40px);transform:translate(-5px,-7px)")
    expect(f.element.getLayoutRect()?.width).toBe(0)
    expect(f.element.getLayoutRect()?.height).toBe(0)
    expect(f.element.getBoundingClientRect().x).toBe(-5)
    expect(f.element.getBoundingClientRect().y).toBe(-7)
  } finally { f.renderer.dispose() }
})
