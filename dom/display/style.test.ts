import {createDocumentInteractionState} from "../../renderer/src/pseudo-state.ts"
import {expect, test} from "bun:test"
import {createDocument, acquireDocumentAuthorStyleSheetOwner} from "../src/index.ts"
import {DisplayElement} from "./index.ts"
import {readDisplayStyle} from "../../renderer/src/display-style.ts"
import {createDocumentRenderer} from "../../renderer/src/renderer.ts"

function fixture(css: string, dpi = 96) {
  const document = createDocument()
  const display = document.createElement("display")
  display.dpi = dpi
  document.append(display)
  const styles = acquireDocumentAuthorStyleSheetOwner(document)
  styles.replace([{id: "test", cssText: `display {${css}}`}])
  return {document, display, styles}
}

test("CSS-каскад определяет физические размеры, матрицу и ориентацию дисплея", () => {
  const {document, display} = fixture(`
    width: 320mm;
    height: 180mm;
    translate: 0 0 900mm;
    rotate: x 90deg;
  `, 203.2)
  expect(display, "Тег display должен создавать базовый DisplayElement").toBeInstanceOf(DisplayElement)
  const style = readDisplayStyle(document, display)
  expect(style.pixels, "Физические размеры и плотность должны давать матрицу 2560 × 1440 пикселей").toEqual({width: 2560, height: 1440})
  expect(style.viewport.width * style.worldUnitsPerPixel, "Физическая ширина поверхности должна составлять 320 мм").toBeCloseTo(320)
  expect(style.viewport.height * style.worldUnitsPerPixel, "Физическая высота поверхности должна составлять 180 мм").toBeCloseTo(180)
  expect(style.transform.position.z, "CSS translate должен размещать дисплей на высоте 900 мм").toBeCloseTo(900)
  expect(style.transform.quaternion.x, "CSS rotate должен поворачивать поверхность на 90 градусов вокруг оси X").toBeCloseTo(Math.SQRT1_2)
})

test("Плотность меняет матрицу без изменения раскладки, дочерние элементы поддерживают физические единицы", () => {
  const {document, display} = fixture(`
    width: 254mm;
    height: 127mm;
    display: flex;
  `, 10)
  const child = document.createElement("div")
  child.setAttribute("style", `
    width: 25.4mm;
    height: 1in;
    flex-shrink: 0;
  `)
  display.append(child)
  const before = readDisplayStyle(document, display)
  expect(before.pixels, "При плотности 10 пикселей на дюйм матрица должна иметь размер 100 × 50").toEqual({width: 100, height: 50})
  const renderer = createDocumentRenderer({document, root: display, viewport: before.viewport})
  const box = renderer.flush().boxByNode.get(child)!
  expect(box.width, "Ширина дочернего элемента 25.4 мм должна соответствовать 96 CSS px").toBeCloseTo(96)
  expect(box.height, "Высота дочернего элемента 1 дюйм должна соответствовать 96 CSS px").toBeCloseTo(96)
  display.dpi = 192
  const after = readDisplayStyle(document, display)
  expect(after.pixels, "Увеличение плотности должно давать матрицу 1920 × 960 пикселей").toEqual({width: 1920, height: 960})
  expect(after.viewport, "Изменение плотности не должно менять область раскладки").toEqual(before.viewport)
  expect(renderer.flush().boxByNode.get(child)!.width, "Изменение плотности не должно менять CSS-ширину дочернего элемента").toBeCloseTo(box.width)
  renderer.dispose()
})

test("Переменные темы и локальные стили участвуют в одном каскаде и задают независимый масштаб осей", () => {
  const {document, display} = fixture(`
    --surface-width: 320mm;
    width: var(--surface-width);
    height: calc(10cm + 80mm);
    scale: 2 3 1;
  `, 203.2)
  const style = readDisplayStyle(document, display)
  expect(style.pixels, "Переменные темы и calc должны определять физический размер матрицы").toEqual({width: 2560, height: 1440})
  expect(style.transform.scale, "CSS scale должен независимо задавать масштаб каждой оси").toEqual({x: 2, y: 3, z: 1})
  display.dpi = 96
  display.setAttribute("style", "translate: 10mm 20mm 30mm")
  expect(readDisplayStyle(document, display).dpi, "Локальный стиль не должен менять заданный атрибутом dpi").toBe(96)
  const position = readDisplayStyle(document, display).transform.position
  expect(position.x, "Локальный translate должен сместить дисплей на 10 мм по X").toBeCloseTo(10)
  expect(position.y, "Локальный translate должен сместить дисплей на 20 мм по Y").toBeCloseTo(20)
  expect(position.z, "Локальный translate должен сместить дисплей на 30 мм по Z").toBeCloseTo(30)
})


test("Порядок слов transform-origin сохраняет опорную точку, недопустимые параметры отклоняются", () => {
  const {document, display} = fixture(`
    width: 100mm;
    height: 50mm;
    scale: 2;
    transform-origin: top left;
  `)
  const first = readDisplayStyle(document, display)
  display.setAttribute("style", "transform-origin: left top")
  expect(readDisplayStyle(document, display), "Перестановка top left в left top должна сохранять опорную точку").toEqual(first)
  display.setAttribute("style", "box-sizing: content-box")
  expect(() => readDisplayStyle(document, display), "Режим content-box должен отклоняться для физического дисплея").toThrow("border-box")
  display.setAttribute("style", "transform: translateX(10px)")
  expect(() => readDisplayStyle(document, display), "Неподдерживаемый составной transform должен явно отклоняться").toThrow("individual translate")
})


test("Пространственный стиль дисплея учитывает общее состояние наведения", () => {
  const {document, display, styles} = fixture(`
    width: 100mm;
    height: 50mm;
  `)
  styles.replace([{id: "test", cssText: `
    display {
      width: 100mm;
      height: 50mm;
    }

    display:hover {
      translate: 10mm 0 0;
    }
  `}])
  const interaction = createDocumentInteractionState(document)
  expect(readDisplayStyle(document, display, interaction).dpi, "До наведения плотность должна оставаться равной 96").toBe(96)
  interaction.setHoveredElement(display)
  expect(readDisplayStyle(document, display, interaction).dpi, "Наведение не должно менять плотность пикселей").toBe(96)
  expect(readDisplayStyle(document, display, interaction).transform.position.x, "Стиль наведения должен смещать дисплей на 10 мм по X").toBeCloseTo(10)
})


test("CSS-свойство resolution не переопределяет числовой атрибут dpi", () => {
  const {document, display} = fixture(`
    width: 254mm;
    height: 127mm;
    resolution: 10dpi;
  `, 192)
  expect(readDisplayStyle(document, display).pixels, "Атрибут dpi должен определять матрицу независимо от CSS resolution").toEqual({width: 1920, height: 960})
  display.removeAttribute("dpi")
  expect(readDisplayStyle(document, display).pixels, "Удаление dpi должно восстанавливать матрицу при стандартной плотности 96").toEqual({width: 960, height: 480})
})
