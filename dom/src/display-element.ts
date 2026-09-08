import type {Document} from "./document.ts"
import {HTMLElement} from "./html-element.ts"
import {UIEvent} from "./ui-event.ts"

/** Derived presentation facts. Authored dimensions and density belong to CSS. */
export type DisplayMetrics = Readonly<{
  width: number
  height: number
  pixelWidth: number
  pixelHeight: number
  resolution: number
}>

const metrics = new WeakMap<DisplayElement, DisplayMetrics>()

/**
Native document surface with ordinary HTML children, focus and scrolling.
CSS owns physical dimensions, density and transform. Browser publishes derived
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
  /** Computed pixel density in dpi; zero until the first presentation. */
  get resolution(): number { return metrics.get(this)?.resolution ?? 0 }
}

/** Presentation-owner hook; updates facts without author attributes or a DOM mutation. */
export function publishDisplayMetrics(element: DisplayElement, value: DisplayMetrics): void {
  const previous = metrics.get(element)
  if (previous && previous.width === value.width && previous.height === value.height &&
    previous.pixelWidth === value.pixelWidth && previous.pixelHeight === value.pixelHeight &&
    previous.resolution === value.resolution) return
  const next = Object.freeze({...value})
  metrics.set(element, next)
  queueMicrotask(() => {
    if (element.isConnected && metrics.get(element) === next) element.dispatchEvent(new UIEvent("resize"))
  })
}
