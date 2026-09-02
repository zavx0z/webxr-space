import {expect, test} from "bun:test"
import {
  AnimationClip,
  BoxGeometry,
  MeshBasicMaterial,
  Object3D,
  Raycaster,
  TrueTypeFont,
  Vector3,
} from "../src/index.ts"

const root = `${import.meta.dir}/..`

test("[ENG-001] Engine владеет объектами сцены и их преобразованиями", () => {
  const parent = new Object3D()
  const child = new Object3D()
  parent.position.set(10, 20, 30)
  child.position.set(1, 2, 3)
  parent.add(child)
  parent.updateWorldMatrix()

  expect(child.parent).toBe(parent)
  expect(child.matrixWorld.elements[12]).toBe(11)
  expect(child.matrixWorld.elements[13]).toBe(22)
  expect(child.matrixWorld.elements[14]).toBe(33)
})

test("[ENG-002] Engine владеет геометрией и независимыми от GPU описаниями материалов", () => {
  const geometry = new BoxGeometry({width: 2, height: 3, depth: 4})
  const material = new MeshBasicMaterial({color: 0x123456})

  expect(geometry.attributes.position?.count).toBeGreaterThan(0)
  expect(material.color.r).toBeCloseTo(0x12 / 255)
  expect(material.color.g).toBeCloseTo(0x34 / 255)
  expect(material.color.b).toBeCloseTo(0x56 / 255)
})

test("[ENG-003] Engine владеет математикой, raycast, анимацией и данными шрифтов", async () => {
  expect(new Vector3(1, 2, 3).length()).toBeCloseTo(Math.sqrt(14))
  expect(new Raycaster()).toBeInstanceOf(Raycaster)
  expect(new AnimationClip("empty", 0, [])).toBeInstanceOf(AnimationClip)
  expect(typeof TrueTypeFont.fromUrl).toBe("function")
  expect((await Bun.file(`${root}/static/fonts/inter-regular.ttf`).arrayBuffer()).byteLength)
    .toBeGreaterThan(0)
})

test("[ENG-004] Engine не владеет Canvas и не содержит конкретного WebGPU-кода", async () => {
  const files = await Array.fromAsync(new Bun.Glob("src/**/*.ts").scan({cwd: root}))
  const source = (await Promise.all(files.map(file => Bun.file(`${root}/${file}`).text()))).join("\n")

  expect(files.some(file => file.endsWith(".wgsl"))).toBe(false)
  expect(source).not.toMatch(/\bGPU(?:Device|Buffer|Texture|RenderPipeline|CanvasContext)\b/u)
  expect(source).not.toContain("navigator.gpu")
  expect(source).not.toContain("HTMLCanvasElement")
  expect(source).not.toContain("requestAnimationFrame")
})
