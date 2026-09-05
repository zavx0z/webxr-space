import {expect, test} from "bun:test"
import {GLTFLoader, Matrix4, Space, Vector3, ViewPoint} from "../src/index.ts"

test("[ENG-005] orbit сохраняет Z-up, горизонт и расстояние даже при многократном проходе к полюсам", () => {
  const camera = new ViewPoint({position: {x: 0, y: -1600, z: 900}, target: {x: 0, y: 0, z: 900}})
  for (let index = 0; index < 300; index++) {
    camera.orbit(37, index % 2 === 0 ? 10000 : -10000)
    const view = camera.viewMatrix.elements
    expect(view[8]).toBe(0)
    expect(view[9]).toBeGreaterThan(0)
    expect(camera.position.clone().sub(camera.getTarget()).length()).toBeCloseTo(1600, 6)
    expect([...view].every(Number.isFinite)).toBe(true)
  }
  expect("getUp" in camera).toBe(false)
  expect("alignUpToWorldZ" in camera).toBe(false)
})

test("Z-up lookAt задаёт конечный ортонормированный базис для вида строго сверху и снизу", () => {
  for (const z of [1000, -1000]) {
    const matrix = new Matrix4().makeLookAt(new Vector3(0, 0, z), new Vector3())
    const e = matrix.elements
    const right = new Vector3(e[0], e[4], e[8])
    const screenUp = new Vector3(e[1], e[5], e[9])
    const back = new Vector3(e[2], e[6], e[10])
    expect(right.length()).toBe(1)
    expect(screenUp.length()).toBe(1)
    expect(back.length()).toBe(1)
    expect(right.dot(screenUp)).toBe(0)
    expect(right.clone().cross(screenUp).dot(back)).toBe(1)
  }
})

test("glTF преобразуется внутри импортированного объекта: Y=1 м становится Z=1000 мм", async () => {
  const url = "data:application/json," + encodeURIComponent(JSON.stringify({
    asset: {version: "2.0"}, scene: 0, scenes: [{nodes: [0]}],
    nodes: [{name: "imported-point", translation: [0, 1, 0]}],
  }))
  const model = await new GLTFLoader().load(url)
  expect(model.scene).not.toBeInstanceOf(Space)
  model.scene.position.x = 250
  model.scene.updateWorldMatrix()
  const point = model.scene.getObjectByName("imported-point")!
  expect(point.matrixWorld.elements[12]).toBeCloseTo(250)
  expect(point.matrixWorld.elements[13]).toBeCloseTo(0)
  expect(point.matrixWorld.elements[14]).toBeCloseTo(1000)
})
