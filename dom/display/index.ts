/**
DOM-элемент физического дисплея. Атрибуты `width` и `height` задают размер
в миллиметрах, CSS — разрешение и преобразования. Browser публикует
вычисленные размеры и плотность пикселей по каждой оси.

@packageDocumentation
*/
import type {Document} from "../src/document.ts"
import {HTMLElement} from "../src/html-element.ts"
import {UIEvent} from "../src/ui-event.ts"

/**
Вычисленные параметры отображения: CSS задаёт разрешение, а физические
атрибуты позволяют вычислить плотность пикселей по каждой оси.

@property width - Ширина области раскладки в CSS px.

@property height - Высота области раскладки в CSS px.

@property pixelWidth - Ширина пиксельной матрицы в пикселях.

@property pixelHeight - Высота пиксельной матрицы в пикселях.

@property dpi - Плотность пикселей на дюйм по физическим осям X и Y.
Значения могут различаться при несовпадении пропорций поверхности и матрицы.
*/
export type DisplayMetrics = Readonly<{
  width: number
  height: number
  pixelWidth: number
  pixelHeight: number
  dpi: Readonly<{x: number; y: number}>
}>

const metrics = new WeakMap<DisplayElement, DisplayMetrics>()
const emptyDpi: DisplayMetrics["dpi"] = Object.freeze({x: 0, y: 0})

/**
Поверхность документа с обычными HTML-потомками, фокусом и прокруткой.
Числовые атрибуты `width` и `height` задают физические размеры в миллиметрах.
CSS задаёт разрешение матрицы и преобразования. Browser публикует размеры
области раскладки, матрицы и вычисленную плотность по обеим осям.
Событие `resize` отправляется после фиксации изменившихся параметров отображения.
Элемент не владеет Canvas, рендерером, камерой или циклом анимации.

@property width - Физическая ширина в миллиметрах; без атрибута равна нулю.
Запись отражается в одноимённом атрибуте. Значение должно быть конечным и
строго положительным; недопустимое значение при чтении или записи вызывает `RangeError`.

@property height - Физическая высота в миллиметрах; правила совпадают с `width`.

@property viewport - Неизменяемый снимок размеров области раскладки в CSS px.
До первой публикации размеров обе величины равны нулю.

@property pixelWidth - Ширина матрицы в пикселях; до первой публикации равна нулю.

@property pixelHeight - Высота матрицы в пикселях; до первой публикации равна нулю.

@property dpi - Неизменяемый вычисленный снимок плотности `{x, y}` в пикселях
на дюйм. До первой публикации оба значения равны нулю. Плотность не задаётся
атрибутом и не имеет setter.
*/
export class DisplayElement extends HTMLElement {
  constructor(document: Document) {
    super(document, "display")
  }

  get width(): number {
    const value = this.getAttribute("width")
    return value === null ? 0 : validPhysicalSize(Number(value), "width")
  }

  set width(value: number) {
    this.setAttribute("width", String(validPhysicalSize(value, "width")))
  }

  get height(): number {
    const value = this.getAttribute("height")
    return value === null ? 0 : validPhysicalSize(Number(value), "height")
  }

  set height(value: number) {
    this.setAttribute("height", String(validPhysicalSize(value, "height")))
  }

  get viewport(): Readonly<{ width: number; height: number }> {
    const value = metrics.get(this)
    return Object.freeze({width: value?.width ?? 0, height: value?.height ?? 0})
  }

  get pixelWidth(): number {
    return metrics.get(this)?.pixelWidth ?? 0
  }

  get pixelHeight(): number {
    return metrics.get(this)?.pixelHeight ?? 0
  }

  get dpi(): DisplayMetrics["dpi"] {
    return metrics.get(this)?.dpi ?? emptyDpi
  }
}

/**
Публикует вычисленные параметры отображения без изменения атрибутов и дерева DOM.
Повторная публикация тех же значений ничего не меняет. Событие `resize` ставится
в очередь микрозадач и отправляется, только если элемент подключён к документу
и опубликованный снимок всё ещё актуален.

@param element - Дисплей, для которого владелец отображения вычислил параметры.
@param value - Снимок размеров области раскладки, пиксельной матрицы и плотности.
*/
export function publishDisplayMetrics(element: DisplayElement, value: DisplayMetrics): void {
  const previous = metrics.get(element)
  if (previous && previous.width === value.width && previous.height === value.height &&
    previous.pixelWidth === value.pixelWidth && previous.pixelHeight === value.pixelHeight &&
    previous.dpi.x === value.dpi.x && previous.dpi.y === value.dpi.y) return
  const next = Object.freeze({...value, dpi: Object.freeze({...value.dpi})})
  metrics.set(element, next)
  queueMicrotask(() => {
    if (element.isConnected && metrics.get(element) === next) element.dispatchEvent(new UIEvent("resize"))
  })
}

function validPhysicalSize(value: number, dimension: "width" | "height"): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`Display ${dimension} must be a finite positive number in millimeters`)
  return value
}
