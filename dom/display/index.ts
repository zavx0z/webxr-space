/**
DOM-элемент физического дисплея. CSS задаёт размеры и преобразования,
атрибут `dpi` — плотность пикселей, а Browser публикует вычисленные размеры.

@packageDocumentation
*/
import type {Document} from "../src/document.ts"
import {HTMLElement} from "../src/html-element.ts"
import {UIEvent} from "../src/ui-event.ts"

/**
Вычисленные параметры отображения: размеры задаются CSS, плотность — атрибутом `dpi`.

@property width - Ширина области раскладки в CSS px.

@property height - Высота области раскладки в CSS px.

@property pixelWidth - Ширина пиксельной матрицы в пикселях.

@property pixelHeight - Высота пиксельной матрицы в пикселях.

@property dpi - Плотность пикселей на дюйм физической поверхности.
*/
export type DisplayMetrics = Readonly<{
  width: number
  height: number
  pixelWidth: number
  pixelHeight: number
  dpi: number
}>

const metrics = new WeakMap<DisplayElement, DisplayMetrics>()

/**
Поверхность документа с обычными HTML-потомками, фокусом и прокруткой.
CSS задаёт физические размеры и преобразования; числовой атрибут `dpi` — плотность пикселей.
Browser публикует вычисленные размеры области раскладки и матрицы.
Событие `resize` отправляется после фиксации изменившихся параметров отображения.
Элемент не владеет Canvas, рендерером, камерой или циклом анимации.

@property viewport - Неизменяемый снимок размеров области раскладки в CSS px.
До первой публикации размеров обе величины равны нулю.

@property pixelWidth - Ширина матрицы в пикселях; до первой публикации равна нулю.

@property pixelHeight - Высота матрицы в пикселях; до первой публикации равна нулю.

@property dpi - Плотность пикселей на дюйм; при отсутствии атрибута равна `96`.
Значение должно быть конечным и строго положительным; иначе чтение или запись
вызывает `RangeError`. Запись свойства обновляет атрибут `dpi`.
*/
export class DisplayElement extends HTMLElement {
  constructor(document: Document) {
    super(document, "display")
  }

  get viewport(): Readonly<{width: number; height: number}> {
    const value = metrics.get(this)
    return Object.freeze({width: value?.width ?? 0, height: value?.height ?? 0})
  }
  get pixelWidth(): number { return metrics.get(this)?.pixelWidth ?? 0 }
  get pixelHeight(): number { return metrics.get(this)?.pixelHeight ?? 0 }
  get dpi(): number {
    const value = this.getAttribute("dpi")
    return value === null ? 96 : validDpi(Number(value))
  }
  set dpi(value: number) {
    this.setAttribute("dpi", String(validDpi(value)))
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
    previous.dpi === value.dpi) return
  const next = Object.freeze({...value})
  metrics.set(element, next)
  queueMicrotask(() => {
    if (element.isConnected && metrics.get(element) === next) element.dispatchEvent(new UIEvent("resize"))
  })
}

function validDpi(value: number): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError("Display dpi must be a finite positive number")
  return value
}
