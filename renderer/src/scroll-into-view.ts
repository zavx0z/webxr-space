import {HTMLElement, completeDocumentScrollIntoViewRequest, readDocumentScrollIntoViewRequests, type ScrollLogicalPosition} from "@zavx0z/dom"
import type {DocumentRenderer, RenderBox, RenderFrame, RenderTransform} from "./types.ts"

/** Fulfills a bounded snapshot of DOM requests through existing scroll state and retained layout. */
export function fulfillScrollIntoViewRequests(renderer: DocumentRenderer): RenderFrame {
  let frame = renderer.flush()
  const requests = readDocumentScrollIntoViewRequests(frame.document, frame.root)
  for (const request of requests) {
    if (!request.target.isConnected || !frame.root.isConnected) continue
    completeDocumentScrollIntoViewRequest(frame.document, request.id)
    if (!frame.boxByNode.has(request.target)) continue
    for (let ancestor = request.target.parentElement;
      ancestor !== null && frame.root.contains(ancestor); ancestor = ancestor.parentElement) {
      if (!(ancestor instanceof HTMLElement)) continue
      const target = frame.boxByNode.get(request.target)
      const scrollport = frame.boxByNode.get(ancestor)
      const scroll = frame.scrolls.get(ancestor)
      if (!target || !scrollport || !scroll || !scrollsTarget(target, ancestor) ||
        scrollport.transform.scaleX === 0 || scrollport.transform.scaleY === 0) continue
      const bounds = relativeBounds(target, scrollport.transform)
      const x = scrollport.x + scrollport.border.widths.left
      const y = scrollport.y + scrollport.border.widths.top
      const left = Math.max(0, Math.min(scroll.maxScrollLeft, scroll.scrollLeft +
        alignmentDelta(bounds.left, bounds.right, x, x + scroll.clientWidth, request.inline)))
      const top = Math.max(0, Math.min(scroll.maxScrollTop, scroll.scrollTop +
        alignmentDelta(bounds.top, bounds.bottom, y, y + scroll.clientHeight, request.block)))
      if (Math.abs(left - scroll.scrollLeft) < 1e-7 && Math.abs(top - scroll.scrollTop) < 1e-7) continue
      frame.document.transaction(() => {
        ancestor.scrollLeft = left
        ancestor.scrollTop = top
      })
      // Resolve the next ancestor against the already scrolled inner layout.
      // A sole scroll uses the renderer's existing no-layout projection path.
      frame = renderer.flush()
    }
  }
  return frame
}

const scrollsTarget = (target: RenderBox, ancestor: HTMLElement): boolean =>
  (target.scrollBoundaries ?? []).every(boundary => boundary.root.contains(ancestor) ||
    boundary.containing !== null && ancestor.contains(boundary.containing))

const relativeBounds = (box: RenderBox, parent: RenderTransform) => {
  const x1 = (box.x * box.transform.scaleX + box.transform.translateX - parent.translateX) / parent.scaleX
  const x2 = ((box.x + box.width) * box.transform.scaleX + box.transform.translateX - parent.translateX) / parent.scaleX
  const y1 = (box.y * box.transform.scaleY + box.transform.translateY - parent.translateY) / parent.scaleY
  const y2 = ((box.y + box.height) * box.transform.scaleY + box.transform.translateY - parent.translateY) / parent.scaleY
  return {left: Math.min(x1, x2), right: Math.max(x1, x2), top: Math.min(y1, y2), bottom: Math.max(y1, y2)}
}

const alignmentDelta = (start: number, end: number, viewStart: number, viewEnd: number, alignment: ScrollLogicalPosition): number => {
  if (alignment === "start") return start - viewStart
  if (alignment === "end") return end - viewEnd
  if (alignment === "center") return (start + end - viewStart - viewEnd) / 2
  if (start >= viewStart && end <= viewEnd || start < viewStart && end > viewEnd) return 0
  const size = end - start
  const viewport = viewEnd - viewStart
  if (start < viewStart && size <= viewport || end > viewEnd && size > viewport) return start - viewStart
  if (end > viewEnd && size <= viewport || start < viewStart && size > viewport) return end - viewEnd
  return 0
}
