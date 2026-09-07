export type InlineInput<Owner> = Readonly<{
  owner: Owner
  kind: "text" | "box" | "break"
  text: string
  whiteSpace: "normal" | "nowrap" | "pre"
  width: number
  height: number
  baseline?: number
}>

export type InlineFragment<Owner> = Readonly<{
  owner: Owner
  kind: "text" | "box" | "break"
  text: string
  /** DOM UTF-16 boundary for every emitted UTF-16 boundary, before whitespace processing. */
  sourceOffsets: readonly number[]
  x: number
  y: number
  width: number
  height: number
  line: number
}>

export type InlinePlan<Owner> = Readonly<{
  width: number
  height: number
  fragments: readonly InlineFragment<Owner>[]
}>

type Piece<Owner> = {input: InlineInput<Owner>; text: string; width: number; sourceOffsets: number[]}
type Group<Owner> = {pieces: Piece<Owner>[]; gap: Piece<Owner> | null; breakBefore: boolean; hardBreak: boolean}

/** Builds shared line boxes without splitting words at semantic element boundaries. */
export function layoutInlineFlow<Owner>(
  inputs: readonly InlineInput<Owner>[],
  width: number,
  strut: number,
  align: "left" | "start" | "right" | "end" | "center",
  advance: (owner: Owner, text: string) => number,
  strutBaseline = strut * 0.8,
): InlinePlan<Owner> {
  const groups: Group<Owner>[] = []
  let current: Group<Owner> = {pieces: [], gap: null, breakBefore: false, hardBreak: false}
  let pending: {piece: Piece<Owner>; breakable: boolean} | null = null
  const commit = () => {
    if (current.pieces.length > 0 || current.hardBreak) groups.push(current)
    current = {pieces: [], gap: null, breakBefore: false, hardBreak: false}
  }
  const append = (input: InlineInput<Owner>, text: string, sourceOffsets: number[] = [0]) => {
    const previous = current.pieces.at(-1)
    if (previous?.input === input && input.kind === "text") {
      previous.text += text
      previous.sourceOffsets.push(...sourceOffsets.slice(1))
      previous.width = advance(input.owner, previous.text)
    } else {
      current.pieces.push({input, text, sourceOffsets, width: input.kind === "text" ? advance(input.owner, text) : input.width})
    }
  }
  const flushSpace = () => {
    if (pending === null) return
    if (pending.breakable) {
      commit()
      current.gap = pending.piece
      current.breakBefore = true
    } else if (current.pieces.length > 0 || groups.length > 0) {
      append(pending.piece.input, " ", pending.piece.sourceOffsets)
    }
    pending = null
  }
  for (const input of inputs) {
    if (input.kind === "break") {
      pending = null
      append(input, "")
      current.hardBreak = true
      commit()
      continue
    }
    if (input.kind === "box") {
      flushSpace()
      const gap = current.gap
      commit()
      current.gap = gap
      current.breakBefore = input.whiteSpace === "normal"
      append(input, "")
      commit()
      current.breakBefore = input.whiteSpace === "normal"
      continue
    }
    if (input.whiteSpace === "pre") {
      flushSpace()
      const lines = input.text.split(/\r\n|\r|\n/u)
      let sourceOffset = 0
      for (const [index, text] of lines.entries()) {
        if (index > 0) {
          current.hardBreak = true
          commit()
        }
        if (text.length > 0) append(input, text, Array.from({length: text.length + 1}, (_, offset) => sourceOffset + offset))
        sourceOffset += text.length
        if (input.text[sourceOffset] === "\r" && input.text[sourceOffset + 1] === "\n") sourceOffset += 2
        else if (sourceOffset < input.text.length) sourceOffset++
      }
      continue
    }
    for (const match of input.text.matchAll(/[^\t\n\f\r ]+|[\t\n\f\r ]+/gu)) {
      if (/^[\t\n\f\r ]/u.test(match[0])) {
        pending ??= {piece: {input, text: " ", sourceOffsets: [match.index, match.index + match[0].length], width: advance(input.owner, " ")}, breakable: input.whiteSpace === "normal"}
      } else {
        flushSpace()
        append(input, match[0], Array.from({length: match[0].length + 1}, (_, offset) => match.index + offset))
      }
    }
  }
  commit()

  const fragments: InlineFragment<Owner>[] = []
  let linePieces: Array<{piece: Piece<Owner>; x: number}> = []
  let x = 0
  let y = 0
  let line = 0
  let maximum = 0
  const appendToLine = (piece: Piece<Owner>) => {
    const previous = linePieces.at(-1)
    if (previous?.piece.input.owner === piece.input.owner &&
      previous.piece.input.kind === "text" && piece.input.kind === "text") {
      const text = previous.piece.text + piece.text
      const measured = advance(piece.input.owner, text)
      x += measured - previous.piece.width
      previous.piece = {input: piece.input, text, width: measured, sourceOffsets: [...previous.piece.sourceOffsets, ...piece.sourceOffsets.slice(1)]}
    } else {
      linePieces.push({piece, x})
      x += piece.width
    }
  }
  const prospectiveWidth = (pieces: readonly Piece<Owner>[]) => {
    let total = x
    let tail = linePieces.at(-1)?.piece
    for (const piece of pieces) {
      if (tail?.input.owner === piece.input.owner && tail.input.kind === "text" && piece.input.kind === "text") {
        const text = tail.text + piece.text
        const measured = advance(piece.input.owner, text)
        total += measured - tail.width
        tail = {input: piece.input, text, width: measured, sourceOffsets: []}
      } else {
        total += piece.width
        tail = piece
      }
    }
    return total
  }
  const finishLine = (forced = false) => {
    if (linePieces.length === 0 && !forced) return
    const baseline = linePieces.reduce((maximum, {piece}) => Math.max(maximum, piece.input.baseline ?? piece.input.height), strutBaseline)
    const descent = linePieces.reduce((maximum, {piece}) => Math.max(maximum, piece.input.height - (piece.input.baseline ?? piece.input.height)), strut - strutBaseline)
    const height = baseline + descent
    const free = Math.max(0, width - x)
    const offset = align === "center" ? free / 2 : align === "right" || align === "end" ? free : 0
    for (const {piece, x: left} of linePieces) {
      fragments.push(Object.freeze({
        owner: piece.input.owner,
        kind: piece.input.kind,
        text: piece.text,
        sourceOffsets: Object.freeze(piece.sourceOffsets),
        x: left + offset,
        y: y + baseline - (piece.input.baseline ?? piece.input.height),
        width: piece.width,
        height: piece.input.height,
        line,
      }))
    }
    maximum = Math.max(maximum, x)
    y += height
    line += 1
    x = 0
    linePieces = []
  }
  for (const group of groups) {
    const pieces = x > 0 && group.gap !== null ? [group.gap, ...group.pieces] : group.pieces
    if (x > 0 && group.breakBefore && prospectiveWidth(pieces) > width) finishLine()
    if (x > 0 && group.gap !== null) appendToLine(group.gap)
    for (const piece of group.pieces) appendToLine(piece)
    if (group.hardBreak) finishLine(true)
  }
  finishLine()
  if (groups.at(-1)?.hardBreak && inputs.at(-1)?.whiteSpace === "pre") finishLine(true)
  return Object.freeze({width: maximum, height: y, fragments: Object.freeze(fragments)})
}
