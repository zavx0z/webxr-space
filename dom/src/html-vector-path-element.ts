import type {Document} from "./document.ts"
import {HTMLElement} from "./html-element.ts"

/** Общий предел абсолютной авторской координаты для ограниченного parser Renderer. */
export const VECTOR_PATH_COORDINATE_LIMIT = 16_777_216

/**
 * Семантический владелец одного векторного контура с обводкой и заливкой.
 *
 * `d` отражается в обычном DOM-состоянии. Грамматика одного контура: абсолютные
 * M/L/Q/C. CSS fill по умолчанию none, fill-rule — nonzero; заливка неявно
 * замыкает контур. Разбор, layout, paint и hit принадлежат Renderer.
 */
export class HTMLVectorPathElement extends HTMLElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "vector-path")
  }

  get d(): string {
    return this.getAttribute("d") ?? ""
  }

  set d(value: string) {
    this.setAttribute("d", String(value))
  }
}
