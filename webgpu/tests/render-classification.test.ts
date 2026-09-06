import {expect, test} from "bun:test"
import {
  BufferGeometry,
  GlassMaterial,
  LineGlowMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from "@zavx0z/engine"
import {classifyRenderItems, type RenderItem} from "../src/renderer/utils/render-list.ts"

function mesh(glass = false): RenderItem {
  const object = new Mesh(new BufferGeometry(), glass ? new GlassMaterial() : new MeshBasicMaterial())
  return {type: "static-mesh", object, worldMatrix: object.matrixWorld}
}

function line(mode: LineGlowMaterial["visibilityMode"]): RenderItem {
  const object = new LineSegments(new BufferGeometry(), new LineGlowMaterial({visibilityMode: mode}))
  return {type: "line", object, worldMatrix: object.matrixWorld}
}

test("one classification preserves stable pass order, duplicate draws and non-exclusive glass membership", () => {
  const regularA = mesh()
  const regularB = mesh()
  const silhouetteA = line("silhouette")
  const silhouetteB = line("silhouette")
  const overlayLine = line("overlay")
  const sceneLine = line("scene")
  const glass = mesh(true)
  const ui = mesh()
  const uiGlass = mesh(true)
  const uiOverlay = line("overlay")
  const uiRoot = new Object3D()
  uiRoot.renderLayer = "ui"
  for (const item of [ui, uiGlass, uiOverlay]) uiRoot.add(item.object)
  class GlassLineMaterial extends LineGlowMaterial {
    override readonly isGlassMaterial = true
  }
  const glassLineObject = new LineSegments(new BufferGeometry(), new GlassLineMaterial({visibilityMode: "overlay"}))
  const glassLine: RenderItem = {type: "line", object: glassLineObject, worldMatrix: glassLineObject.matrixWorld}
  const source = [
    regularA, overlayLine, silhouetteA, ui, glass, sceneLine, uiGlass,
    regularB, silhouetteB, uiOverlay, regularA, glassLine,
  ]
  const original = [...source]
  const result = classifyRenderItems(source)

  expect(result.regularObjects).toEqual([silhouetteA, silhouetteB, regularA, sceneLine, regularB, regularA])
  expect(result.uiObjects).toEqual([ui, uiGlass, uiOverlay])
  expect(result.glassObjects).toEqual([glass, uiGlass, glassLine])
  expect(result.overlayLines).toEqual([overlayLine, glassLine])
  expect(source).toEqual(original)
  expect(result.regularObjects[2]).toBe(regularA)
  expect(result.regularObjects[5]).toBe(regularA)
})

test("UI ancestry is read once within a frame but not retained across parent changes", () => {
  const parent = new Object3D()
  let layer: "world" | "ui" = "ui"
  let layerReads = 0
  Object.defineProperty(parent, "renderLayer", {
    get() {
      layerReads += 1
      return layer
    },
  })
  const items = Array.from({length: 1000}, () => {
    const item = mesh()
    // An explicit world marker does not override a UI ancestor in this contract.
    item.object.renderLayer = "world"
    parent.add(item.object)
    return item
  })
  expect(classifyRenderItems(items).uiObjects).toHaveLength(1000)
  expect(layerReads).toBe(1)
  layer = "world"
  expect(classifyRenderItems(items).regularObjects).toHaveLength(1000)
  expect(layerReads).toBe(2)
  const uiParent = new Object3D()
  uiParent.renderLayer = "ui"
  uiParent.add(items[0]!.object)
  const reparented = classifyRenderItems(items)
  expect(reparented.uiObjects).toEqual([items[0]!])
  expect(reparented.regularObjects).toHaveLength(999)
})

test("legacy display markers and very deep ancestry preserve classification without recursion", () => {
  const root = new Object3D()
  Object.defineProperty(root, "isUIDisplay", {value: true})
  let parent = root
  for (let depth = 0; depth < 10_000; depth += 1) {
    const child = new Object3D()
    parent.add(child)
    parent = child
  }
  const item = mesh()
  parent.add(item.object)
  const result = classifyRenderItems([item, item])
  expect(result.uiObjects).toEqual([item, item])
  expect(result.regularObjects).toEqual([])
})
