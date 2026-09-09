import {Matrix4, type ViewPoint} from "@zavx0z/engine"
import type {RendererWebGpuDisplayPlane} from "./display-plane.ts"

/**
Выбирает растровую матрицу только для различимых пикселей дисплея ниже 96 dpi.
Обычная и высокая плотность всегда сохраняют прямую отрисовку содержимого.

Матрицы камеры и поверхности должны быть обновлены вызывающим Renderer.
Размер пикселя оценивается по меньшему сингулярному числу проекции его осей
в центре и углах поверхности. Вход в растр требует 2.25 пикселя Canvas,
сохранение режима — 1.75; разница порогов предотвращает частые переключения.
Пересечение ближней плоскости, нечисловая проекция и отсутствие видимых
контрольных точек сохраняют прямую отрисовку.

@param viewport - Размер области этой камеры в физических пикселях Canvas;
DPR уже учтён. Неположительные и неконечные размеры дают `false`.

@param wasRaster - Режим предыдущего кадра этой поверхности.

@returns Нужно ли рисовать содержимое в его номинальную пиксельную матрицу.
Не изменяет матрицы, граф содержимого или ресурсы GPU.
*/
export function selectDisplayRaster(
  plane: RendererWebGpuDisplayPlane,
  viewPoint: ViewPoint,
  viewport: Readonly<{width: number; height: number}>,
  wasRaster: boolean,
): boolean {
  const width = plane.viewport.width * plane.worldUnitsPerPixel
  const height = plane.viewport.height * plane.worldUnitsPerPixelY
  const pixels = plane.rasterSize
  const baselineWidth = Math.max(1, Math.round(width * 96 / 25.4))
  const baselineHeight = Math.max(1, Math.round(height * 96 / 25.4))
  if (pixels.width >= baselineWidth && pixels.height >= baselineHeight) return false
  if (
    !Number.isFinite(width) || width <= 0
    || !Number.isFinite(height) || height <= 0
    || !Number.isFinite(viewport.width) || viewport.width <= 0
    || !Number.isFinite(viewport.height) || viewport.height <= 0
  ) return false

  const matrix = new Matrix4()
    .multiplyMatrices(viewPoint.projectionMatrix, viewPoint.viewMatrix)
    .multiply(plane.matrixWorld)
    .elements
  const stepX = width / pixels.width
  const stepY = height / pixels.height
  let footprint = 0

  for (let sample = 0; sample < 5; sample += 1) {
    const x = sample === 0 ? 0 : (sample % 2 === 0 ? width / 2 : -width / 2)
    const y = sample === 0 ? 0 : (sample <= 2 ? -height / 2 : height / 2)
    const clipX = matrix[0]! * x + matrix[4]! * y + matrix[12]!
    const clipY = matrix[1]! * x + matrix[5]! * y + matrix[13]!
    const clipZ = matrix[2]! * x + matrix[6]! * y + matrix[14]!
    const clipW = matrix[3]! * x + matrix[7]! * y + matrix[15]!
    if (
      !Number.isFinite(clipX) || !Number.isFinite(clipY)
      || !Number.isFinite(clipZ) || !Number.isFinite(clipW)
      || clipW <= 0 || clipZ < 0
    ) return false
    if (Math.abs(clipX) > clipW || Math.abs(clipY) > clipW || clipZ > clipW) continue

    const inverseW2 = 1 / (clipW * clipW)
    const axisXx = (matrix[0]! * clipW - clipX * matrix[3]!) * inverseW2 * stepX * viewport.width / 2
    const axisXy = (matrix[1]! * clipW - clipY * matrix[3]!) * inverseW2 * stepX * viewport.height / 2
    const axisYx = (matrix[4]! * clipW - clipX * matrix[7]!) * inverseW2 * stepY * viewport.width / 2
    const axisYy = (matrix[5]! * clipW - clipY * matrix[7]!) * inverseW2 * stepY * viewport.height / 2
    const xx = axisXx * axisXx + axisXy * axisXy
    const yy = axisYx * axisYx + axisYy * axisYy
    const xy = axisXx * axisYx + axisXy * axisYy
    const largest = Math.sqrt((xx + yy + Math.hypot(xx - yy, 2 * xy)) / 2)
    const smallest = largest === 0 ? 0 : Math.abs(axisXx * axisYy - axisXy * axisYx) / largest
    if (!Number.isFinite(smallest)) return false
    footprint = Math.max(footprint, smallest)
  }

  return footprint >= (wasRaster ? 1.75 : 2.25)
}
