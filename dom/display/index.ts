import type {Document} from "../src/document.ts"
import {HTMLElement} from "../src/html-element.ts"
import {UIEvent} from "../src/ui-event.ts"

/** Derived presentation facts. CSS owns dimensions; the dpi attribute owns pixel density. */
export type DisplayMetrics = Readonly<{
  width: number
  height: number
  pixelWidth: number
  pixelHeight: number
  dpi: number
}>

const metrics = new WeakMap<DisplayElement, DisplayMetrics>()

/**
Native document surface with ordinary HTML children, focus and scrolling.
CSS owns physical dimensions and transform; dpi is a numeric element attribute. Browser publishes derived
layout/matrix dimensions; `resize` fires after a changed presentation is committed.
No Canvas, renderer, camera or animation loop belongs to this element.
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
  /** Pixel density in dots per inch. Defaults to 96; must be finite and positive. */
  get dpi(): number {
    const value = this.getAttribute("dpi")
    return value === null ? 96 : validDpi(Number(value))
  }
  set dpi(value: number) {
    this.setAttribute("dpi", String(validDpi(value)))
  }
}

/** Presentation-owner hook; updates facts without author attributes or a DOM mutation. */
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
