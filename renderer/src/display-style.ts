import type {DocumentInteractionState} from "./pseudo-state.ts"
import type {Document, Element} from "@zavx0z/dom"
import {DisplayElement} from "@zavx0z/dom/display"
import {computeStyle, type ComputedStyle} from "./css.ts"
import {cachedDocumentStyleRules, prepareHostStyleSheets} from "./stylesheet-cache.ts"

/** Канонический перевод CSS-длин в пространственных свойствах; плотность матрицы задаётся отдельно по осям. */
export const MILLIMETRES_PER_CSS_PIXEL = 25.4 / 96

export type DisplayStyle = Readonly<{
  viewport: Readonly<{width: number; height: number}>
  pixels: Readonly<{width: number; height: number}>
  dpi: Readonly<{x: number; y: number}>
  worldUnitsPerPixel: number
  worldUnitsPerPixelY: number
  transform: Readonly<{
    position: Readonly<{x: number; y: number; z: number}>
    quaternion: Readonly<{x: number; y: number; z: number; w: number}>
    scale: Readonly<{x: number; y: number; z: number}>
    visible: boolean
  }>
}>

const emptyHost = prepareHostStyleSheets([])

/** Вычисляет разрешение и преобразования через общий CSS-каскад, а физические размеры читает из DOM. */
export function readDisplayStyle(document: Document, element: DisplayElement, interactionState?: DocumentInteractionState): DisplayStyle {
  const {rules} = cachedDocumentStyleRules(document, emptyHost)
  const ancestors: Element[] = []
  for (let node: Element | null = element; node; node = node.parentElement) ancestors.push(node)
  let style: ComputedStyle | null = null
  let visible = true
  for (let index = ancestors.length - 1; index >= 0; index--) {
    style = computeStyle(ancestors[index]!, style, rules, interactionState)
    visible &&= style.display !== "none"
  }
  const surface = style!.displaySurface
  if (!surface) throw new TypeError("Display requires positive integer CSS pixel resolution and physical width and height attributes")
  return {...surface, transform: {...surface.transform, visible: visible && style!.visibility !== "hidden"}}
}
