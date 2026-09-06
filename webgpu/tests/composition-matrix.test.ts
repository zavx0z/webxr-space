import {expect, test} from "bun:test"
import {BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Object3D, Skeleton, SkinnedMesh, Space, ViewPoint} from "@zavx0z/engine"
import {RendererWebGpuScreenOverlay} from "../src/screen-overlay.ts"
import {
  planRenderComposition,
  prepareCompositionWorldMatrices,
  prepareHiddenRenderDependencies,
} from "../src/renderer/render-composition.ts"
import {collectSpaceObjects, type RenderItem} from "../src/renderer/utils/render-list.ts"
import {encodePresentationClipChains, PRESENTATION_CLIP_RECORD_FLOATS} from "../src/renderer/presentation-clip-upload.ts"

class CountedObject extends Object3D {
  updates = 0
  override updateMatrix(): void {
    this.updates += 1
    super.updateMatrix()
  }
}

class CountedSpace extends Space {
  updates = 0
  override updateMatrix(): void {
    this.updates += 1
    super.updateMatrix()
  }
}

class CountedOverlay extends RendererWebGpuScreenOverlay {
  updates = 0
  override updateMatrix(): void {
    this.updates += 1
    super.updateMatrix()
  }
}

function fixture() {
  const space = new CountedSpace()
  const content = new CountedObject()
  const overlay = new CountedOverlay({content, viewport: {width: 100, height: 80}})
  const child = new CountedObject()
  content.add(child)
  const viewPoint = new ViewPoint({})
  const canvas = {width: 200, height: 160}
  return {space, content, overlay, child, viewPoint, canvas}
}

function expectCurrentWorldMatrix(object: Object3D): void {
  const local = new Matrix4().compose(object.position, object.quaternion, object.scale)
  const world = object.parent === null
    ? local
    : new Matrix4().multiplyMatrices(object.parent.matrixWorld, local)
  expect(Array.from(object.matrixWorld.elements)).toEqual(Array.from(world.elements))
}

test("one composition traversal updates attached overlay, world and bounded Space after camera fitting", () => {
  const {space, content, overlay, child, viewPoint, canvas} = fixture()
  const world = new CountedObject()
  const bounded = new CountedSpace()
  const boundedChild = new CountedObject()
  space.add(world)
  space.add(bounded)
  space.add(overlay)
  bounded.add(boundedChild)
  const planned = planRenderComposition({
    space,
    viewPoint,
    overlays: [overlay],
    boundedViews: [{space: bounded, viewPoint, viewport: {x: 0, y: 0, width: 100, height: 80}}],
  }, canvas)
  const nodes = [space, world, bounded, boundedChild, overlay, content, child]

  for (let frame = 0; frame < 2; frame += 1) {
    child.position.x = 20 + frame
    boundedChild.position.z = 3 + frame
    viewPoint.pan(2, 1)
    prepareCompositionWorldMatrices(planned)
    for (const node of nodes) {
      expect(node.updates).toBe(frame + 1)
      expectCurrentWorldMatrix(node)
    }
  }
})

test("detached overlay synchronizes changed ancestry and descendants without visiting unrelated siblings", () => {
  const {space, content, overlay, child, viewPoint, canvas} = fixture()
  const parent = new CountedObject()
  const sibling = new CountedObject()
  parent.add(overlay)
  parent.add(sibling)
  parent.position.set(30, 5, -2)
  child.position.set(2, 4, 6)
  const planned = planRenderComposition({space, viewPoint, overlays: [overlay]}, canvas)
  prepareCompositionWorldMatrices(planned)

  for (const node of [space, parent, overlay, content, child]) {
    expect(node.updates).toBe(1)
    expectCurrentWorldMatrix(node)
  }
  expect(sibling.updates).toBe(0)
})

test("an overlay ancestor of the base Space does not cause overlapping recursive traversals", () => {
  const {space, content, overlay, child, viewPoint, canvas} = fixture()
  content.add(space)
  const planned = planRenderComposition({space, viewPoint, overlays: [overlay]}, canvas)
  prepareCompositionWorldMatrices(planned)

  for (const node of [space, overlay, content, child]) {
    expect(node.updates).toBe(1)
    expectCurrentWorldMatrix(node)
  }
})

test("public overlay fitting still updates descendants by default and permits explicit deferred synchronization", () => {
  const {content, overlay, child, viewPoint} = fixture()
  child.position.x = 12
  overlay.updateForViewPoint(viewPoint)
  for (const node of [overlay, content, child]) {
    expect(node.updates).toBe(1)
    expectCurrentWorldMatrix(node)
  }
  const previous = Array.from(child.matrixWorld.elements)
  child.position.x = 33
  viewPoint.pan(2, 1)
  overlay.updateForViewPoint(viewPoint, {updateWorldMatrix: false})
  expect(child.updates).toBe(1)
  expect(Array.from(child.matrixWorld.elements)).toEqual(previous)
  overlay.updateWorldMatrix(true)
  expect(child.updates).toBe(2)
  expectCurrentWorldMatrix(child)
})

test("hidden or empty overlay content defers matrices and becomes current on the same nodes when visible again", () => {
  const {space, content, overlay, child, viewPoint, canvas} = fixture()
  space.add(overlay)
  const planned = planRenderComposition({space, viewPoint, overlays: [overlay]}, canvas)
  overlay.resize({width: 0, height: 0})
  child.position.x = 7
  prepareCompositionWorldMatrices(planned)
  expect(content.visible).toBe(false)
  expect(child.updates).toBe(0)
  overlay.resize({width: 100, height: 80})
  prepareCompositionWorldMatrices(planned)
  expect(content.visible).toBe(true)
  expect(content.children[0]).toBe(child)
  expect(child.updates).toBe(1)
  expectCurrentWorldMatrix(child)
})

test("hidden retained descendants are not updated or collected, and reveal samples current parent and child transforms", () => {
  const {space, content, overlay, viewPoint, canvas} = fixture()
  const hidden = new CountedObject()
  const descendant = new CountedObject()
  const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial())
  space.add(overlay)
  content.add(hidden)
  hidden.add(descendant)
  descendant.add(mesh)
  hidden.visible = false
  hidden.position.x = 12
  descendant.position.y = 20
  const planned = planRenderComposition({space, viewPoint, overlays: [overlay]}, canvas)
  prepareCompositionWorldMatrices(planned)
  const hiddenItems: RenderItem[] = []
  collectSpaceObjects(overlay, hiddenItems, [])
  expect(hidden.updates).toBe(0)
  expect(descendant.updates).toBe(0)
  expect(hiddenItems).toEqual([])
  hidden.visible = true
  hidden.position.x = 25
  descendant.position.y = 40
  viewPoint.pan(4, 2)
  prepareCompositionWorldMatrices(planned)
  const visibleItems: RenderItem[] = []
  collectSpaceObjects(overlay, visibleItems, [])
  expect(hidden.updates).toBe(1)
  expect(descendant.updates).toBe(1)
  expect(visibleItems.map(item => item.object)).toEqual([mesh])
  for (const object of [overlay, content, hidden, descendant, mesh]) expectCurrentWorldMatrix(object)
})

test("independently collected overlay beneath a hidden presentation ancestor still receives current matrices", () => {
  const {space, overlay, content, child, viewPoint, canvas} = fixture()
  const hiddenParent = new CountedObject()
  hiddenParent.visible = false
  hiddenParent.position.x = 30
  space.add(hiddenParent)
  hiddenParent.add(overlay)
  const planned = planRenderComposition({space, viewPoint, overlays: [overlay]}, canvas)
  prepareCompositionWorldMatrices(planned)
  for (const object of [hiddenParent, overlay, content, child]) {
    expect(object.updates).toBe(1)
    expectCurrentWorldMatrix(object)
  }
})

test("independently collected bounded Space beneath a hidden ancestor still receives current matrices", () => {
  const {space, viewPoint, canvas} = fixture()
  const hiddenParent = new CountedObject()
  const bounded = new CountedSpace()
  const child = new CountedObject()
  hiddenParent.visible = false
  hiddenParent.position.y = 45
  bounded.position.z = 8
  space.add(hiddenParent)
  hiddenParent.add(bounded)
  bounded.add(child)
  const planned = planRenderComposition({
    space,
    viewPoint,
    boundedViews: [{space: bounded, viewPoint, viewport: {x: 0, y: 0, width: 100, height: 80}}],
  }, canvas)
  prepareCompositionWorldMatrices(planned)
  for (const object of [hiddenParent, bounded, child]) {
    expect(object.updates).toBe(1)
    expectCurrentWorldMatrix(object)
  }
})

test("visible draws synchronize hidden attached clip spaces and bones but not unrelated hidden children or detached providers", () => {
  const {space, viewPoint, canvas} = fixture()
  const hiddenParent = new CountedObject()
  const clipSpace = new CountedObject()
  const bone = new CountedObject()
  const unrelated = new CountedObject()
  hiddenParent.visible = false
  hiddenParent.position.x = 12
  clipSpace.position.y = 5
  bone.position.z = 8
  bone.visible = false
  hiddenParent.add(clipSpace)
  hiddenParent.add(bone)
  hiddenParent.add(unrelated)
  space.add(hiddenParent)
  const manual = new CountedObject()
  manual.visible = false
  const manualMatrix = new Matrix4()
  manualMatrix.elements[12] = 77
  Object.defineProperty(manual, "matrixWorld", {get() { return manualMatrix }})
  const mesh = new SkinnedMesh(new BufferGeometry(), new MeshBasicMaterial(), new Skeleton([bone], [new Matrix4()]))
  const shape = (coordinateSpace: Object3D) => ({
    kind: "rounded-rect" as const,
    coordinateSpace,
    center: [0, 0] as const,
    halfSize: [5, 5] as const,
    radii: [0, 0, 0, 0] as const,
  })
  mesh.presentationClips = [shape(clipSpace), shape(manual)]
  space.add(mesh)
  const item: RenderItem = {type: "skinned-mesh", object: mesh, worldMatrix: mesh.matrixWorld}
  const planned = planRenderComposition({space, viewPoint}, canvas)
  prepareCompositionWorldMatrices(planned)
  expect(clipSpace.updates).toBe(0)
  expect(bone.updates).toBe(0)
  prepareHiddenRenderDependencies(planned, [item, item])
  expect(clipSpace.updates).toBe(1)
  expect(bone.updates).toBe(1)
  expect(unrelated.updates).toBe(0)
  expect(manual.updates).toBe(0)
  expect(manual.matrixWorld.elements[12]).toBe(77)
  expectCurrentWorldMatrix(clipSpace)
  expectCurrentWorldMatrix(bone)
  const clips = encodePresentationClipChains([mesh])
  expect(clips.data[12]).toBe(-12)
  expect(clips.data[PRESENTATION_CLIP_RECORD_FLOATS + 12]).toBe(-77)
})
