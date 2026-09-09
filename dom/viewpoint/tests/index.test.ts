import {expect, test} from "bun:test"
import {createDocument} from "../../src/index.ts"
import {ViewPointElement} from "../index.ts"

const pose = (camera: ViewPointElement) => [
  camera.x, camera.y, camera.z,
  camera.targetX, camera.targetY, camera.targetZ,
  camera.fov, camera.near, camera.far,
]

function fixture() {
  const document = createDocument()
  const camera = new ViewPointElement(document)
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
  expect(Math.hypot(camera.x, camera.y, camera.z - 900), "Ожидаемое состояние камеры: Math.hypot(camera.x, camera.y, camera.z - 900)").toBeCloseTo(600)
  expect(camera.x, "Ожидаемое состояние камеры: camera.x").toBeCloseTo(300 / length * 600)
  expect(camera.y, "Ожидаемое состояние камеры: camera.y").toBeCloseTo(-1200 / length * 600)
  expect(camera.z, "Ожидаемое состояние камеры: camera.z").toBeCloseTo(900 + 600 / length * 600)
  expect([camera.targetX, camera.targetY, camera.targetZ], "Ожидаемое состояние камеры: [camera.targetX, camera.targetY, camera.targetZ]").toEqual([0, 0, 900])
  expect([camera.fov, camera.near, camera.far], "Ожидаемое состояние камеры: [camera.fov, camera.near, camera.far]").toEqual([0.75, 1, 5000])
  expect(mutations, "Ожидаемое состояние камеры: mutations").toBe(1)
  camera.dollyTo(1200)
  expect(Math.hypot(camera.x, camera.y, camera.z - 900), "Ожидаемое состояние камеры: Math.hypot(camera.x, camera.y, camera.z - 900)").toBeCloseTo(1200)
  expect(document.documentElement, "Ожидаемое состояние камеры: document.documentElement").toBe(camera)
  unsubscribe()
})

test("saveState/reset сохраняют все параметры обзора и не меняют разрешение жестов", () => {
  const {document, camera} = fixture()
  expect(camera.reset(), "Ожидаемое состояние камеры: camera.reset()").toBe(false)
  const original = pose(camera)
  camera.saveState()
  camera.dollyTo(600)
  camera.fov = 1
  camera.near = 2
  camera.far = 2000
  camera.controls = false
  let mutations = 0
  document.subscribeMutations(() => { mutations++ })
  expect(camera.reset(), "Ожидаемое состояние камеры: camera.reset()").toBe(true)
  expect(pose(camera), "Ожидаемое состояние камеры: pose(camera)").toEqual(original)
  expect(camera.controls, "Ожидаемое состояние камеры: camera.controls").toBe(false)
  expect(mutations, "Ожидаемое состояние камеры: mutations").toBe(1)
  camera.x = -100
  const next = pose(camera)
  camera.saveState()
  camera.dollyTo(300)
  camera.reset()
  expect(pose(camera), "Ожидаемое состояние камеры: pose(camera)").toEqual(next)
  const other = new ViewPointElement(document)
  expect(other.reset(), "Ожидаемое состояние камеры: other.reset()").toBe(false)
})

test("недопустимый dollyTo не меняет Element даже частично", () => {
  const {document, camera} = fixture()
  const original = pose(camera)
  const version = document.version
  for (const distance of [0, -1, NaN, Infinity]) {
    expect(() => camera.dollyTo(distance), "Ожидаемое состояние камеры: () => camera.dollyTo(distance)").toThrow(RangeError)
  }
  expect(() => camera.dollyTo(600, {x: NaN, y: 0, z: 0}), "Ожидаемое состояние камеры: () => camera.dollyTo(600, {x: NaN, y: 0, z: 0})").toThrow(RangeError)
  expect(() => camera.dollyTo(600, {x: camera.x, y: camera.y, z: camera.z}), "Ожидаемое состояние камеры: () => camera.dollyTo(600, {x: camera.x, y: camera.y, z: camera.z})").toThrow(RangeError)
  expect(pose(camera), "Ожидаемое состояние камеры: pose(camera)").toEqual(original)
  expect(document.version, "Ожидаемое состояние камеры: document.version").toBe(version)
})
