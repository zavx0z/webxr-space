import {expect, test} from "bun:test"
import {Object3D, Ray, Vector3} from "@zavx0z/engine"
import {RendererWebGpuDocumentPlane} from "../src/document-plane.ts"
import {RendererWebGpuDisplayPlane} from "../src/display-plane.ts"

class CountedObject extends Object3D {
  updates = 0

  override updateMatrix(): void {
    this.updates += 1
    super.updateMatrix()
  }
}

const fixture = () => {
  const root = new CountedObject()
  const parent = new CountedObject()
  const sibling = new CountedObject()
  const content = new CountedObject()
  const plane = new RendererWebGpuDocumentPlane({
    content,
    viewport: {width: 100, height: 80},
    worldUnitsPerPixel: 2,
  })
  root.add(parent)
  root.add(sibling)
  parent.add(plane)
  content.updates = 0
  return {root, parent, sibling, content, plane}
}

test("projection conversions synchronize live ancestry without visiting unrelated content", () => {
  const f = fixture()
  f.root.position.set(3, -4, 5)
  f.parent.position.set(10, 20, 30)
  f.parent.rotation.z = Math.PI / 2
  f.parent.scale.set(2, 3, 4)
  f.plane.position.set(7, 8, 9)
  const local = {x: 20, y: 30}
  const world = f.plane.documentPointToWorld(local)
  expect([f.root.updates, f.parent.updates, f.content.updates, f.sibling.updates]).toEqual([1, 1, 0, 0])
  const roundtrip = f.plane.worldPointToDocument(world)
  expect(roundtrip.x).toBeCloseTo(local.x, 5)
  expect(roundtrip.y).toBeCloseTo(local.y, 5)
  expect([f.root.updates, f.parent.updates, f.content.updates, f.sibling.updates]).toEqual([2, 2, 0, 0])

  f.root.updateWorldMatrix(true)
  const expected = new Vector3(-60, 20, 0).applyMatrix4(f.plane.matrixWorld)
  expect(world.distanceTo(expected)).toBeCloseTo(0, 5)

  const other = new CountedObject()
  other.position.set(-100, 30, 40)
  other.add(f.plane)
  expect(f.plane.documentPointToWorld({x: 50, y: 40})).toEqual(new Vector3(-93, 38, 49))
  other.remove(f.plane)
  expect(f.plane.documentPointToWorld({x: 50, y: 40})).toEqual(new Vector3(7, 8, 9))
})

test("a ray intersection synchronizes ancestry once and retains nearest-boundary geometry", () => {
  const f = fixture()
  f.root.position.set(10, 20, 30)
  f.parent.scale.set(2, 3, 1)
  const hit = f.plane.intersectRay(new Ray(new Vector3(330, 320, 100), new Vector3(0, 0, -1)))!
  expect(hit).not.toBeNull()
  expect(hit.documentPoint.x).toBeCloseTo(130, 4)
  expect(hit.documentPoint.y).toBeCloseTo(-10, 4)
  expect(hit.inside).toBe(false)
  expect(hit.nearestDocumentPoint).toEqual({x: 100, y: 0})
  expect(hit.worldPoint.x).toBeCloseTo(330, 4)
  expect(hit.worldPoint.y).toBeCloseTo(320, 4)
  expect(hit.worldPoint.z).toBeCloseTo(30, 4)
  expect(hit.nearestWorldPoint).toEqual(new Vector3(210, 260, 30))
  expect(hit.distance).toBeCloseTo(70, 5)
  expect(hit.nearestDistance).toBeCloseTo(Math.hypot(120, 60))
  expect([f.root.updates, f.parent.updates, f.content.updates, f.sibling.updates]).toEqual([1, 1, 0, 0])
})

test("projection rays keep parallel, behind, empty and singular cases fail closed", () => {
  const f = fixture()
  expect(f.plane.intersectRay(new Ray(new Vector3(0, 0, 10), new Vector3(1, 0, 0)))).toBeNull()
  expect(f.plane.intersectRay(new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, 1)))).toBeNull()
  f.plane.resize({width: 0, height: 0})
  const hit = f.plane.intersectRay(new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1)))!
  expect(hit.inside).toBe(false)
  f.parent.scale.x = 0
  expect(() => f.plane.worldPointToDocument(new Vector3())).toThrow()
  expect(() => f.plane.intersectRay(new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1)))).toThrow()
  expect([f.content.updates, f.sibling.updates]).toEqual([1, 0])
})

test("прямоугольные пиксели сохраняют физические координаты, обратную проекцию и лучевой ввод", () => {
  const content = new Object3D()
  const plane = new RendererWebGpuDisplayPlane({
    content,
    viewport: {width: 1200, height: 800},
    worldUnitsPerPixel: 0.5,
    worldUnitsPerPixelY: 0.25,
    rasterSize: {width: 1200, height: 800},
  })
  plane.position.set(30, -120, 900)
  plane.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)
  const point = {x: 100, y: 120}
  const world = plane.documentPointToWorld(point)
  expect(world.distanceTo(new Vector3(-220, -120, 970))).toBeCloseTo(0, 5)
  const back = plane.worldPointToDocument(world)
  expect(back.x).toBeCloseTo(point.x, 5)
  expect(back.y).toBeCloseTo(point.y, 5)
  expect(content.position).toEqual(new Vector3(-300, 100, 0))
  expect(content.scale).toEqual(new Vector3(0.5, 0.25, 0.5))
  expect(plane.scale).toEqual(new Vector3(1, 1, 1))

  const inside = plane.intersectRay(new Ray(new Vector3(-220, -200, 970), new Vector3(0, 1, 0)))!
  expect(inside.inside).toBe(true)
  expect(inside.documentPoint.x).toBeCloseTo(100, 5)
  expect(inside.documentPoint.y).toBeCloseTo(120, 5)
  expect(inside.distance).toBeCloseTo(80, 5)

  const outside = plane.intersectRay(new Ray(new Vector3(380, -200, 1025), new Vector3(0, 1, 0)))!
  expect(outside.inside).toBe(false)
  expect(outside.documentPoint.x).toBeCloseTo(1300, 5)
  expect(outside.documentPoint.y).toBeCloseTo(-100, 5)
  expect(outside.nearestDocumentPoint).toEqual({x: 1200, y: 0})
  expect(outside.nearestWorldPoint.distanceTo(new Vector3(330, -120, 1000))).toBeCloseTo(0, 5)
  expect(outside.nearestDistance).toBeCloseTo(Math.hypot(50, 25), 5)

  const corner = plane.documentPointToWorld({x: 0, y: 0}).applyMatrix4(plane.rasterProjection())
  expect(corner.x).toBeCloseTo(-1, 5)
  expect(corner.y).toBeCloseTo(1, 5)
  expect(plane.surface.scale).toEqual(new Vector3(600, 200, 1))
  plane.resize({width: 600, height: 400})
  expect(plane.worldUnitsPerPixel).toBe(0.5)
  expect(plane.worldUnitsPerPixelY).toBe(0.25)
  expect(plane.surface.scale).toEqual(new Vector3(300, 100, 1))
  expect(plane.scale).toEqual(new Vector3(1, 1, 1))
})
