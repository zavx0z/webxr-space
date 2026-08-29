import {describe, expect, test} from "bun:test"
import {Mesh} from "../core/mesh"
import {Object3D} from "../core/object-3d"
import {ViewPoint} from "../core/view-point"
import {PlaneGeometry} from "../geometries/plane-geometry"
import {MeshBasicMaterial} from "../materials/mesh-basic-material"
import {Space} from "../scenes/space"
import {Renderer} from "./index"
import {planRenderComposition, type RenderComposition} from "./render-composition"
import {collectSpaceObjects, type LightItem, type RenderItem} from "./utils/render-list"

describe("Renderer bounded composition", () => {
  test("plans base, bounded views and semantic overlays as non-overlapping ordered roots", () => {
    const base = new Space()
    const baseMesh = mesh()
    const bounded = new Space()
    const boundedMesh = mesh()
    const overlay = new Object3D()
    const overlayMesh = mesh()
    base.add(baseMesh)
    base.add(bounded)
    base.add(overlay)
    bounded.add(boundedMesh)
    overlay.add(overlayMesh)
    base.updateWorldMatrix(true)
    const plan = planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      overlays: overlay,
      boundedViews: [{
        space: bounded,
        viewPoint: viewPoint(),
        viewport: {x: 20, y: 30, width: 200, height: 100},
      }],
    }, {width: 640, height: 480})
    const baseItems: RenderItem[] = []
    const baseLights: LightItem[] = []
    collectSpaceObjects(base, baseItems, baseLights, undefined, plan.excludedBaseRoots)
    const boundedItems: RenderItem[] = []
    collectSpaceObjects(bounded, boundedItems, [], undefined)
    const overlayItems: RenderItem[] = []
    collectSpaceObjects(overlay, overlayItems, [], undefined)

    expect(plan.overlays).toEqual([overlay])
    expect(plan.boundedViews.map(({space}) => space)).toEqual([bounded])
    expect(plan.boundedViews[0]?.viewport).toEqual({x: 20, y: 30, width: 200, height: 100})
    expect(baseItems.map(({object}) => object)).toEqual([baseMesh])
    expect(boundedItems.map(({object}) => object)).toEqual([boundedMesh])
    expect(overlayItems.map(({object}) => object)).toEqual([overlayMesh])
  })

  test("rejects detached, duplicate, nested and out-of-bounds view owners", () => {
    const base = new Space()
    const first = new Space()
    const nested = new Space()
    const detached = new Space()
    const overlay = new Object3D()
    base.add(first)
    base.add(overlay)
    first.add(nested)
    const firstView = {
      space: first,
      viewPoint: viewPoint(),
      viewport: {x: 0, y: 0, width: 100, height: 100},
    }

    expect(() => planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      boundedViews: [{...firstView, space: detached}],
    }, {width: 200, height: 200})).toThrow("child or descendant")
    expect(() => planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      boundedViews: [firstView, firstView],
    }, {width: 200, height: 200})).toThrow("already registered")
    expect(() => planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      boundedViews: [firstView, {...firstView, space: nested}],
    }, {width: 200, height: 200})).toThrow("must not contain")
    expect(() => planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      boundedViews: [{...firstView, viewport: {x: 150, y: 0, width: 100, height: 100}}],
    }, {width: 200, height: 200})).toThrow("fit")
    expect(() => planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      overlays: [overlay, overlay],
    }, {width: 200, height: 200})).toThrow("already registered")
    expect(() => planRenderComposition({
      space: base,
      viewPoint: viewPoint(),
      overlays: first,
      boundedViews: [firstView],
    }, {width: 200, height: 200})).toThrow("overlap")
  })

  test("keeps render and renderFrame as composition delegates", () => {
    const renderer = new Renderer()
    const calls: RenderComposition[] = []
    renderer.renderComposition = (composition) => { calls.push(composition) }
    const space = new Space()
    const camera = viewPoint()
    const overlay = new Object3D()

    renderer.render(space, camera)
    renderer.renderFrame(space, overlay, camera)

    expect(calls).toEqual([
      {space, viewPoint: camera},
      {space, viewPoint: camera, overlays: overlay},
    ])
  })
})

function viewPoint(): ViewPoint {
  return new ViewPoint({
    controls: "host",
    viewport: {left: 0, top: 0, width: 640, height: 480},
  })
}

function mesh(): Mesh {
  return new Mesh(
    new PlaneGeometry({width: 10, height: 10}),
    new MeshBasicMaterial({color: 0xffffff}),
  )
}
