import {expect, test} from "bun:test"
import {resizeCanvasBackingStore} from "../src/canvas-backing-store.ts"

const root = `${import.meta.dir}/..`
const workspace = `${root}/..`

test("[BRW-001] Browser владеет Canvas одного приложения и отслеживает изменение его размера", () => {
  const canvas = {width: 0, height: 0} as HTMLCanvasElement
  expect(resizeCanvasBackingStore(canvas, 320, 180, 2)).toBe(true)
  expect({width: canvas.width, height: canvas.height}).toEqual({width: 640, height: 360})
  expect(resizeCanvasBackingStore(canvas, 320, 180, 2)).toBe(false)
})

test("[BRW-002] Browser является единственным владельцем нативного ввода приложения", async () => {
  const index = await Bun.file(`${root}/src/index.ts`).text()
  const runtime = await Bun.file(`${root}/src/space-runtime.ts`).text()

  expect(index).not.toContain("createDocumentNativeInputHost")
  expect(index).not.toContain("createDocumentSpaceRuntime")
  expect(runtime).toContain("createNativeInputHost")
  expect(runtime).toContain("addEventListener(\"pointerdown\"")
})

test("[BRW-003] Browser является единственным владельцем RAF и общего цикла кадров приложения", async () => {
  const browserFiles = await Array.fromAsync(new Bun.Glob("src/**/*.ts").scan({cwd: root}))
  const browserSource = (await Promise.all(
    browserFiles.map(file => Bun.file(`${root}/${file}`).text()),
  )).join("\n")
  expect(browserSource).toContain("requestAnimationFrame")

  for (const owner of ["engine", "renderer", "webgpu"]) {
    const files = await Array.fromAsync(new Bun.Glob(`${owner}/src/**/*.ts`).scan({cwd: workspace}))
    const source = (await Promise.all(
      files.map(file => Bun.file(`${workspace}/${file}`).text()),
    )).join("\n")
    expect(source).not.toContain("requestAnimationFrame")
  }
})
