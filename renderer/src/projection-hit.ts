import type {Node} from "@zavx0z/dom"
import {hitTest, pointInClip} from "./interaction.ts"
import {readCanonicalRenderFrameChanges} from "./frame-changes.ts"
import type {DisplayItem, HitMetadata, RenderFrame} from "./types.ts"

const paintByFrame = new WeakMap<RenderFrame, ReadonlyMap<Node, readonly number[]>>()

/** Stable paint ownership; coordinates and visibility are read from the current frame. */
export function projectionPaintIndex(frame: RenderFrame): ReadonlyMap<Node, readonly number[]> {
  const cached = paintByFrame.get(frame)
  if (cached !== undefined) return cached
  const changes = readCanonicalRenderFrameChanges(frame)
  if (changes?.scroll !== undefined && frame.displayList.length === changes.scroll.source.displayList.length) {
    const source = projectionPaintIndex(changes.scroll.source)
    paintByFrame.set(frame, source)
    return source
  }
  const previous = changes === null ? undefined : paintByFrame.get(changes.previous)
  if (previous !== undefined && changes?.scroll !== undefined &&
    frame.displayList.length === changes.previous.displayList.length) {
    paintByFrame.set(frame, previous)
    return previous
  }
  if (previous !== undefined && changes !== null &&
    frame.displayList.length === changes.previous.displayList.length &&
    changes.indexes.every(index => {
      const before = changes.previous.displayList[index]
      const after = frame.displayList[index]
      return before?.node === after?.node && before?.key === after?.key && before?.kind === after?.kind
    })) {
    paintByFrame.set(frame, previous)
    return previous
  }
  const index = new Map<Node, number[]>()
  for (let offset = 0; offset < frame.displayList.length; offset++) {
    const item = frame.displayList[offset]!
    let owner: Node | null = item.node
    while (owner !== null && !frame.hits.has(owner)) owner = owner.parentNode
    if (owner === null) continue
    const entries = index.get(owner)
    if (entries === undefined) index.set(owner, [offset])
    else entries.push(offset)
  }
  paintByFrame.set(frame, index)
  return index
}

/**
 * Finds occupied content in a shared projection. Layout-only ancestors do not
 * mask another projection. Controls and scroll viewports own their whole box;
 * borders own their stroke, while text, images and backgrounds own their paint.
 * The returned target follows the same clip, transform and stacking rules as
 * ordinary document input. Exhausted scroll viewports still occlude content.
 */
export const hitTestProjection = (frame: RenderFrame, x: number, y: number): HitMetadata | null => {
  const paint = projectionPaintIndex(frame)
  return hitTest(frame, x, y, hit => {
    if (hit.interactive || hit.disabled) return true
    const scroll = frame.scrolls.get(hit.node)
    if (scroll !== undefined && (scroll.maxScrollLeft > 0 || scroll.maxScrollTop > 0)) return true
    return (paint.get(hit.node) ?? []).some(index => containsPaint(frame, frame.displayList[index]!, hit, x, y))
  })
}

const containsPaint = (
  frame: RenderFrame,
  item: DisplayItem,
  hit: HitMetadata,
  x: number,
  y: number,
): boolean => {
  if (item.opacity <= 0 || item.kind === "rect" && item.shadow !== null) return false
  if (!item.clips.every(clip => pointInClip(frame, clip, x, y))) return false
  // Vector paths already passed the exact stroke hit test, including retained transforms.
  if (item.kind === "path") return visibleColor(item.stroke)
  const {scaleX, scaleY, translateX, translateY} = item.transform
  if (scaleX === 0 || scaleY === 0) return false
  const localX = (x - translateX) / scaleX - item.x
  const localY = (y - translateY) / scaleY - item.y
  const width = item.kind === "text"
    ? item.width ?? frame.boxByNode.get(item.node)?.width ?? hit.width
    : item.width
  const height = item.kind === "text" ? item.lineHeight : item.height
  if (localX < 0 || localY < 0 || localX >= width || localY >= height) return false
  if (item.kind === "image") return true
  if (item.kind === "rect") {
    const radius = (value: number) => ({x: value, y: value})
    const {radii} = item.border
    if (!pointInClip(frame, {
      x: item.x, y: item.y, width, height, clipX: true, clipY: true,
      transform: item.transform,
      radii: {
        topLeft: radius(radii.topLeft), topRight: radius(radii.topRight),
        bottomLeft: radius(radii.bottomLeft), bottomRight: radius(radii.bottomRight),
      },
    }, x, y)) return false
  }
  if (visibleColor(item.color)) return true
  if (item.kind !== "rect") return false
  const {widths, colors} = item.border
  return localY < widths.top && visibleColor(colors.top) ||
    localX >= width - widths.right && visibleColor(colors.right) ||
    localY >= height - widths.bottom && visibleColor(colors.bottom) ||
    localX < widths.left && visibleColor(colors.left)
}

const visibleColor = (color: string): boolean => {
  const value = color.trim().toLowerCase()
  if (value === "transparent") return false
  if (/^#[\da-f]{4}$/u.test(value)) return value[4] !== "0"
  if (/^#[\da-f]{8}$/u.test(value)) return value.slice(7) !== "00"
  const alpha = /\/\s*([\d.]+)%?\s*\)$/u.exec(value) ??
    /^(?:rgba|hsla)\([^,]+,[^,]+,[^,]+,\s*([\d.]+)%?\s*\)$/u.exec(value)
  return alpha === null || Number(alpha[1]) > 0
}
