import {pointInPathFill} from "../vector/index.ts"
import {
  Event,
  HTMLElement,
  HTMLInputElement,
  HTMLOptionElement,
  HTMLSelectElement,
  HTMLTextAreaElement,
  MouseEvent,
  PointerEvent,
  WheelEvent,
  readDocumentTextHighlights,
  type Node,
  type Document,
  type Element,
} from "@zavx0z/dom"
import type {
  DisplayItem,
  HitMetadata,
  RenderBorder,
  RenderClip,
  RenderClipRadius,
  RenderFrame,
  RenderScrollMetrics,
  RenderTransform,
  RenderTextMeasurer,
} from "./types.ts"
import {appendImmutableArray, immutableArrayFromReader} from "./immutable-array.ts"
import {readCanonicalRenderFrameChanges} from "./frame-changes.ts"
import {isRendererOwnedFrame, markRendererOwnedFrame, recordCanonicalRenderFrameChanges} from "./frame-change-state.ts"
import {scrollHitCandidates} from "./scroll-hit-index.ts"
import type {DocumentInteractionState} from "./pseudo-state.ts"
import {caretPositionAtPoint, rangeHighlightItems} from "./text-selection.ts"

export type PointerInput = Readonly<{
  clientX: number
  clientY: number
  pointerId?: number
  pointerType?: string
  button?: number
  buttons?: number
  pressure?: number
  isPrimary?: boolean
  timeStamp?: number
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}>

export type WheelInput = Readonly<{
  clientX: number
  clientY: number
  deltaX?: number
  deltaY?: number
  deltaZ?: number
  deltaMode?: number
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}>

export type TitleTooltip = Readonly<{
  source: Element
  target: Element
  text: string
  lines: readonly string[]
  x: number
  y: number
  width: number
  height: number
}>

export type CreateDocumentInteractionControllerOptions = Readonly<{
  document: Document
  tooltipDelayMs?: number
  /** Use the same default-font measurer as the renderer and presentation backend. */
  textMeasurer?: RenderTextMeasurer
  tooltipFontSize?: number
  tooltipMaxWidth?: number
  tooltipBackground?: string
  tooltipColor?: string
  interactionState?: DocumentInteractionState
  /** Projection adapters use the same hit policy for routing and dispatch. */
  hitTest?: (frame: RenderFrame, x: number, y: number) => HitMetadata | null
}>

export interface DocumentInteractionController {
  readonly document: Document
  readonly hoveredElement: Element | null
  readonly pressedElement: Element | null
  readonly tooltip: TitleTooltip | null
  /** Active ordinary-text drag only; native controls and prevented component gestures are excluded. */
  readonly selectionPointerId: number | null
  pointerMove(frame: RenderFrame, input: PointerInput): Element | null
  pointerDown(frame: RenderFrame, input: PointerInput): Element | null
  pointerUp(frame: RenderFrame, input: PointerInput): Element | null
  pointerCancel(frame: RenderFrame, input: PointerInput): void
  wheel(frame: RenderFrame, input: WheelInput): Element | null
  composeFrame(frame: RenderFrame, now?: number): RenderFrame
  dispose(): void
}

export type TitleCandidate = Readonly<{
  source: Element
  target: Element
  text: string
}>

const UA_TITLE_BACKGROUND_KEY = "ua:title-background"
const UA_TITLE_TEXT_KEY = "ua:title-text:"
const NO_CLIPS: readonly RenderClip[] = Object.freeze([])
const IDENTITY_TRANSFORM = Object.freeze({
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
})
const UA_TITLE_BORDER: RenderBorder = Object.freeze({
  widths: Object.freeze({top: 0, right: 0, bottom: 0, left: 0}),
  colors: Object.freeze({
    top: "#000000",
    right: "#000000",
    bottom: "#000000",
    left: "#000000",
  }),
  radii: Object.freeze({topLeft: 3, topRight: 3, bottomRight: 3, bottomLeft: 3}),
})

export const createDocumentInteractionController = (
  options: CreateDocumentInteractionControllerOptions,
): DocumentInteractionController => {
  const pickHit = options.hitTest ?? hitTest
  if (
    options.interactionState !== undefined &&
    options.interactionState.document !== options.document
  ) throw new TypeError("interactionState belongs to another Document")
  const tooltipDelayMs = nonNegative(options.tooltipDelayMs ?? 500, "tooltipDelayMs")
  const tooltipFontSize = positive(options.tooltipFontSize ?? 12, "tooltipFontSize")
  const tooltipMaxWidth = positive(options.tooltipMaxWidth ?? 320, "tooltipMaxWidth")
  const tooltipBackground = options.tooltipBackground ?? "#111827"
  const tooltipColor = options.tooltipColor ?? "#f9fafb"
  let hovered: Element | null = null
  let pressedTarget: Element | null = null
  let pressedOwner: Element | null = null
  let pressedOwnerDisabled = false
  let rangeDrag: Readonly<{
    input: HTMLInputElement
    pointerId: number
    changed: boolean
  }> | null = null
  let textSelectionDrag: Readonly<{
    textArea: HTMLTextAreaElement
    pointerId: number
    anchor: number
  }> | null = null
  let documentSelectionDrag: Readonly<{
    target: Element
    pointerId: number
    anchor: Readonly<{offsetNode: Node; offset: number}>
    root: Node | null
  }> | null = null
  let selectionMoved = false
  let titleCandidate: TitleCandidate | null = null
  let hoverStartedAt = 0
  let pointerX = 0
  let pointerY = 0
  let lastPointerId = 1
  let hasPointerPosition = false
  const activePointers = new Set<number>()
  let currentTooltip: TitleTooltip | null = null
  let cachedBase: RenderFrame | null = null
  let cachedSignature = ""
  let cachedPresentation: RenderFrame | null = null
  let lastComposedBase: RenderFrame | null = null
  let lastComposedFrame: RenderFrame | null = null
  let disposed = false

  const controller: DocumentInteractionController = {
    document: options.document,
    get hoveredElement() {
      return hovered
    },
    get pressedElement() {
      return pressedOwner
    },
    get tooltip() {
      return currentTooltip
    },
    get selectionPointerId() {
      if (documentSelectionDrag !== null) readCaptureTarget(documentSelectionDrag.pointerId)
      return documentSelectionDrag?.pointerId ?? null
    },
    pointerMove(frame, input) {
      assertActive()
      validateFrame(frame)
      validatePointer(input)
      pointerX = input.clientX
      pointerY = input.clientY
      hasPointerPosition = true
      const now = input.timeStamp ?? Date.now()
      const id = pointerIdOf(input)
      lastPointerId = id
      const captured = readCaptureTarget(id)
      const target = captured ?? (rangeDrag?.pointerId === id ? rangeDrag.input :
        textSelectionDrag?.pointerId === id ? textSelectionDrag.textArea :
        documentSelectionDrag?.pointerId === id ? documentSelectionDrag.target :
        pickHit(frame, pointerX, pointerY)?.node ?? null)
      transitionHover(target, input, now)
      const accepted = target?.dispatchEvent(pointerEvent("pointermove", input, null, true, true)) ?? true
      readCaptureTarget(id)
      if (accepted && rangeDrag?.pointerId === id) updateRangeDrag(frame, input)
      if (accepted && textSelectionDrag?.pointerId === id) updateTextSelectionDrag(frame, input)
      if (accepted && documentSelectionDrag?.pointerId === id) updateDocumentSelectionDrag(frame, input)
      invalidatePresentation()
      return target
    },
    pointerDown(frame, input) {
      assertActive()
      validateFrame(frame)
      validatePointer(input)
      pointerX = input.clientX
      pointerY = input.clientY
      hasPointerPosition = true
      const now = input.timeStamp ?? Date.now()
      const id = pointerIdOf(input)
      lastPointerId = id
      options.document.beginPointer(id)
      activePointers.add(id)
      const hit = pickHit(frame, pointerX, pointerY)
      options.document.lightDismissPopovers(hit?.node ?? null)
      options.document.closeSelectPickerOutside(hit?.node ?? null)
      const ownerHit = resolvePointerOwnerHit(frame, hit)
      transitionHover(hit?.node ?? null, input, now)
      pressedTarget = hit?.node ?? null
      pressedOwner = ownerHit?.node ?? pressedTarget
      pressedOwnerDisabled = ownerHit?.disabled ?? hit?.disabled ?? false
      selectionMoved = false
      options.interactionState?.setActiveElement(pressedTarget)
      titleCandidate = null
      currentTooltip = null
      if (hit) {
        const accepted = hit.node.dispatchEvent(
          pointerEvent("pointerdown", input, null, true, true),
        )
        if (accepted && ownerHit?.interactive === true && !ownerHit.disabled) {
          focusElement(ownerHit.node)
          if (ownerHit.node instanceof HTMLInputElement && ownerHit.node.type === "range") {
            rangeDrag = Object.freeze({input: ownerHit.node, pointerId: id, changed: false})
            updateRangeDrag(frame, input)
          } else if (ownerHit.node instanceof HTMLTextAreaElement && (input.button ?? 0) === 0) {
            const anchor = textAreaOffsetAtPoint(frame, ownerHit.node, input)
            if (anchor !== null) {
              textSelectionDrag = Object.freeze({textArea: ownerHit.node, pointerId: id, anchor})
              updateTextSelectionDrag(frame, input)
            }
          }
        }
        if (accepted && (input.button ?? 0) === 0 && !pressedOwnerDisabled &&
          !(ownerHit && ["input", "textarea", "select", "button"].includes(ownerHit.node.localName))) {
          const point = caretPositionAtPoint(frame, pointerX, pointerY, {nearest: true, root: hit.node})
          if (point !== null) {
            const active = options.document.activeElement
            if (active instanceof HTMLElement && !active.contains(hit.node)) active.blur()
            const sourceItem = frame.displayList.find(item => item.kind === "text" && item.node === point.offsetNode && item.source)
            const source = sourceItem?.kind === "text" ? sourceItem.source : undefined
            const selection = options.document.getSelection()
            if (source?.userSelect === "all" && source.selectionRoot !== null) {
              const range = options.document.createRange()
              range.selectNodeContents(source.selectionRoot)
              selection.removeAllRanges()
              selection.addRange(range)
            } else {
              const anchor = input.shiftKey && selection.anchorNode !== null
                ? {offsetNode: selection.anchorNode, offset: selection.anchorOffset}
                : point
              selection.setBaseAndExtent(anchor.offsetNode, anchor.offset, point.offsetNode, point.offset)
              documentSelectionDrag = Object.freeze({target: hit.node, pointerId: id,
                anchor,
                root: source?.selectionRoot ?? null})
            }
          }
        }
      }
      readCaptureTarget(id)
      invalidatePresentation()
      return hit?.node ?? null
    },
    pointerUp(frame, input) {
      assertActive()
      validateFrame(frame)
      validatePointer(input)
      pointerX = input.clientX
      pointerY = input.clientY
      hasPointerPosition = true
      const now = input.timeStamp ?? Date.now()
      const hit = pickHit(frame, pointerX, pointerY)
      const id = pointerIdOf(input)
      lastPointerId = id
      const captured = readCaptureTarget(id)
      const released = captured ?? (rangeDrag?.pointerId === id
        ? rangeDrag.input
        : textSelectionDrag?.pointerId === id
          ? textSelectionDrag.textArea
          : documentSelectionDrag?.pointerId === id ? documentSelectionDrag.target : hit?.node ?? null)
      const ownerHit = resolvePointerOwnerHitForTarget(frame, released, hit)
      transitionHover(released, input, now)
      const releasedOwner = ownerHit?.node ?? released
      const releasedOwnerDisabled = ownerHit?.disabled ?? hit?.disabled ?? false
      try {
        const accepted = released?.dispatchEvent(pointerEvent("pointerup", input, null, true, true)) ?? true
        readCaptureTarget(id)
        if (accepted && rangeDrag?.pointerId === id) updateRangeDrag(frame, input)
        if (accepted && textSelectionDrag?.pointerId === id) updateTextSelectionDrag(frame, input)
        if (accepted && documentSelectionDrag?.pointerId === id) updateDocumentSelectionDrag(frame, input)
        if (
          releasedOwner !== null &&
          releasedOwner === pressedOwner &&
          !selectionMoved &&
          !pressedOwnerDisabled &&
          !releasedOwnerDisabled
        ) {
          activateElement(
            released !== null && released === pressedTarget ? released : releasedOwner,
            input,
          )
        }
        finishRangeDrag(id, true)
      } finally {
        finishRangeDrag(id, false)
        finishTextSelectionDrag(id)
        if (documentSelectionDrag?.pointerId === id) documentSelectionDrag = null
        options.document.endPointer(id)
        activePointers.delete(id)
        pressedTarget = null
        pressedOwner = null
        pressedOwnerDisabled = false
        options.interactionState?.setActiveElement(null)
        refreshTitleCandidate(now)
        invalidatePresentation()
      }
      return released
    },
    pointerCancel(frame, input) {
      assertActive()
      validateFrame(frame)
      validatePointer(input)
      const id = pointerIdOf(input)
      const captured = readCaptureTarget(id)
      const target = captured ?? (rangeDrag?.pointerId === id ? rangeDrag.input :
        textSelectionDrag?.pointerId === id ? textSelectionDrag.textArea :
        documentSelectionDrag?.pointerId === id ? documentSelectionDrag.target :
        pressedTarget ?? hovered)
      try {
        target?.dispatchEvent(pointerEvent("pointercancel", input, null, true, false))
      } finally {
        finishRangeDrag(id, false)
        finishTextSelectionDrag(id)
        if (documentSelectionDrag?.pointerId === id) documentSelectionDrag = null
        options.document.endPointer(id)
        activePointers.delete(id)
        pressedTarget = null
        pressedOwner = null
        pressedOwnerDisabled = false
        options.interactionState?.setActiveElement(null)
        currentTooltip = null
        refreshTitleCandidate(input.timeStamp ?? Date.now())
        invalidatePresentation()
      }
    },
    wheel(frame, input) {
      assertActive()
      validateFrame(frame)
      validateWheel(input)
      const target = pickHit(frame, input.clientX, input.clientY)?.node ?? null
      if (target === null) return null
      const accepted = target.dispatchEvent(wheelEvent(input))
      if (accepted) applyWheel(frame, target, input, options.document)
      currentTooltip = null
      invalidatePresentation()
      return target
    },
    composeFrame(frame, now = Date.now()) {
      assertActive()
      validateFrame(frame)
      synchronizeHover(frame, now)
      refreshTitleCandidate(now)
      const tooltip = createTooltip(
        titleCandidate,
        hovered,
        pointerX,
        pointerY,
        frame,
        now,
        hoverStartedAt,
        tooltipDelayMs,
        tooltipFontSize,
        tooltipMaxWidth,
        options.textMeasurer,
      )
      currentTooltip = tooltip
      if (tooltip === null) {
        cachedBase = null
        cachedPresentation = null
        cachedSignature = ""
        return rememberComposition(frame, withTextHighlights(frame))
      }

      const signature = [
        tooltip.text,
        tooltip.x,
        tooltip.y,
        tooltip.width,
        tooltip.height,
        ...tooltip.lines,
      ].join("\u0000")
      if (
        cachedBase === frame &&
        cachedPresentation !== null &&
        cachedSignature === signature
      ) {
        return rememberComposition(frame, withTextHighlights(cachedPresentation))
      }

      const overlay = tooltipDisplayItems(
        tooltip,
        tooltipFontSize,
        tooltipBackground,
        tooltipColor,
      )
      const presentation = Object.freeze({
        ...frame,
        displayList: appendImmutableArray(frame.displayList, overlay),
      })
      cachedBase = frame
      cachedSignature = signature
      cachedPresentation = presentation
      return rememberComposition(frame, withTextHighlights(presentation))
    },
    dispose() {
      if (disposed) return
      disposed = true
      options.document.removeEventListener("gotpointercapture", onGotPointerCapture, true)
      for (const pointerId of activePointers) options.document.endPointer(pointerId)
      activePointers.clear()
      rangeDrag = null
      textSelectionDrag = null
      documentSelectionDrag = null
      hovered = null
      pressedTarget = null
      pressedOwner = null
      pressedOwnerDisabled = false
      options.interactionState?.setHoveredElement(null)
      options.interactionState?.setActiveElement(null)
      titleCandidate = null
      currentTooltip = null
      lastComposedBase = null
      lastComposedFrame = null
      invalidatePresentation()
    },
  }

  options.document.addEventListener("gotpointercapture", onGotPointerCapture, true)
  return Object.freeze(controller)

  function onGotPointerCapture(event: Event): void {
    if (event instanceof PointerEvent && activePointers.has(event.pointerId)) readCaptureTarget(event.pointerId)
  }

  function readCaptureTarget(id: number): Element | null {
    const captured = options.document.readPointerCaptureTarget(id)
    if (!activePointers.has(id)) return captured
    const displaced = (owner: Element): boolean => !owner.isConnected || captured !== null && captured !== owner
    if (rangeDrag?.pointerId === id && displaced(rangeDrag.input)) finishRangeDrag(id, false)
    if (textSelectionDrag?.pointerId === id && displaced(textSelectionDrag.textArea)) finishTextSelectionDrag(id)
    if (documentSelectionDrag?.pointerId === id && displaced(documentSelectionDrag.target)) {
      documentSelectionDrag = null
      selectionMoved = true
    }
    if (captured !== null && captured !== pressedOwner && captured !== pressedTarget) selectionMoved = true
    return captured
  }

  function rememberComposition(base: RenderFrame, presentation: RenderFrame): RenderFrame {
    if (isRendererOwnedFrame(base)) markRendererOwnedFrame(presentation)
    if (presentation === base && lastComposedFrame === lastComposedBase) {
      lastComposedBase = base
      lastComposedFrame = presentation
      return presentation
    }
    const changes = base === lastComposedBase ? null : readCanonicalRenderFrameChanges(base)
    if (changes?.structural !== undefined && lastComposedBase !== null && lastComposedFrame !== null &&
      changes.previous === lastComposedBase && isRendererOwnedFrame(base) &&
      isRendererOwnedFrame(lastComposedBase) && isRendererOwnedFrame(lastComposedFrame)) {
      const oldExtra = lastComposedFrame.displayList.length - lastComposedBase.displayList.length
      const extra = presentation.displayList.length - base.displayList.length
      let sameTopology = oldExtra === extra
      for (let index = 0; sameTopology && index < extra; index++) {
        const before = lastComposedFrame.displayList[lastComposedBase.displayList.length + index]!
        const after = presentation.displayList[base.displayList.length + index]!
        sameTopology = before.node === after.node && before.key === after.key && before.kind === after.kind
      }
      if (sameTopology) {
        // Do not rewrite the base producer's predecessor when a highlight-only
        // composition disappears. A derived frame keeps both histories immutable.
        const composed = presentation === base ? Object.freeze({...presentation}) : presentation
        markRendererOwnedFrame(composed)
        recordCanonicalRenderFrameChanges(composed, lastComposedFrame,
          immutableArrayFromReader(composed.displayList.length, index => index), changes.operations, changes.scroll, changes.structural)
        lastComposedBase = base
        lastComposedFrame = composed
        return composed
      }
    }
    if (lastComposedBase !== null && lastComposedFrame !== null &&
      presentation !== lastComposedFrame &&
      isRendererOwnedFrame(base) && isRendererOwnedFrame(lastComposedBase) && isRendererOwnedFrame(lastComposedFrame) &&
      base.displayList.length === lastComposedBase.displayList.length &&
      presentation.displayList.length === lastComposedFrame.displayList.length) {
      if (base === lastComposedBase || changes?.previous === lastComposedBase) {
        const overlayIndexes: number[] = []
        for (let index = base.displayList.length; index < presentation.displayList.length; index++) {
          if (presentation.displayList[index] !== lastComposedFrame.displayList[index]) overlayIndexes.push(index)
        }
        const indexes = appendImmutableArray(changes?.indexes ?? [], overlayIndexes)
        recordCanonicalRenderFrameChanges(presentation, lastComposedFrame, indexes, changes?.operations,
          changes?.scroll ?? readCanonicalRenderFrameChanges(base)?.scroll)
      }
    }
    lastComposedBase = base
    lastComposedFrame = presentation
    return presentation
  }

  function withTextHighlights(frame: RenderFrame): RenderFrame {
    const selection = options.document.getSelection()
    const active = options.document.activeElement
    const caret = selection.isCollapsed && active instanceof HTMLElement && active.isContentEditable && active.contains(selection.anchorNode)
    const highlights = selection.rangeCount > 0 && (!selection.isCollapsed || caret)
      ? [...rangeHighlightItems(frame, selection.getRangeAt(0), "ua:selection", caret ? "#e6e6e6" : "#6da4ff", caret)]
      : []
    for (const [index, highlight] of readDocumentTextHighlights(options.document).entries()) {
      highlights.push(...rangeHighlightItems(frame, highlight.range, `ua:selection-extra:${index}`,
        highlight.range.collapsed ? highlight.caretColor : highlight.color, true))
    }
    return highlights.length === 0 ? frame : Object.freeze({...frame, textHighlights: Object.freeze(highlights)})
  }

  function updateDocumentSelectionDrag(frame: RenderFrame, input: PointerInput): void {
    const drag = documentSelectionDrag
    if (drag === null) return
    const point = caretPositionAtPoint(frame, input.clientX, input.clientY, {nearest: true, ...(drag.root === null ? {} : {root: drag.root})})
    if (point === null) return
    selectionMoved ||= point.offsetNode !== drag.anchor.offsetNode || point.offset !== drag.anchor.offset
    options.document.getSelection().setBaseAndExtent(drag.anchor.offsetNode, drag.anchor.offset, point.offsetNode, point.offset)
  }

  function transitionHover(
    target: Element | null,
    input: PointerInput,
    now: number,
  ): void {
    if (target === hovered) {
      refreshTitleCandidate(now)
      return
    }

    const previous = hovered
    if (previous !== null) {
      previous.dispatchEvent(pointerEvent("pointerout", input, target, true, true))
      for (const element of exitedElements(previous, target)) {
        element.dispatchEvent(pointerEvent("pointerleave", input, target, false, false))
      }
    }

    hovered = target
    options.interactionState?.setHoveredElement(target)
    titleCandidate = resolveTitle(target)
    hoverStartedAt = now
    currentTooltip = null

    if (target !== null) {
      target.dispatchEvent(pointerEvent("pointerover", input, previous, true, true))
      for (const element of enteredElements(previous, target)) {
        element.dispatchEvent(pointerEvent("pointerenter", input, previous, false, false))
      }
    }
  }

  function synchronizeHover(frame: RenderFrame, now: number): void {
    if (!hasPointerPosition) return
    const captured = activePointers.has(lastPointerId) ? readCaptureTarget(lastPointerId) : null
    const target = captured ?? pickHit(frame, pointerX, pointerY)?.node ?? null
    if (target === hovered) return
    transitionHover(target, {
      clientX: pointerX,
      clientY: pointerY,
      pointerId: lastPointerId,
      timeStamp: now,
    }, now)
  }

  function refreshTitleCandidate(now: number): void {
    const next = resolveTitle(hovered)
    if (
      next?.source === titleCandidate?.source &&
      next?.target === titleCandidate?.target &&
      next?.text === titleCandidate?.text
    ) {
      return
    }
    titleCandidate = next
    hoverStartedAt = now
    currentTooltip = null
  }

  function validateFrame(frame: RenderFrame): void {
    if (frame.document !== options.document) {
      throw new TypeError("Interaction frame belongs to another Document")
    }
  }

  function assertActive(): void {
    if (disposed) throw new Error("Cannot use a disposed interaction controller")
  }

  function invalidatePresentation(): void {
    cachedBase = null
    cachedSignature = ""
    cachedPresentation = null
  }

  function updateRangeDrag(frame: RenderFrame, input: PointerInput): void {
    const drag = rangeDrag
    if (drag === null || drag.pointerId !== pointerIdOf(input)) return
    const track = frame.displayList.find((item): item is Extract<DisplayItem, {kind: "rect"}> =>
      item.kind === "rect" && item.node === drag.input && item.key === "track"
    )
    if (track === undefined) return
    const point = inverseTransformPoint(track.transform, input.clientX, input.clientY)
    if (point === null) return
    const ratio = track.width <= 0 ? 0 : clamp((point.x - track.x) / track.width, 0, 1)
    const minimum = rangeEndpoint(drag.input.min) ?? 0
    const declaredMaximum = rangeEndpoint(drag.input.max) ?? 100
    const maximum = Math.max(minimum, declaredMaximum)
    const previous = drag.input.value
    drag.input.valueAsNumber = minimum + (maximum - minimum) * ratio
    if (drag.input.value === previous) return
    rangeDrag = Object.freeze({...drag, changed: true})
    drag.input.dispatchEvent(new Event("input", {bubbles: true, composed: true}))
  }

  function finishRangeDrag(pointerId: number, commit: boolean): void {
    const drag = rangeDrag
    if (drag === null || drag.pointerId !== pointerId) return
    rangeDrag = null
    if (commit && drag.changed) {
      drag.input.dispatchEvent(new Event("change", {bubbles: true}))
    }
  }

  function updateTextSelectionDrag(frame: RenderFrame, input: PointerInput): void {
    const drag = textSelectionDrag
    if (drag === null || drag.pointerId !== pointerIdOf(input)) return
    const focus = textAreaOffsetAtPoint(frame, drag.textArea, input)
    if (focus === null) return
    const start = Math.min(drag.anchor, focus)
    const end = Math.max(drag.anchor, focus)
    const direction = focus < drag.anchor ? "backward" : focus > drag.anchor ? "forward" : "none"
    if (
      drag.textArea.selectionStart === start &&
      drag.textArea.selectionEnd === end &&
      drag.textArea.selectionDirection === direction
    ) return
    drag.textArea.setSelectionRange(start, end, direction)
    drag.textArea.dispatchEvent(new Event("select", {bubbles: true, composed: true}))
  }

  function finishTextSelectionDrag(pointerId: number): void {
    if (textSelectionDrag?.pointerId === pointerId) textSelectionDrag = null
  }
}

const rangeEndpointPattern = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/

const rangeEndpoint = (value: string): number | null => {
  if (!rangeEndpointPattern.test(value)) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const textAreaOffsetAtPoint = (
  frame: RenderFrame,
  textArea: HTMLTextAreaElement,
  input: PointerInput,
): number | null => {
  const hit = frame.hits.get(textArea)
  const metrics = hit?.textControl
  const box = frame.boxByNode.get(textArea)
  if (!hit || !metrics?.exactOffsetMapping || !box || metrics.lineHeight <= 0) return null
  const point = inverseTransformPoint(hit.transform, input.clientX, input.clientY)
  if (point === null) return null
  const lines = textArea.value.split("\n")
  const lineIndex = Math.max(
    0,
    Math.min(lines.length - 1, Math.floor((point.y - box.contentY) / metrics.lineHeight)),
  )
  const line = lines[lineIndex] ?? ""
  const lineItem = frame.displayList.find((item): item is Extract<DisplayItem, {kind: "text"}> =>
    item.kind === "text" && item.node === textArea && item.key === `value:${lineIndex}`
  )
  const lineX = lineItem?.x ?? box.contentX
  const column = metrics.characterAdvance <= 0
    ? 0
    : Math.max(0, Math.min(line.length, Math.round((point.x - lineX) / metrics.characterAdvance)))
  let offset = column
  for (let index = 0; index < lineIndex; index += 1) offset += (lines[index]?.length ?? 0) + 1
  return offset
}

export const hitTest = (
  frame: RenderFrame,
  x: number,
  y: number,
  accept: (hit: HitMetadata) => boolean = () => true,
): HitMetadata | null => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const hits = frame.hitOrder ?? [...frame.hits.values()]
  const candidates = scrollHitCandidates(frame, x, y)
  for (let index = (candidates?.length ?? hits.length) - 1; index >= 0; index--) {
    const hit = hits[candidates?.[index] ?? index]
    const transform = hit === undefined ? null : hitTransform(frame, hit)
    const local = transform === null ? null : inverseTransformPoint(transform, x, y)
    if (
      hit !== undefined &&
      transform !== null &&
      local !== null &&
      (hit.path === undefined
        ? hit.fragments === undefined
          ? local.x >= hit.x && local.y >= hit.y && local.x < hit.x + hit.width && local.y < hit.y + hit.height
          : hit.fragments.some(rect => local.x >= rect.x && local.y >= rect.y &&
            local.x < rect.x + rect.width && local.y < rect.y + rect.height)
        : pointInStrokedPath(hit, transform, x, y)) &&
      hit.clips.every((clip) => pointInClip(frame, clip, x, y)) &&
      accept(hit)
    ) {
      return hit
    }
  }
  return null
}

const hitTransform = (frame: RenderFrame, hit: HitMetadata): RenderTransform => {
  const owner = hit.path?.presentationOwner
  return owner === null || owner === undefined
    ? hit.transform
    : frame.presentationTransforms?.get(owner) ?? hit.transform
}

const pointInStrokedPath = (
  hit: HitMetadata,
  transform: RenderTransform,
  x: number,
  y: number,
): boolean => {
  const path = hit.path
  if (path === undefined || transform.scaleX === 0 || transform.scaleY === 0) return false
  const bounds = path.geometry.bounds
  const first = transformedPathPoint(
    transform,
    path.originX + bounds.x,
    path.originY + bounds.y,
  )
  const second = transformedPathPoint(
    transform,
    path.originX + bounds.x + bounds.width,
    path.originY + bounds.y + bounds.height,
  )
  const coarseRadius = Math.max(
    path.pointerHitWidth,
    path.pointerHitWidth * Math.max(Math.abs(transform.scaleX), Math.abs(transform.scaleY)),
    path.strokeWidth * Math.max(Math.abs(transform.scaleX), Math.abs(transform.scaleY)),
  ) / 2
  if (
    x < Math.min(first.x, second.x) - coarseRadius ||
    y < Math.min(first.y, second.y) - coarseRadius ||
    x > Math.max(first.x, second.x) + coarseRadius ||
    y > Math.max(first.y, second.y) + coarseRadius
  ) return false

  if (path.fillRule !== undefined && pointInPathFill(
    path.geometry,
    (x - transform.translateX) / transform.scaleX - path.originX,
    (y - transform.translateY) / transform.scaleY - path.originY,
    path.fillRule,
  )) return true

  for (const segment of path.geometry.segments) {
    const from = transformedPathPoint(
      transform,
      path.originX + segment.from.x,
      path.originY + segment.from.y,
    )
    const to = transformedPathPoint(
      transform,
      path.originX + segment.to.x,
      path.originY + segment.to.y,
    )
    const localX = segment.to.x - segment.from.x
    const localY = segment.to.y - segment.from.y
    const localLength = Math.hypot(localX, localY)
    const normalScale = localLength === 0
      ? 0
      : Math.hypot(
          transform.scaleX * -localY / localLength,
          transform.scaleY * localX / localLength,
        )
    const targetWidth = Math.max(
      path.pointerHitWidth,
      path.pointerHitWidth * normalScale,
      path.strokeWidth * normalScale,
    )
    if (targetWidth > 0 && pointSegmentDistanceSquared(x, y, from.x, from.y, to.x, to.y) <= (targetWidth / 2) ** 2) {
      return true
    }
  }
  return false
}

const transformedPathPoint = (
  transform: RenderTransform,
  x: number,
  y: number,
): Readonly<{x: number; y: number}> => ({
  x: transform.scaleX * x + transform.translateX,
  y: transform.scaleY * y + transform.translateY,
})

const pointSegmentDistanceSquared = (
  x: number,
  y: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number => {
  const segmentX = toX - fromX
  const segmentY = toY - fromY
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  if (lengthSquared === 0) return (x - fromX) ** 2 + (y - fromY) ** 2
  const amount = Math.max(
    0,
    Math.min(1, ((x - fromX) * segmentX + (y - fromY) * segmentY) / lengthSquared),
  )
  const nearestX = fromX + segmentX * amount
  const nearestY = fromY + segmentY * amount
  return (x - nearestX) ** 2 + (y - nearestY) ** 2
}

/** Resolves the nearest interactive or disabled semantic owner of an exact hit. */
export const resolvePointerOwnerHit = (
  frame: RenderFrame,
  hit: HitMetadata | null,
): HitMetadata | null => {
  if (hit === null) return null
  for (
    let element: Element | null = hit.node;
    element !== null;
    element = element.parentElement
  ) {
    const candidate = frame.hits.get(element)
    if (candidate?.interactive === true || candidate?.disabled === true) return candidate
  }
  return null
}

const resolvePointerOwnerHitForTarget = (
  frame: RenderFrame,
  target: Element | null,
  hit: HitMetadata | null,
): HitMetadata | null => {
  if (target === null) return null
  if (hit?.node === target) return resolvePointerOwnerHit(frame, hit)
  for (
    let element: Element | null = target;
    element !== null;
    element = element.parentElement
  ) {
    const candidate = frame.hits.get(element)
    if (candidate?.interactive === true || candidate?.disabled === true) return candidate
  }
  return null
}

export const pointInClip = (frame: RenderFrame, clip: RenderClip, x: number, y: number): boolean => {
  const transform = clip.presentationOwner === null || clip.presentationOwner === undefined
    ? clip.transform
    : frame.presentationTransforms?.get(clip.presentationOwner) ?? clip.transform
  const local = inverseTransformPoint(transform, x, y)
  if (local === null) return false
  x = local.x
  y = local.y
  const right = clip.x + clip.width
  const bottom = clip.y + clip.height
  if (clip.clipX && (x < clip.x || x >= right)) return false
  if (clip.clipY && (y < clip.y || y >= bottom)) return false
  if (!clip.clipX || !clip.clipY) return true

  return pointInRoundedCorner(
    x,
    y,
    clip.x,
    clip.y,
    clip.radii.topLeft,
    "top-left",
  ) &&
    pointInRoundedCorner(
      x,
      y,
      right,
      clip.y,
      clip.radii.topRight,
      "top-right",
    ) &&
    pointInRoundedCorner(
      x,
      y,
      right,
      bottom,
      clip.radii.bottomRight,
      "bottom-right",
    ) &&
    pointInRoundedCorner(
      x,
      y,
      clip.x,
      bottom,
      clip.radii.bottomLeft,
      "bottom-left",
    )
}

const inverseTransformPoint = (
  transform: Readonly<{
    scaleX: number
    scaleY: number
    translateX: number
    translateY: number
  }>,
  x: number,
  y: number,
): Readonly<{x: number; y: number}> | null => {
  if (transform.scaleX === 0 || transform.scaleY === 0) return null
  const localX = (x - transform.translateX) / transform.scaleX
  const localY = (y - transform.translateY) / transform.scaleY
  return Number.isFinite(localX) && Number.isFinite(localY)
    ? {x: localX, y: localY}
    : null
}

const pointInRoundedCorner = (
  x: number,
  y: number,
  cornerX: number,
  cornerY: number,
  radius: RenderClipRadius,
  corner: "top-left" | "top-right" | "bottom-right" | "bottom-left",
): boolean => {
  if (radius.x <= 0 || radius.y <= 0) return true
  const left = corner === "top-left" || corner === "bottom-left"
  const top = corner === "top-left" || corner === "top-right"
  const centerX = cornerX + (left ? radius.x : -radius.x)
  const centerY = cornerY + (top ? radius.y : -radius.y)
  const inCornerX = left ? x < centerX : x >= centerX
  const inCornerY = top ? y < centerY : y >= centerY
  if (!inCornerX || !inCornerY) return true
  const dx = x - centerX
  const dy = y - centerY
  return (dx * dx) / (radius.x * radius.x) +
    (dy * dy) / (radius.y * radius.y) <= 1
}

export const resolveTitle = (target: Element | null): TitleCandidate | null => {
  if (target === null) return null
  for (let element: Element | null = target; element !== null; element = element.parentElement) {
    if (!element.hasAttribute("title")) continue
    const text = element.getAttribute("title") ?? ""
    if (text === "") return null
    return Object.freeze({source: element, target, text})
  }
  return null
}

const pointerEvent = (
  type: string,
  input: PointerInput,
  relatedTarget: Element | null,
  bubbles: boolean,
  cancelable: boolean,
): PointerEvent =>
  new PointerEvent(type, {
    bubbles,
    cancelable,
    composed: true,
    clientX: input.clientX,
    clientY: input.clientY,
    pointerId: input.pointerId ?? 1,
    pointerType: input.pointerType ?? "mouse",
    button: input.button ?? 0,
    buttons: input.buttons ?? 0,
    pressure: input.pressure ?? 0,
    ctrlKey: input.ctrlKey ?? false,
    shiftKey: input.shiftKey ?? false,
    altKey: input.altKey ?? false,
    metaKey: input.metaKey ?? false,
    isPrimary: input.isPrimary ?? true,
    relatedTarget,
  })

const pointerIdOf = (input: PointerInput): number => input.pointerId ?? 1

const wheelEvent = (input: WheelInput): WheelEvent =>
  new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: input.clientX,
    clientY: input.clientY,
    deltaX: input.deltaX ?? 0,
    deltaY: input.deltaY ?? 0,
    deltaZ: input.deltaZ ?? 0,
    deltaMode: input.deltaMode ?? WheelEvent.DOM_DELTA_PIXEL,
    ctrlKey: input.ctrlKey ?? false,
    shiftKey: input.shiftKey ?? false,
    altKey: input.altKey ?? false,
    metaKey: input.metaKey ?? false,
  })

const applyWheel = (
  frame: RenderFrame,
  target: Element,
  input: WheelInput,
  document: Document,
): void => {
  const xOwner = findScrollOwner(
    frame,
    target,
    "x",
    input.deltaX ?? 0,
  )
  const yOwner = findScrollOwner(
    frame,
    target,
    "y",
    input.deltaY ?? 0,
  )
  if (!xOwner && !yOwner) return

  document.transaction(() => {
    if (xOwner) {
      xOwner.element.scrollLeft = clamp(
        Math.min(xOwner.metrics.maxScrollLeft, xOwner.element.scrollLeft) +
          wheelDelta(
            input.deltaX ?? 0,
            input.deltaMode ?? WheelEvent.DOM_DELTA_PIXEL,
            xOwner.metrics.clientWidth,
          ),
        0,
        xOwner.metrics.maxScrollLeft,
      )
    }
    if (yOwner) {
      yOwner.element.scrollTop = clamp(
        Math.min(yOwner.metrics.maxScrollTop, yOwner.element.scrollTop) +
          wheelDelta(
            input.deltaY ?? 0,
            input.deltaMode ?? WheelEvent.DOM_DELTA_PIXEL,
            yOwner.metrics.clientHeight,
          ),
        0,
        yOwner.metrics.maxScrollTop,
      )
    }
  })
}

type ScrollOwner = Readonly<{
  element: HTMLElement
  metrics: RenderScrollMetrics
}>

const findScrollOwner = (
  frame: RenderFrame,
  target: Element,
  axis: "x" | "y",
  delta: number,
): ScrollOwner | null => {
  if (delta === 0) return null
  for (
    let element: Element | null = target;
    element !== null;
    element = element.parentElement
  ) {
    if (!(element instanceof HTMLElement)) continue
    const metrics = frame.scrolls.get(element)
    if (!metrics || !hasRemainingScroll(element, metrics, axis, delta)) continue
    return Object.freeze({element, metrics})
  }
  return null
}

const hasRemainingScroll = (
  element: HTMLElement,
  metrics: RenderScrollMetrics,
  axis: "x" | "y",
  delta: number,
): boolean => {
  const maximum = axis === "x"
    ? metrics.maxScrollLeft
    : metrics.maxScrollTop
  const requested = axis === "x" ? element.scrollLeft : element.scrollTop
  const offset = Math.min(maximum, requested)
  return delta < 0 ? offset > 0 : offset < maximum
}

const wheelDelta = (
  delta: number,
  mode: number,
  clientSize: number,
): number => {
  if (mode === WheelEvent.DOM_DELTA_LINE) return delta * 16
  if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * clientSize
  return delta
}

const activateElement = (element: Element, input: PointerInput): void => {
  if (element instanceof HTMLOptionElement) {
    const select = selectOwner(element)
    if (select !== null) {
      select.choosePickerOption(element)
      return
    }
  }
  if (element instanceof HTMLSelectElement) {
    const accepted = element.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: input.clientX,
      clientY: input.clientY,
      button: input.button ?? 0,
      buttons: input.buttons ?? 0,
    }))
    if (!accepted) return
    if (element.pickerVisibilityState === "open") element.hidePicker()
    else element.showPicker()
    return
  }
  const activation = (element as Element & {click?: () => void}).click
  if (typeof activation === "function") {
    activation.call(element)
    return
  }
  element.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: input.clientX,
    clientY: input.clientY,
    button: input.button ?? 0,
    buttons: input.buttons ?? 0,
  }))
}

const selectOwner = (option: HTMLOptionElement): HTMLSelectElement | null => {
  for (let current = option.parentElement; current !== null; current = current.parentElement) {
    if (current instanceof HTMLSelectElement) return current
  }
  return null
}

const focusElement = (element: Element): void => {
  const focus = (element as Element & {focus?: () => void}).focus
  if (typeof focus === "function") focus.call(element)
}

const resolveElementPath = (element: Element | null): Element[] => {
  const path: Element[] = []
  for (let current = element; current !== null; current = current.parentElement) {
    path.push(current)
  }
  return path
}

const exitedElements = (
  previous: Element,
  next: Element | null,
): readonly Element[] => {
  const nextPath = new Set(resolveElementPath(next))
  return resolveElementPath(previous).filter((element) => !nextPath.has(element))
}

const enteredElements = (
  previous: Element | null,
  next: Element,
): readonly Element[] => {
  const previousPath = new Set(resolveElementPath(previous))
  return resolveElementPath(next)
    .filter((element) => !previousPath.has(element))
    .reverse()
}

const createTooltip = (
  candidate: TitleCandidate | null,
  hovered: Element | null,
  pointerX: number,
  pointerY: number,
  frame: RenderFrame,
  now: number,
  hoverStartedAt: number,
  delay: number,
  fontSize: number,
  maxWidth: number,
  textMeasurer?: RenderTextMeasurer,
): TitleTooltip | null => {
  if (
    candidate === null ||
    hovered === null ||
    now - hoverStartedAt < delay ||
    frame.viewport.width <= 0 ||
    frame.viewport.height <= 0
  ) {
    return null
  }

  const margin = 4
  const paddingX = 8
  const paddingY = 6
  const lineHeight = fontSize * 1.25
  const availableWidth = Math.max(1, frame.viewport.width - margin * 2)
  const widthLimit = Math.min(maxWidth, availableWidth)
  const contentWidth = widthLimit - paddingX * 2
  const maximumLines = Math.floor(
    (frame.viewport.height - margin * 2 - paddingY * 2) / lineHeight,
  )
  if (contentWidth <= 0 || maximumLines < 1) return null
  const measure = (text: string): number => nonNegative(
    textMeasurer?.measureTextAdvance(text, fontSize, 0) ?? Array.from(text).length * fontSize * 0.6,
    "textMeasurer.measureTextAdvance()",
  )
  const wrapped = wrapTitle(candidate.text, contentWidth, measure)
  const lines = fitLines(wrapped, maximumLines, contentWidth, measure)
  const textWidth = lines.reduce((maximum, line) => Math.max(maximum, measure(line)), 0)
  const width = Math.min(widthLimit, Math.max(1, textWidth + paddingX * 2))
  const height = Math.min(
    frame.viewport.height - margin * 2,
    lines.length * lineHeight + paddingY * 2,
  )
  const preferredX = pointerX + 12
  const below = pointerY + 18
  const above = pointerY - height - 12
  const preferredY = below + height + margin <= frame.viewport.height ? below : above
  const x = clamp(preferredX, margin, frame.viewport.width - width - margin)
  const y = clamp(preferredY, margin, frame.viewport.height - height - margin)

  return Object.freeze({
    source: candidate.source,
    target: candidate.target,
    text: candidate.text,
    lines: Object.freeze(lines),
    x,
    y,
    width,
    height,
  })
}

const tooltipDisplayItems = (
  tooltip: TitleTooltip,
  fontSize: number,
  background: string,
  color: string,
): readonly DisplayItem[] => {
  const lineHeight = fontSize * 1.25
  const items: DisplayItem[] = [
    Object.freeze({
      kind: "rect",
      key: UA_TITLE_BACKGROUND_KEY,
      node: tooltip.source,
      x: tooltip.x,
      y: tooltip.y,
      width: tooltip.width,
      height: tooltip.height,
      color: background,
      opacity: 1,
      border: UA_TITLE_BORDER,
      shadow: null,
      clips: NO_CLIPS,
      transform: IDENTITY_TRANSFORM,
    }),
  ]
  for (let index = 0; index < tooltip.lines.length; index++) {
    items.push(Object.freeze({
      kind: "text",
      key: `${UA_TITLE_TEXT_KEY}${index}`,
      node: tooltip.source,
      text: tooltip.lines[index] ?? "",
      x: tooltip.x + 8,
      y: tooltip.y + 6 + index * lineHeight,
      color,
      fontSize,
      lineHeight,
      letterSpacing: 0,
      opacity: 1,
      clips: NO_CLIPS,
      transform: IDENTITY_TRANSFORM,
    }))
  }
  return Object.freeze(items)
}

/** Wrap by measured advance, preserving code points and preferring word boundaries. */
const wrapTitle = (text: string, maximum: number, measure: (text: string) => number): string[] => {
  const output: string[] = []
  for (const sourceLine of text.split("\n")) {
    let remaining = sourceLine
    while (measure(remaining) > maximum) {
      const points = Array.from(remaining)
      const count = fittingPrefix(points, maximum, measure)
      if (count === 0) {
        output.push(measure("…") <= maximum ? "…" : "")
        remaining = points.slice(1).join("")
        continue
      }
      const prefix = points.slice(0, count).join("")
      const space = prefix.lastIndexOf(" ")
      const cut = space > 0 ? space : prefix.length
      output.push(remaining.slice(0, cut))
      remaining = remaining.slice(cut).replace(/^ +/u, "")
    }
    output.push(remaining)
  }
  return output
}

const fittingPrefix = (
  points: readonly string[],
  maximum: number,
  measure: (text: string) => number,
): number => {
  let low = 0
  let high = points.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (measure(points.slice(0, middle).join("")) <= maximum) low = middle
    else high = middle - 1
  }
  return low
}

const fitLines = (
  lines: readonly string[],
  maximum: number,
  width: number,
  measure: (text: string) => number,
): string[] => {
  if (lines.length <= maximum) return [...lines]
  const fitted = lines.slice(0, maximum)
  const points = Array.from(fitted.at(-1) ?? "")
  const count = fittingPrefix(points, width, text => measure(`${text}…`))
  fitted[fitted.length - 1] = measure("…") <= width ? `${points.slice(0, count).join("")}…` : ""
  return fitted
}

const validatePointer = (input: PointerInput): void => {
  if (!Number.isFinite(input.clientX) || !Number.isFinite(input.clientY)) {
    throw new RangeError("Pointer coordinates must be finite")
  }
}

const validateWheel = (input: WheelInput): void => {
  if (!Number.isFinite(input.clientX) || !Number.isFinite(input.clientY))
    throw new RangeError("Wheel coordinates must be finite")
  for (const value of [input.deltaX ?? 0, input.deltaY ?? 0, input.deltaZ ?? 0]) {
    if (!Number.isFinite(value))
      throw new RangeError("Wheel deltas must be finite")
  }
  const mode = input.deltaMode ?? WheelEvent.DOM_DELTA_PIXEL
  if (
    !Number.isSafeInteger(mode) ||
    mode < WheelEvent.DOM_DELTA_PIXEL ||
    mode > WheelEvent.DOM_DELTA_PAGE
  )
    throw new RangeError("Wheel deltaMode must be pixel, line or page")
}

const nonNegative = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`)
  }
  return value
}

const positive = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite positive number`)
  }
  return value
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
