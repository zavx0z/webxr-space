import {expect, test} from "bun:test"
import {
  BufferGeometry,
  Color,
  ColorPickerMaterial,
  HolographicMaterial,
  ImageMaterial,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RadialBackdropMaterial,
  RoundedRectMaterial,
  Skeleton,
  SkinnedMesh,
  ThinFilmMaterial,
} from "@zavx0z/engine"
import {Renderer} from "../src/renderer/index.ts"
import {BONE_MATRICES_SIZE, PER_OBJECT_UNIFORM_SIZE} from "../src/renderer/per-object-upload.ts"
import type {RenderItem} from "../src/renderer/utils/render-list.ts"

class CountedNormalMatrix extends Matrix4 {
  inversions = 0
  override invert(): this {
    this.inversions += 1
    return super.invert()
  }
}

function uniformWriter() {
  // Exercise the production CPU upload phase without a native GPU device.
  const renderer = new Renderer() as unknown as {
    perObjectDataCPU: Float32Array
    boneMatricesDataCPU: Float32Array
    meshNormalMatrix: CountedNormalMatrix
    updatePerObjectData(items: RenderItem[]): unknown
  }
  renderer.perObjectDataCPU = new Float32Array(PER_OBJECT_UNIFORM_SIZE / 4)
  renderer.boneMatricesDataCPU = new Float32Array(BONE_MATRICES_SIZE / 4)
  renderer.meshNormalMatrix = new CountedNormalMatrix()
  return renderer
}

const scalarMaterials = (): Material[] => [
  new MeshBasicMaterial(),
  new RoundedRectMaterial({width: 10, height: 20, radius: 3}),
  new ImageMaterial({src: "fixture.png"}),
  new ColorPickerMaterial({
    width: 10,
    height: 20,
    mode: "wheel",
    hue: 0,
    saturation: 1,
    value: 1,
    alpha: 1,
    checkerPrimary: new Color(0),
    checkerSecondary: new Color(0xffffff),
    checkerSize: 4,
  }),
  new RadialBackdropMaterial({
    width: 10,
    height: 20,
    base: 0,
    glowA: {color: 0xff0000, cx: 0, cy: 0, radius: 1},
    glowB: {color: 0x0000ff, cx: 1, cy: 1, radius: 1},
  }),
]

test("scalar unlit shaders upload current world transform without unused normal inversions", () => {
  const renderer = uniformWriter()
  for (const material of scalarMaterials()) {
    const mesh = new Mesh(new BufferGeometry(), material)
    mesh.position.set(12, -9, 3)
    mesh.scale.set(2, 3, 4)
    mesh.updateWorldMatrix()
    renderer.updatePerObjectData([{type: "static-mesh", object: mesh, worldMatrix: mesh.matrixWorld}])
    expect(renderer.perObjectDataCPU.slice(0, 16)).toEqual(new Float32Array(mesh.matrixWorld.elements))
    expect(renderer.perObjectDataCPU.slice(16, 32)).toEqual(new Float32Array(16))
  }
  expect(renderer.meshNormalMatrix.inversions).toBe(0)
})

test("lit and unknown scalar material paths retain inverse-transpose including subsequent material changes", () => {
  class UnknownMaterial extends Material {}
  const renderer = uniformWriter()
  const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial())
  mesh.scale.set(2, 3, 4)
  mesh.rotation.z = 0.37
  mesh.updateWorldMatrix()
  const expectedNormal = new Matrix4().copy(mesh.matrixWorld).invert().transpose().elements
  const item: RenderItem = {type: "static-mesh", object: mesh, worldMatrix: mesh.matrixWorld}
  const lit = [new MeshLambertMaterial(), new ThinFilmMaterial(), new HolographicMaterial(), new UnknownMaterial()]
  for (const material of lit) {
    mesh.material = material
    renderer.updatePerObjectData([item])
    expect(renderer.perObjectDataCPU.slice(16, 32)).toEqual(new Float32Array(expectedNormal))
  }
  expect(renderer.meshNormalMatrix.inversions).toBe(lit.length)
  mesh.material = new MeshBasicMaterial()
  renderer.updatePerObjectData([item])
  expect(renderer.meshNormalMatrix.inversions).toBe(lit.length)
  expect(renderer.perObjectDataCPU.slice(16, 32)).toEqual(new Float32Array(16))
})

test("skinned and instanced BasicMaterial meshes still upload the normal matrices their shaders use", () => {
  const renderer = uniformWriter()
  const geometry = new BufferGeometry()
  const material = new MeshBasicMaterial()
  const skinned = new SkinnedMesh(geometry, material, new Skeleton())
  const instanced = new InstancedMesh(geometry, material, 1)
  for (const [type, object] of [
    ["skinned-mesh", skinned],
    ["instanced-mesh", instanced],
  ] as const) {
    object.scale.set(2, 3, 4)
    object.updateWorldMatrix()
    renderer.updatePerObjectData([{type, object, worldMatrix: object.matrixWorld}])
    const expectedNormal = new Matrix4().copy(object.matrixWorld).invert().transpose().elements
    expect(renderer.perObjectDataCPU.slice(16, 32)).toEqual(new Float32Array(expectedNormal))
  }
  expect(renderer.meshNormalMatrix.inversions).toBe(2)
})
