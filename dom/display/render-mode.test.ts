import {expect, test} from "bun:test"
import {Object3D, ViewPoint} from "../../engine/src/index.ts"
import {RendererWebGpuDisplayPlane} from "../../webgpu/src/display-plane.ts"
import {selectDisplayRaster} from "../../webgpu/src/display-render-mode.ts"

const viewport = {width: 1024, height: 512}

function display(width = 200, height = 100, dpi = 12.7) {
  const plane = new RendererWebGpuDisplayPlane({
    content: new Object3D(),
    viewport: {width: width * 96 / 25.4, height: height * 96 / 25.4},
    worldUnitsPerPixel: 25.4 / 96,
    rasterSize: {
      width: Math.max(1, Math.round(width * dpi / 25.4)),
      height: Math.max(1, Math.round(height * dpi / 25.4)),
    },
  })
  plane.rotation.x = Math.PI / 2
  plane.updateWorldMatrix(true)
  return plane
}

function camera(distance = 256, near = 0.1) {
  return new ViewPoint({
    position: {x: 0, y: -distance, z: 0},
    target: {x: 0, y: 0, z: 0},
    fov: Math.PI / 2,
    viewport: {left: 0, top: 0, ...viewport},
    near,
    far: 10000,
  })
}

test("Плотность 96 dpi и выше сохраняет прямую отрисовку при приближении и увеличении поверхности", () => {
  for (const dpi of [96, 192, 384]) {
    const plane = display(200, 100, dpi)
    plane.scale.set(100, 100, 100)
    plane.updateWorldMatrix(true)
    for (const wasRaster of [false, true]) {
      expect(selectDisplayRaster(plane, camera(1), viewport, wasRaster), `Плотность ${dpi} dpi должна сохранять прямую отрисовку`).toBe(false)
    }
  }
})

test("Небольшая матрица высокой плотности и округлённый одиночный пиксель не требуют растра", () => {
  const phone = display(20, 25, 162.56)
  expect(phone.rasterSize, "Матрица маленького экрана должна составлять 128 × 160 пикселей").toEqual({width: 128, height: 160})
  expect(selectDisplayRaster(phone, camera(1), viewport, false), "Высокая плотность сохраняет прямую отрисовку даже небольшой матрицы").toBe(false)
  const tiny = display(0.01, 0.01, 96)
  expect(tiny.rasterSize, "Матрица поверхности меньше CSS-пикселя округляется до 1 × 1").toEqual({width: 1, height: 1})
  expect(selectDisplayRaster(tiny, camera(1), viewport, true), "Округление не должно включать растровую ветку").toBe(false)
})

test("Базовая плотность вычисляется из миллиметров даже при другом масштабе внутренних координат", () => {
  const plane = new RendererWebGpuDisplayPlane({
    content: new Object3D(),
    viewport: {width: 200, height: 100},
    worldUnitsPerPixel: 1,
    rasterSize: {width: 400, height: 200},
  })
  plane.rotation.x = Math.PI / 2
  plane.updateWorldMatrix(true)
  expect(selectDisplayRaster(plane, camera(32), viewport, false), "400 пикселей на 200 мм — ниже 96 dpi, хотя матрица больше внутреннего viewport").toBe(true)
})

test("Низкая плотность включает матрицу вблизи и возвращает прямую отрисовку вдали", () => {
  const plane = display()
  expect(selectDisplayRaster(plane, camera(128), viewport, false), "Пиксель размером четыре пикселя Canvas должен быть видимым элементом матрицы").toBe(true)
  expect(selectDisplayRaster(plane, camera(1024), viewport, true), "Пиксель меньше пикселя Canvas не должен требовать текстуры").toBe(false)
})

test("Пороги 2.25 и 1.75 физических пикселя предотвращают дрожание режима", () => {
  const plane = display()
  const viewPoint = camera()
  const select = (height: number, wasRaster: boolean) => selectDisplayRaster(plane, viewPoint, {width: height * 2, height}, wasRaster)
  expect(select(575, false), "Ниже порога входа поверхность остаётся прямой").toBe(false)
  expect(select(576, false), "На пороге 2.25 пикселя включается матрица").toBe(true)
  expect(select(512, false), "Внутри диапазона сохраняется прямой режим").toBe(false)
  expect(select(512, true), "Внутри диапазона сохраняется растровый режим").toBe(true)
  expect(select(448, true), "На пороге 1.75 пикселя матрица ещё сохраняется").toBe(true)
  expect(select(447, true), "Ниже порога удержания возвращается прямая отрисовка").toBe(false)
})

test("Удвоение backing store учитывает DPR ровно один раз без изменения дисплея и камеры", () => {
  const plane = display()
  const viewPoint = camera()
  expect(selectDisplayRaster(plane, viewPoint, viewport, false), "При DPR 1 размер пикселя равен двум и ниже порога входа").toBe(false)
  expect(selectDisplayRaster(plane, viewPoint, {width: 2048, height: 1024}, false), "При DPR 2 размер пикселя равен четырём и превышает порог").toBe(true)
  expect(plane.rasterSize, "Изменение backing store не меняет номинальную матрицу").toEqual({width: 100, height: 50})
})

test("При наклоне учитывается короткая ось пикселя, а не только большая сторона проекции", () => {
  const plane = display()
  const backing = {width: 1536, height: 768}
  expect(selectDisplayRaster(plane, camera(), backing, false), "Фронтальная поверхность с трёхпиксельной ячейкой должна быть растровой").toBe(true)
  plane.rotation.y = Math.PI * 0.46
  plane.updateWorldMatrix(true)
  expect(selectDisplayRaster(plane, camera(), backing, false), "Сжатая наклоном ячейка не должна ошибочно считаться крупной в двух направлениях").toBe(false)
})

test("Выход за экран и за камеру не требует матрицы", () => {
  const plane = display()
  const viewPoint = camera(128)
  plane.position.x = 2000
  plane.updateWorldMatrix(true)
  expect(selectDisplayRaster(plane, viewPoint, viewport, true), "Полностью внеэкранная поверхность не должна сохранять растр").toBe(false)
  plane.position.set(0, -600, 0)
  plane.updateWorldMatrix(true)
  expect(selectDisplayRaster(plane, viewPoint, viewport, true), "Поверхность за камерой не должна создавать текстуру").toBe(false)
  plane.position.set(0, 11000, 0)
  plane.updateWorldMatrix(true)
  expect(selectDisplayRaster(plane, viewPoint, viewport, true), "Поверхность за дальней плоскостью не должна создавать текстуру").toBe(false)
})

test("Пересечение ближней плоскости сохраняет прямую отрисовку вместо неограниченной матрицы", () => {
  const plane = display()
  const viewPoint = camera(80, 50)
  expect(selectDisplayRaster(plane, viewPoint, viewport, false), "Полностью видимая поверхность вблизи должна показывать матрицу").toBe(true)
  plane.rotation.y = Math.PI / 4
  plane.updateWorldMatrix(true)
  expect(selectDisplayRaster(plane, viewPoint, viewport, true), "Пересечение near-plane углами должно отключать растровый режим").toBe(false)
})

test("Неконечная проекция и недопустимая область камеры не включают растр", () => {
  const plane = display()
  const viewPoint = camera(128)
  for (const width of [0, -1, NaN, Infinity]) {
    expect(selectDisplayRaster(plane, viewPoint, {width, height: 512}, true), `Ширина ${width} не должна включать растровый проход`).toBe(false)
  }
  plane.matrixWorld.elements[12] = Infinity
  expect(selectDisplayRaster(plane, viewPoint, viewport, true), "Нечисловая проекция должна сохранять прямую отрисовку").toBe(false)
})
