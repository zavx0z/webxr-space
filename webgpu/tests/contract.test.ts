import {expect, test} from "bun:test"
import {
  alignedGpuFrameBytesPerRow,
  unpackGpuFrameRgba,
} from "../src/renderer/frame-readback.ts"

const root = `${import.meta.dir}/..`
const workspace = `${root}/..`

test("[GPU-001] WebGPU владеет shaders, buffers и textures", async () => {
  const shaders = await Array.fromAsync(new Bun.Glob("src/**/*.wgsl").scan({cwd: root}))
  const source = await Bun.file(`${root}/src/renderer/index.ts`).text()
  const textureSource = await Bun.file(`${root}/src/texture-loader.ts`).text()

  expect(shaders.length).toBeGreaterThan(0)
  expect(source).toContain("GPUBuffer")
  expect(source).toContain("GPURenderPipeline")
  expect(textureSource).toContain("GPUTexture")
})

test("[GPU-002] WebGPU владеет загрузками данных на видеокарту и самой отрисовкой", () => {
  const bytesPerRow = alignedGpuFrameBytesPerRow(1)
  const bytes = new Uint8Array(bytesPerRow)
  bytes.set([10, 20, 30, 255])

  expect(unpackGpuFrameRgba({
    bytes,
    bytesPerRow,
    format: "bgra8unorm",
    width: 1,
    height: 1,
  })).toEqual(new Uint8ClampedArray([30, 20, 10, 255]))
})

test("[GPU-003] Весь конкретный WebGPU-код находится в WebGPU, а не в Engine", async () => {
  const files = await Array.fromAsync(new Bun.Glob("engine/src/**/*.ts").scan({cwd: workspace}))
  const source = (await Promise.all(
    files.map(file => Bun.file(`${workspace}/${file}`).text()),
  )).join("\n")
  expect(source).not.toMatch(/\bGPU(?:Device|Buffer|Texture|RenderPipeline|CanvasContext)\b/u)
  expect(source).not.toContain("navigator.gpu")
})
