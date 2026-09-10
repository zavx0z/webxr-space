import {expect, test} from "bun:test"
import {mkdir, rm} from "node:fs/promises"
import {resolve} from "node:path"
import {PNG} from "pngjs"
import type {NativeGpuProbe} from "../fixtures/native-gpu.ts"

test("[HEADLESS-NATIVE-GPU] bun-webgpu рисует треугольник в текстуру и возвращает пиксели без браузера", async () => {
  const directory = resolve(import.meta.dir, "../results/bun-webgpu")
  const imagePath = resolve(directory, "triangle.png")
  await mkdir(directory, {recursive: true})
  await rm(imagePath, {force: true})
  const worker = Bun.spawn([process.execPath, resolve(import.meta.dir, "../fixtures/native-gpu.ts")], {
    cwd: resolve(import.meta.dir, "../../.."),
    stdout: "pipe",
    stderr: "pipe",
    timeout: 20000,
  })
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      worker.exited,
      new Response(worker.stdout).text(),
      new Response(worker.stderr).text(),
    ])
    expect(exitCode, `Нативный GPU-процесс должен завершиться успешно: ${stderr}`).toBe(0)
    const frame = JSON.parse(stdout) as Omit<NativeGpuProbe, "rgba"> & {rgba: number[]}
    const png = Buffer.from(frame.pngBase64, "base64")
    await Bun.write(imagePath, png)
    expect([frame.width, frame.height], "Размер текстуры должен быть 17 × 13").toEqual([17, 13])
    expect(frame.rgba.length, "RGBA должен содержать все пиксели без GPU-padding").toBe(17 * 13 * 4)
    const image = PNG.sync.read(png)
    expect([image.width, image.height], "Canvas.screenshot должен вернуть PNG исходного размера").toEqual([17, 13])
    expect([...image.data], "PNG Canvas должен сохранить все прочитанные GPU-пиксели").toEqual(frame.rgba)
    const pixel = (x: number, y: number) => frame.rgba.slice((y * frame.width + x) * 4, (y * frame.width + x) * 4 + 4)
    expect(pixel(8, 6), "Фрагментный шейдер должен закрасить центр красным").toEqual([255, 0, 0, 255])
    for (const [x, y] of [[0, 0], [16, 0], [0, 12], [16, 12]] as const) {
      expect(pixel(x, y), `Пиксель (${x}, ${y}) вне треугольника должен сохранить синий фон`).toEqual([0, 0, 255, 255])
    }
    expect(frame.adapter.description.length, "Результат должен содержать сведения о нативном адаптере").toBeGreaterThan(0)
  } finally {
    if (worker.exitCode === null) worker.kill()
    await worker.exited
  }
}, 25000)

test("[HEADLESS-NATIVE-DIAGNOSTICS] адаптер getCompilationInfo возвращает настоящую ошибку неверного WGSL", async () => {
  const worker = Bun.spawn([process.execPath, resolve(import.meta.dir, "../fixtures/native-gpu.ts"), "diagnostics"], {
    cwd: resolve(import.meta.dir, "../../.."),
    stdout: "pipe",
    stderr: "pipe",
    timeout: 20000,
  })
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      worker.exited,
      new Response(worker.stdout).text(),
      new Response(worker.stderr).text(),
    ])
    expect(exitCode, `Нативная проверка WGSL должна завершиться успешно: ${stderr}`).toBe(0)
    const result = JSON.parse(stdout) as {valid: GPUCompilationInfo, invalid: GPUCompilationInfo}
    expect(result.valid.messages, "Корректный шейдер не должен иметь ошибок").toEqual([])
    expect(result.invalid.messages.length, "Некорректный шейдер должен вернуть диагностику").toBeGreaterThan(0)
    expect(result.invalid.messages[0]!.type, "Ошибка Dawn должна сохранять тип error").toBe("error")
    expect(result.invalid.messages[0]!.message, "Диагностика должна содержать исходный неверный WGSL").toContain("this is deliberately invalid WGSL")
  } finally {
    if (worker.exitCode === null) worker.kill()
    await worker.exited
  }
}, 25000)
