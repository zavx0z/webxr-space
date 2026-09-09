import {createDocumentInteractionState} from "../../renderer/src/pseudo-state.ts"
import {expect, test} from "bun:test"
import {createDocument, acquireDocumentAuthorStyleSheetOwner} from "../src/index.ts"
import {DisplayElement} from "./index.ts"
import {readDisplayStyle} from "../../renderer/src/display-style.ts"
import {createDocumentRenderer} from "../../renderer/src/renderer.ts"

function fixture(css: string, width = 320, height = 180) {
  const document = createDocument()
  const display = document.createElement("display")
  display.width = width
  display.height = height
  document.append(display)
  const styles = acquireDocumentAuthorStyleSheetOwner(document)
  styles.replace([{id: "test", cssText: `display {${css}}`}])
  return {document, display, styles}
}

test("Атрибуты задают миллиметры, CSS-каскад — разрешение и ориентацию дисплея", () => {
  const {document, display} = fixture(`
    width: 2560px;
    height: 1440px;
    translate: 0 0 900mm;
    rotate: x 90deg;
  `)
  expect(display, "Тег display должен создавать базовый DisplayElement").toBeInstanceOf(DisplayElement)
  const style = readDisplayStyle(document, display)
  expect(style.pixels, "CSS задаёт матрицу 2560 × 1440 напрямую").toEqual({width: 2560, height: 1440})
  expect(style.viewport, "Область раскладки должна совпадать с разрешением").toEqual(style.pixels)
  expect(style.dpi, "Плотность вычисляется из матрицы и физических размеров").toEqual({x: 203.2, y: 203.2})
  expect(style.viewport.width * style.worldUnitsPerPixel, "Физическая ширина поверхности должна составлять 320 мм").toBeCloseTo(320)
  expect(style.viewport.height * style.worldUnitsPerPixelY, "Физическая высота поверхности должна составлять 180 мм").toBeCloseTo(180)
  expect(style.transform.position.z, "CSS translate должен размещать дисплей на высоте 900 мм").toBeCloseTo(900)
  expect(style.transform.quaternion.x, "CSS rotate должен поворачивать поверхность на 90 градусов вокруг оси X").toBeCloseTo(Math.SQRT1_2)
})

test("Разрешение меняет плотность и область раскладки, сохраняя физические габариты", () => {
  const {document, display} = fixture(`
    width: 100px;
    height: 50px;
    display: flex;
  `, 254, 127)
  const child = document.createElement("div")
  child.setAttribute("style", `
    width: 25.4mm;
    height: 1in;
    flex-shrink: 0;
  `)
  display.append(child)
  const before = readDisplayStyle(document, display)
  expect(before.dpi, "Матрица 100 × 50 на поверхности 254 × 127 мм даёт 10 dpi по обеим осям").toEqual({x: 10, y: 10})
  const renderer = createDocumentRenderer({document, root: display, viewport: before.viewport})
  const box = renderer.flush().boxByNode.get(child)!
  expect(box.width, "Дочерние CSS-длины 25.4 мм сохраняют стандартный перевод в 96 px").toBeCloseTo(96)
  expect(box.height, "Дочерние CSS-длины 1in сохраняют стандартный перевод в 96 px").toBeCloseTo(96)
  display.setAttribute("style", `
    width: 1920px;
    height: 960px;
  `)
  const after = readDisplayStyle(document, display)
  expect(after.dpi, "Большая матрица на прежней поверхности даёт 192 dpi по обеим осям").toEqual({x: 192, y: 192})
  expect(after.viewport, "Новая матрица задаёт новую область раскладки").toEqual({width: 1920, height: 960})
  expect(after.viewport.width * after.worldUnitsPerPixel, "Увеличение разрешения сохраняет ширину 254 мм").toBeCloseTo(254)
  expect(after.viewport.height * after.worldUnitsPerPixelY, "Увеличение разрешения сохраняет высоту 127 мм").toBeCloseTo(127)
  renderer.resize(after.viewport)
  expect(renderer.flush().boxByNode.get(child)!.width, "Изменение разрешения не меняет CSS-ширину дочернего элемента").toBeCloseTo(box.width)
  renderer.dispose()
})

test("Физические размеры меняют вычисленную плотность без изменения разрешения", () => {
  const {document, display} = fixture(`
    width: 1920px;
    height: 1080px;
  `, 508, 285.75)
  const before = readDisplayStyle(document, display)
  expect(before.dpi, "Исходные размеры дают 96 dpi по каждой оси").toEqual({x: 96, y: 96})
  display.width = 254
  display.height = 142.875
  const after = readDisplayStyle(document, display)
  expect(after.viewport, "Изменение миллиметров не меняет область раскладки").toEqual(before.viewport)
  expect(after.pixels, "Изменение миллиметров не меняет матрицу").toEqual(before.pixels)
  expect(after.dpi, "Вдвое меньшая поверхность с той же матрицей даёт вдвое большую плотность").toEqual({x: 192, y: 192})
})

test("Разные пропорции поверхности и матрицы дают независимый физический размер пикселя по осям", () => {
  const {document, display} = fixture(`
    width: 1000px;
    height: 1000px;
  `, 254, 127)
  const style = readDisplayStyle(document, display)
  expect(style.dpi, "Прямоугольные пиксели дают плотности 100 и 200 dpi").toEqual({x: 100, y: 200})
  expect(style.worldUnitsPerPixel, "Шаг пикселя по X должен составлять 0.254 мм").toBeCloseTo(0.254)
  expect(style.worldUnitsPerPixelY, "Шаг пикселя по Y должен составлять 0.127 мм").toBeCloseTo(0.127)
  expect(style.viewport, "Разные пропорции не должны принудительно менять заданную квадратную матрицу").toEqual({width: 1000, height: 1000})
})

test("Переменные темы, calc и локальные стили участвуют в одном каскаде разрешения", () => {
  const {document, display} = fixture(`
    --surface-width: 2560px;
    width: var(--surface-width);
    height: calc(1000px + 440px);
    scale: 2 3 1;
  `)
  const style = readDisplayStyle(document, display)
  expect(style.pixels, "Переменные и calc должны определять разрешение через общий CSS-каскад").toEqual({width: 2560, height: 1440})
  expect(style.transform.scale, "CSS scale должен независимо задавать масштаб каждой оси").toEqual({x: 2, y: 3, z: 1})
  display.setAttribute("style", "translate: 10mm 20mm 30mm")
  const updated = readDisplayStyle(document, display)
  expect(updated.dpi, "Пространственное положение не должно менять вычисленную плотность").toEqual(style.dpi)
  expect(updated.transform.position.x, "Локальный translate должен сместить дисплей на 10 мм по X").toBeCloseTo(10)
  expect(updated.transform.position.y, "Локальный translate должен сместить дисплей на 20 мм по Y").toBeCloseTo(20)
  expect(updated.transform.position.z, "Локальный translate должен сместить дисплей на 30 мм по Z").toBeCloseTo(30)
})

test("Проценты положения и опорная точка зависят от миллиметров, а не от разрешения", () => {
  const {document, display} = fixture(`
    width: 1000px;
    height: 1000px;
    translate: 50% 25% 96px;
    scale: 2;
    transform-origin: top left;
  `, 100, 50)
  const first = readDisplayStyle(document, display)
  expect(first.transform.position.x, "50% ширины и сохранение левого края при scale 2 дают 100 мм по X").toBeCloseTo(100)
  expect(first.transform.position.y, "25% высоты и сохранение верхнего края при scale 2 дают −12.5 мм по Y").toBeCloseTo(-12.5)
  expect(first.transform.position.z, "96px в пространственном translate остаются 25.4 мм при любом разрешении").toBeCloseTo(25.4)
  display.setAttribute("style", `
    width: 100px;
    height: 50px;
    transform-origin: left top;
  `)
  expect(readDisplayStyle(document, display).transform, "Перестановка ключевых слов и изменение разрешения сохраняют физическую опорную точку").toEqual(first.transform)
})

test("Центральная опорная точка сохраняет физический центр при разных плотностях по осям", () => {
  const {document, display} = fixture(`
    width: 2000px;
    height: 100px;
    translate: 10mm 20mm 30mm;
    rotate: x 90deg;
    scale: 2 3 1;
  `, 200, 100)
  const position = readDisplayStyle(document, display).transform.position
  expect(position.x, "Центральное вращение не должно сдвигать X").toBeCloseTo(10)
  expect(position.y, "Центральное вращение не должно сдвигать Y").toBeCloseTo(20)
  expect(position.z, "Центральное вращение не должно сдвигать Z").toBeCloseTo(30)
})

test("Недостающие физические размеры и дробное, нулевое или относительное разрешение отклоняются", () => {
  for (const name of ["width", "height"]) {
    const {document, display} = fixture("width: 100px; height: 50px")
    display.removeAttribute(name)
    expect(() => readDisplayStyle(document, display), `Отсутствующий физический атрибут ${name} не должен подменяться CSS-размером`).toThrow()
  }
  for (const width of ["0px", "-1px", "1.5px", "50%", "auto", "9007199254740992px"]) {
    const {document, display} = fixture(`width: ${width}; height: 50px`)
    expect(() => readDisplayStyle(document, display), `Недопустимое разрешение ${width} не должно округляться или подменяться`).toThrow()
  }
  const {document, display} = fixture("width: 100px")
  expect(() => readDisplayStyle(document, display), "Без высоты CSS нельзя определить матрицу").toThrow()
})

test("Неподдерживаемые способы задания пространственной поверхности отклоняются явно", () => {
  const {document, display} = fixture("width: 100px; height: 50px")
  display.setAttribute("style", "box-sizing: content-box")
  expect(() => readDisplayStyle(document, display), "Режим content-box не должен менять заданную матрицу за счёт рамки").toThrow("border-box")
  display.setAttribute("style", "transform: translateX(10px)")
  expect(() => readDisplayStyle(document, display), "Неподдерживаемый составной transform должен явно отклоняться").toThrow("individual translate")
})

test("Пространственный стиль дисплея учитывает общее состояние наведения", () => {
  const {document, display, styles} = fixture("width: 960px; height: 480px", 254, 127)
  styles.replace([{id: "test", cssText: `
    display {
      width: 960px;
      height: 480px;
    }

    display:hover {
      translate: 10mm 0 0;
    }
  `}])
  const interaction = createDocumentInteractionState(document)
  expect(readDisplayStyle(document, display, interaction).dpi, "До наведения вычисленная плотность должна быть равна 96 по обеим осям").toEqual({x: 96, y: 96})
  interaction.setHoveredElement(display)
  const style = readDisplayStyle(document, display, interaction)
  expect(style.dpi, "Наведение не должно менять плотность пикселей").toEqual({x: 96, y: 96})
  expect(style.transform.position.x, "Стиль наведения должен смещать дисплей на 10 мм по X").toBeCloseTo(10)
})

test("Устаревшие dpi и CSS resolution не переопределяют физические атрибуты и CSS-разрешение", () => {
  const {document, display} = fixture(`
    width: 1920px;
    height: 960px;
    resolution: 10dpi;
  `, 254, 127)
  display.setAttribute("dpi", "10")
  const style = readDisplayStyle(document, display)
  expect(style.pixels, "CSS width и height остаются единственным источником разрешения").toEqual({width: 1920, height: 960})
  expect(style.dpi, "Плотность вычисляется из физических размеров и матрицы, а не из старого атрибута").toEqual({x: 192, y: 192})
})
