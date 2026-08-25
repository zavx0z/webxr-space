import type {UiSurface} from "@layout/core/surface"
import {Z} from "@layout/core/surface"
import {
  createCodeTokenMaterials,
  renderCodeTextRuns,
  renderCodeTokenizedLine,
  type CodeTokenMaterialMap,
} from "@ui/elements/code"
import {divScrollPosition} from "@ui/elements/div"
import {
  focusReadOnlyTextParticipant,
  registerReadOnlyTextParticipant,
} from "@ui/elements/input"
import {cssColor, textMaterial, type CssColor} from "@ui/elements/style"
import {
  orderedTextSelection,
  sameTextPosition,
  textFromRange,
  writeClipboardText,
  type TextPosition,
  type TextSelectionRange,
} from "@ui/elements/text-selection"
import {
  activeVscodeSyntaxTheme,
  palette,
  resolveVscodeScopeColorHex,
  syntaxTokens,
} from "@ui/elements/theme"
import {
  opaqueRgba8ToColor,
  rgba8ToColor,
  uiTheme,
} from "@ui/elements/theme-reference"
import {
  resolveLanguageHighlighter,
  type Tokens,
} from "@zavx0z/highlighter"
import {Pane} from "@ui/components/pane"

export type CodeEditorPosition = Readonly<{
  line: number
  column: number
}>

export type CodeEditorSelection = Readonly<{
  anchor: CodeEditorPosition
  focus: CodeEditorPosition
  range: Readonly<{
    start: CodeEditorPosition
    end: CodeEditorPosition
  }>
  text: string
}>

export type CodeEditorScrollPosition = Readonly<{
  left: number
  top: number
}>

export type CodeEditorProps = Readonly<{
  key: string
  value: string
  readOnly: true
  languageId?: string
  path?: string
  tokens?: Tokens
  showLineNumbers?: boolean
  fontPx?: number
  linePx?: number
  onScrollChange?(position: CodeEditorScrollPosition): void
  onSelectionChange?(selection: CodeEditorSelection | null): void
}>

type CodeEditorState = {
  value: string
  lines: string[]
  anchor: TextPosition | null
  focus: TextPosition | null
  dragging: boolean
  tokenValue: string
  tokenLanguageId: string | undefined
  tokenPath: string | undefined
  tokenInput: Tokens | undefined
  tokens: Tokens
  materials: CodeTokenMaterialMap
  lineWidths: Map<string, number>
  lastScrollLeft: number | null
  lastScrollTop: number | null
}

const codeEditorStates = new WeakMap<UiSurface, Map<string, CodeEditorState>>()
const EDITOR_BORDER_INSET_PX = 1
const CODE_BLOCK_INSET_PX = 6
const CODE_GAP_PX = 4
const GUTTER_SIDE_PAD_PX = 8
const GUTTER_RULE_PX = 1
const TAB_COLUMNS = 2

/** Draws one retained, non-editable code region inside an existing Surface. */
export function CodeEditor(
  host: UiSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  props: CodeEditorProps,
): void {
  const state = codeEditorState(host, props)
  const fontPx = props.fontPx ?? 12
  const linePx = Math.max(fontPx + 2, props.linePx ?? 16)
  const showLineNumbers = props.showLineNumbers ?? true
  const gutterWidth = showLineNumbers
    ? Math.ceil(host.measureText("9".repeat(String(Math.max(1, state.lines.length)).length), fontPx) + GUTTER_SIDE_PAD_PX * 2)
    : 0
  const maxLineWidth = Math.max(1, ...state.lines.map((line) => codeLineWidth(host, state, line, fontPx)))
  const codeLeftInset = showLineNumbers ? CODE_GAP_PX : CODE_BLOCK_INSET_PX
  const contentWidth = gutterWidth + codeLeftInset + maxLineWidth + CODE_BLOCK_INSET_PX
  const contentHeight = Math.max(1, state.lines.length * linePx + CODE_BLOCK_INSET_PX * 2)

  registerReadOnlyTextParticipant(host, props.key, {
    hasSelection: () => orderedTextSelection(state.anchor, state.focus) !== null,
    copy: async () => {
      const selected = textFromRange(state.lines, orderedTextSelection(state.anchor, state.focus))
      if (selected === null) return false
      return await writeClipboardText(selected, "code editor selection copy")
    },
  })

  Pane(host, x, y, width, height, {
    appearance: "box",
    key: props.key,
    scrollContentWidth: contentWidth,
    scrollContentHeight: contentHeight,
    sx: {
      background: opaqueRgba8ToColor(uiTheme.spaceText.back),
      borderColor: rgba8ToColor(uiTheme.material.editorOutline),
      padding: 0,
      overflow: "auto",
      scrollbarWidth: 4,
    },
    children: ({scrollLeft, scrollTop, viewportWidth, viewportHeight, contentWidth: scrollContentWidth}) => {
      const viewportX = x
      const viewportY = y
      const codeRowsY = viewportY + CODE_BLOCK_INSET_PX
      const codeStartX = viewportX + gutterWidth + codeLeftInset - scrollLeft
      const codeMaxPx = Math.max(maxLineWidth, scrollContentWidth - gutterWidth)

      if (state.lastScrollLeft !== scrollLeft || state.lastScrollTop !== scrollTop) {
        state.lastScrollLeft = scrollLeft
        state.lastScrollTop = scrollTop
        props.onScrollChange?.(Object.freeze({left: scrollLeft, top: scrollTop}))
      }

      const codeClipX = viewportX + gutterWidth
      const codeClipWidth = Math.max(1, viewportWidth - gutterWidth)

      host.hit(codeClipX, viewportY, codeClipWidth, viewportHeight, () => {}, {
        key: props.key,
        cursor: "text",
        activeCursor: "text",
        onPointerDown: (localX, localY, event) => {
          if (event?.button !== undefined && event.button !== 0) return
          focusReadOnlyTextParticipant(host, props.key)
          const position = codePositionFromPoint(host, state, localX, localY, {
            codeStartX,
            viewportY: codeRowsY,
            scrollTop,
            fontPx,
            linePx,
          })
          state.anchor = position
          state.focus = position
          state.dragging = true
          emitCodeSelection(props, state)
          host.requestKeyedRender(props.key)
          event?.preventDefault()
        },
        onPointerMove: (localX, localY) => {
          if (!state.dragging) return
          const position = codePositionFromPoint(host, state, localX, localY, {
            codeStartX,
            viewportY: codeRowsY,
            scrollTop,
            fontPx,
            linePx,
          })
          if (sameTextPosition(state.focus, position)) return
          state.focus = position
          emitCodeSelection(props, state)
          host.requestKeyedRender(props.key)
        },
        onPointerUp: () => {
          if (!state.dragging) return
          state.dragging = false
          emitCodeSelection(props, state)
          host.requestKeyedRender(props.key)
        },
      })

      if (showLineNumbers) {
        host.drawRect(
          viewportX + EDITOR_BORDER_INSET_PX,
          viewportY + EDITOR_BORDER_INSET_PX,
          Math.max(1, gutterWidth - EDITOR_BORDER_INSET_PX),
          Math.max(1, viewportHeight - EDITOR_BORDER_INSET_PX * 2),
          rgba8ToColor(uiTheme.spaceText.gutter),
          Z.CONTAINER + 0.01,
        )
        host.drawRect(
          viewportX + gutterWidth - GUTTER_RULE_PX,
          viewportY,
          GUTTER_RULE_PX,
          viewportHeight,
          rgba8ToColor(uiTheme.material.editorBorder),
          Z.SEPARATOR,
        )
      }

      const firstLine = Math.max(0, Math.floor(scrollTop / linePx))
      const lastLine = Math.min(state.lines.length - 1, Math.ceil((scrollTop + viewportHeight) / linePx))
      const range = orderedTextSelection(state.anchor, state.focus)
      for (let lineIndex = firstLine; lineIndex <= lastLine; lineIndex++) {
        const line = state.lines[lineIndex] ?? ""
        const rowY = codeRowsY + lineIndex * linePx - scrollTop
        if (showLineNumbers) drawCodeLineNumber(host, lineIndex + 1, viewportX, rowY, gutterWidth, linePx, fontPx)
      }

      host.pushClip(codeClipX, viewportY, codeClipWidth, viewportHeight)
      for (let lineIndex = firstLine; lineIndex <= lastLine; lineIndex++) {
        const line = state.lines[lineIndex] ?? ""
        const rowY = codeRowsY + lineIndex * linePx - scrollTop
        const textY = rowY + Math.max(0, (linePx - fontPx) / 2)
        if (range !== null) drawCodeSelection(host, line, lineIndex, range, codeStartX, rowY, linePx, fontPx)
        drawCodeLine(host, state, line, lineIndex, codeStartX, textY, codeMaxPx, fontPx, linePx)
      }
      host.popClip()
    },
  })
}

export function codeEditorScrollPosition(host: UiSurface, key: string): CodeEditorScrollPosition {
  return Object.freeze(divScrollPosition(host, key))
}

function codeEditorState(host: UiSurface, props: CodeEditorProps): CodeEditorState {
  let states = codeEditorStates.get(host)
  if (states === undefined) {
    states = new Map()
    codeEditorStates.set(host, states)
  }
  let state = states.get(props.key)
  if (state === undefined) {
    state = {
      value: props.value,
      lines: codeLines(props.value),
      anchor: null,
      focus: null,
      dragging: false,
      tokenValue: "",
      tokenLanguageId: undefined,
      tokenPath: undefined,
      tokenInput: undefined,
      tokens: [],
      materials: createCodeTokenMaterials(),
      lineWidths: new Map(),
      lastScrollLeft: null,
      lastScrollTop: null,
    }
    states.set(props.key, state)
  }
  if (state.value !== props.value) {
    const hadSelection = orderedTextSelection(state.anchor, state.focus) !== null
    state.value = props.value
    state.lines = codeLines(props.value)
    state.anchor = null
    state.focus = null
    state.dragging = false
    state.lineWidths.clear()
    if (hadSelection && props.onSelectionChange !== undefined) {
      const onSelectionChange = props.onSelectionChange
      queueMicrotask(() => onSelectionChange(null))
    }
  }
  refreshCodeTokens(state, props)
  return state
}

function refreshCodeTokens(state: CodeEditorState, props: CodeEditorProps): void {
  if (
    state.tokenValue === props.value &&
    state.tokenLanguageId === props.languageId &&
    state.tokenPath === props.path &&
    state.tokenInput === props.tokens
  ) return

  state.tokenValue = props.value
  state.tokenLanguageId = props.languageId
  state.tokenPath = props.path
  state.tokenInput = props.tokens
  state.tokens = props.tokens ?? resolveLanguageHighlighter({
    ...(props.languageId === undefined ? {} : {languageId: props.languageId}),
    ...(props.path === undefined ? {} : {path: props.path}),
  }).tokenize(state.lines, {
    resolveForeground(scopes) {
      return resolveVscodeScopeColorHex(activeVscodeSyntaxTheme, scopes)
    },
  })
}

function codeLines(value: string): string[] {
  const normalized = value.replace(/\r\n?/g, "\n")
  return normalized.length === 0 ? [""] : normalized.split("\n")
}

function codeLineWidth(host: UiSurface, state: CodeEditorState, line: string, fontPx: number): number {
  const key = `${fontPx}\0${line}`
  const cached = state.lineWidths.get(key)
  if (cached !== undefined) return cached
  const width = host.measureText(expandCodeTabs(line), fontPx)
  state.lineWidths.set(key, width)
  return width
}

function codeColumnX(host: UiSurface, line: string, column: number, fontPx: number): number {
  return host.measureText(expandCodeTabs(line.slice(0, Math.max(0, Math.min(line.length, column)))), fontPx)
}

function codePositionFromPoint(
  host: UiSurface,
  state: CodeEditorState,
  localX: number,
  localY: number,
  layout: Readonly<{
    codeStartX: number
    viewportY: number
    scrollTop: number
    fontPx: number
    linePx: number
  }>,
): TextPosition {
  const lineIndex = Math.max(0, Math.min(
    state.lines.length - 1,
    Math.floor((localY - layout.viewportY + layout.scrollTop) / layout.linePx),
  ))
  const line = state.lines[lineIndex] ?? ""
  const x = Math.max(0, localX - layout.codeStartX)
  let low = 0
  let high = line.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    const before = codeColumnX(host, line, middle, layout.fontPx)
    const after = codeColumnX(host, line, middle + 1, layout.fontPx)
    const boundary = before + (after - before) / 2
    if (x < boundary) high = middle
    else low = middle + 1
  }
  return {line: lineIndex, col: low}
}

function drawCodeLine(
  host: UiSurface,
  state: CodeEditorState,
  line: string,
  lineIndex: number,
  startX: number,
  y: number,
  maxPx: number,
  fontPx: number,
  linePx: number,
): void {
  if (line.length === 0) return
  const tokens = state.tokens[lineIndex] ?? []
  const columnX = (column: number) => codeColumnX(host, line, column, fontPx)
  if (tokens.length === 0) {
    renderCodeTextRuns({
      surface: host,
      text: line,
      startX,
      y,
      fontPx,
      material: state.materials.get("d") ?? host.materials.text,
      maxPx,
      columnX,
    })
    return
  }
  renderCodeTokenizedLine({
    surface: host,
    text: line,
    tokens,
    startX,
    y,
    fontPx,
    maxPx,
    materials: state.materials,
    fallbackMaterial: state.materials.get("d") ?? host.materials.text,
    chunkX: columnX,
    chunkWidth: (start, end) => columnX(end) - columnX(start),
    drawTokenBackground: (_tokenX, tokenY, _tokenW, _tokenH, bg, slotX, slotW) => {
      const swatchWidth = Math.max(2, Math.floor(slotW - 2))
      if (swatchWidth < 2) return
      const swatchX = Math.round(slotX + Math.max(1, Math.floor((slotW - swatchWidth) / 2)))
      const swatchY = Math.round(tokenY - (linePx - fontPx) / 2)
      host.drawRect(swatchX - 1, swatchY, swatchWidth + 2, linePx, palette.borderDim, Z.CONTAINER)
      host.drawRect(swatchX, swatchY + 1, swatchWidth, Math.max(1, linePx - 2), cssColor(bg as CssColor), Z.ELEMENT)
    },
  })
}

function drawCodeLineNumber(
  host: UiSurface,
  lineNumber: number,
  gutterX: number,
  rowY: number,
  gutterWidth: number,
  linePx: number,
  fontPx: number,
): void {
  const label = String(lineNumber)
  const labelWidth = host.measureText(label, fontPx)
  host.drawText(label, gutterX + gutterWidth - GUTTER_SIDE_PAD_PX - labelWidth, rowY + Math.max(0, (linePx - fontPx) / 2), {
    fontPx,
    material: textMaterial(host, rgba8ToColor(uiTheme.spaceText.lineNumbers)),
    maxWidthPx: gutterWidth - GUTTER_SIDE_PAD_PX * 2,
    fit: false,
    measure: false,
  })
}

function drawCodeSelection(
  host: UiSurface,
  line: string,
  lineIndex: number,
  range: TextSelectionRange,
  codeStartX: number,
  rowY: number,
  linePx: number,
  fontPx: number,
): void {
  if (lineIndex < range.start.line || lineIndex > range.end.line) return
  const startColumn = lineIndex === range.start.line ? range.start.col : 0
  const endColumn = lineIndex === range.end.line ? range.end.col : line.length
  const includesLineBreak = lineIndex < range.end.line
  if (endColumn <= startColumn && !includesLineBreak) return
  const startX = codeStartX + codeColumnX(host, line, startColumn, fontPx)
  const endX = codeStartX + codeColumnX(host, line, endColumn, fontPx)
  const lineBreakWidth = includesLineBreak ? Math.max(2, host.measureText("M", fontPx) * 0.45) : 0
  host.drawRect(
    startX,
    rowY,
    Math.max(1, endX - startX + lineBreakWidth),
    linePx,
    rgba8ToColor(uiTheme.spaceText.selection),
    Z.TEXT - 0.01,
  )
}

function emitCodeSelection(props: CodeEditorProps, state: CodeEditorState): void {
  const range = orderedTextSelection(state.anchor, state.focus)
  if (range === null || state.anchor === null || state.focus === null) {
    props.onSelectionChange?.(null)
    return
  }
  props.onSelectionChange?.(Object.freeze({
    anchor: codeEditorPosition(state.anchor),
    focus: codeEditorPosition(state.focus),
    range: Object.freeze({
      start: codeEditorPosition(range.start),
      end: codeEditorPosition(range.end),
    }),
    text: textFromRange(state.lines, range) ?? "",
  }))
}

function codeEditorPosition(position: TextPosition): CodeEditorPosition {
  return Object.freeze({line: position.line, column: position.col})
}

function expandCodeTabs(text: string): string {
  let column = 0
  let expanded = ""
  for (const character of text) {
    if (character === "\t") {
      const count = TAB_COLUMNS - (column % TAB_COLUMNS)
      expanded += " ".repeat(count)
      column += count
    } else {
      expanded += character
      column++
    }
  }
  return expanded
}
