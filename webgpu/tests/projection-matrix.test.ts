import {expect, test} from "bun:test"
import {Object3D, Ray, Vector3} from "@zavx0z/engine"
import {RendererWebGpuDocumentPlane} from "../src/document-plane.ts"

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
