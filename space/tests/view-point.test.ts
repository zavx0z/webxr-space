import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {XRViewPointElement} from "@zavx0z/space"

const pose = (camera: XRViewPointElement) => [
  camera.x, camera.y, camera.z,
  camera.targetX, camera.targetY, camera.targetZ,
  camera.fov, camera.near, camera.far,
]

function fixture() {
  const document = createDocument()
  const camera = new XRViewPointElement(document)
  document.append(camera)
  document.transaction(() => {
    camera.x = 300
    camera.y = -1200
    camera.z = 1500
    camera.targetX = 100
    camera.targetY = -50
    camera.targetZ = 800
    camera.fov = 0.75
    camera.near = 1
    camera.far = 5000
    camera.controls = true
  })
  return {document, camera}
}

test("dollyTo сохраняет направление и проекцию, меняя только один semantic обзор", () => {
  const {document, camera} = fixture()
  const target = {x: 0, y: 0, z: 900}
  const length = Math.hypot(camera.x, camera.y, camera.z - target.z)
  let mutations = 0
  const unsubscribe = document.subscribeMutations(() => { mutations++ })
  camera.dollyTo(600, target)
  expect(Math.hypot(camera.x, camera.y, camera.z - 900)).toBeCloseTo(600)
  expect(camera.x).toBeCloseTo(300 / length * 600)
  expect(camera.y).toBeCloseTo(-1200 / length * 600)
  expect(camera.z).toBeCloseTo(900 + 600 / length * 600)
  expect([camera.targetX, camera.targetY, camera.targetZ]).toEqual([0, 0, 900])
  expect([camera.fov, camera.near, camera.far]).toEqual([0.75, 1, 5000])
  expect(mutations).toBe(1)
  camera.dollyTo(1200)
  expect(Math.hypot(camera.x, camera.y, camera.z - 900)).toBeCloseTo(1200)
  expect(document.documentElement).toBe(camera)
  unsubscribe()
})

test("saveState/reset сохраняют все параметры обзора и не меняют разрешение жестов", () => {
  const {document, camera} = fixture()
  expect(camera.reset()).toBe(false)
  const original = pose(camera)
  camera.saveState()
  camera.dollyTo(600)
  camera.fov = 1
  camera.near = 2
  camera.far = 2000
  camera.controls = false
  let mutations = 0
  document.subscribeMutations(() => { mutations++ })
  expect(camera.reset()).toBe(true)
  expect(pose(camera)).toEqual(original)
  expect(camera.controls).toBe(false)
  expect(mutations).toBe(1)
  camera.x = -100
  const next = pose(camera)
  camera.saveState()
  camera.dollyTo(300)
  camera.reset()
  expect(pose(camera)).toEqual(next)
  const other = new XRViewPointElement(document)
  expect(other.reset()).toBe(false)
})

test("недопустимый dollyTo не меняет Element даже частично", () => {
  const {document, camera} = fixture()
  const original = pose(camera)
  const version = document.version
  for (const distance of [0, -1, NaN, Infinity]) {
    expect(() => camera.dollyTo(distance)).toThrow(RangeError)
  }
  expect(() => camera.dollyTo(600, {x: NaN, y: 0, z: 0})).toThrow(RangeError)
  expect(() => camera.dollyTo(600, {x: camera.x, y: camera.y, z: camera.z})).toThrow(RangeError)
  expect(pose(camera)).toEqual(original)
  expect(document.version).toBe(version)
})
