export type TerminalRun = Readonly<{text: string; color?: string; background?: string; bold?: boolean}>
export type TerminalLine = Readonly<{id: string; runs: readonly TerminalRun[]}>
export type TerminalSnapshot = Readonly<{revision: number; lines: readonly TerminalLine[]}>
export type TerminalQueryMode = "all" | "cursor" | "none"
export type TerminalModelOptions = Readonly<{maxLines?: number; queryMode?: TerminalQueryMode; onReply?(data: string): void}>

type CellStyle = Readonly<{foreground: string | null; background: string | null; bold: boolean}>
type Cell = Readonly<{character: string; style: CellStyle}>
const normal: CellStyle = Object.freeze({foreground: null, background: null, bold: false})
const colors = Object.freeze(["#0b0f16", "#ff5a5f", "#5fcb6b", "#f6c453", "#4aa3ff", "#c678dd", "#56d4dd", "#d7dde7"])

/** Bounded ANSI text state without process, DOM, clipboard or rendering ownership. */
export class TerminalModel {
  #cells: Cell[][] = [[]]
  #row = 0
  #column = 0
  #style = normal
  #sequence = ""
  #escape = false
  #offset = 0
  #revision = 0
  #maxLines: number
  #queryMode: TerminalQueryMode
  #reply: ((data: string) => void) | undefined
  #decoder = new TextDecoder()
  #listeners = new Set<() => void>()
  #snapshot: TerminalSnapshot = Object.freeze({revision: 0, lines: Object.freeze([{id: "0", runs: Object.freeze([])}])})

  constructor(options: TerminalModelOptions = {}) {
    this.#maxLines = options.maxLines ?? 40
    if (!Number.isSafeInteger(this.#maxLines) || this.#maxLines < 1) throw new RangeError("Terminal maxLines must be a positive integer")
    this.#queryMode = options.queryMode ?? "all"
    this.#reply = options.onReply
  }

  get snapshot(): TerminalSnapshot { return this.#snapshot }
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }
  setQueryMode(mode: TerminalQueryMode): void { this.#queryMode = mode }
  toText(): string { return this.#cells.map(line => line.map(cell => cell.character).join("").trimEnd()).join("\n").replace(/\n+$/u, "") }
  writeln(line = ""): void { this.write(`${line}\r\n`) }
  clear(): void {
    this.#cells = [[]]
    this.#row = this.#column = 0
    this.#offset = 0
    this.#style = normal
    this.#sequence = ""
    this.#escape = false
    this.#decoder = new TextDecoder()
    this.#publish()
  }
  write(data: string | Uint8Array): void {
    const text = typeof data === "string" ? data : this.#decoder.decode(data, {stream: true})
    if (text.length === 0) return
    for (const character of text) {
      if (this.#escape) {
        this.#sequence += character
        if (this.#sequence.length > 256) { this.#sequence = ""; this.#escape = false; continue }
        if (this.#sequence.length > 1 && /[@-~]/u.test(character)) {
          this.#csi(this.#sequence)
          this.#sequence = ""
          this.#escape = false
        }
        continue
      }
      if (character === "\x1b") { this.#escape = true; this.#sequence = ""; continue }
      if (character === "\r") { this.#column = 0; continue }
      if (character === "\n") { this.#row++; this.#line(); continue }
      if (character === "\b") { this.#column = Math.max(0, this.#column - 1); continue }
      if (character === "\t") {
        const spaces = 4 - this.#column % 4
        for (let index = 0; index < spaces; index++) this.#put(" ")
        continue
      }
      if ((character.codePointAt(0) ?? 0) >= 32) this.#put(character)
    }
    this.#trim()
    this.#publish()
  }

  #line(): Cell[] {
    // Trim before allocating: input streams cannot allocate unbounded scrollback.
    const overflow = Math.max(0, this.#row - this.#maxLines + 1)
    if (overflow > 0) {
      this.#cells.splice(0, Math.min(this.#cells.length, overflow))
      this.#offset += overflow
      this.#row -= overflow
    }
    while (this.#cells.length <= this.#row) this.#cells.push([])
    return this.#cells[this.#row]!
  }
  #put(character: string): void {
    const line = this.#line()
    while (line.length < this.#column) line.push({character: " ", style: normal})
    line[this.#column++] = {character, style: this.#style}
  }
  #trim(): void {
    const overflow = this.#cells.length - this.#maxLines
    if (overflow > 0) {
      this.#cells.splice(0, overflow)
      this.#offset += overflow
      this.#row = Math.max(0, this.#row - overflow)
    }
  }
  #csi(sequence: string): void {
    if (sequence[0] !== "[") return
    const final = sequence.at(-1)
    const body = sequence.slice(1, -1).replace(/^\?/u, "")
    const params = body === "" ? [0] : body.split(";").map(value => Number(value || 0))
    const count = Math.min(this.#maxLines, Math.max(1, params[0] || 1))
    if (final === "m") { this.#style = sgr(this.#style, params); return }
    if (final === "K") {
      const line = this.#line()
      if (params[0] === 2) line.length = 0
      else if (params[0] === 1) for (let index = 0; index <= this.#column && index < line.length; index++) line[index] = {character: " ", style: normal}
      else line.length = Math.min(line.length, this.#column)
    } else if (final === "J" && params[0] === 2) {
      this.#cells = [[]]
      this.#row = this.#column = this.#offset = 0
    } else if (final === "H" || final === "f") {
      this.#row = count - 1
      this.#column = Math.min(100_000, Math.max(0, (params[1] || 1) - 1))
    } else if (final === "G") this.#column = Math.min(100_000, Math.max(0, (params[0] || 1) - 1))
    else if (final === "A") this.#row = Math.max(0, this.#row - count)
    else if (final === "B") this.#row += count
    else if (final === "C") this.#column = Math.min(100_000, this.#column + (params[0] || 1))
    else if (final === "D") this.#column = Math.max(0, this.#column - (params[0] || 1))
    else if (final === "n" && this.#queryMode !== "none") {
      if (params[0] === 6) this.#reply?.(`\x1b[${this.#row + 1};${this.#column + 1}R`)
      else if (params[0] === 5 && this.#queryMode === "all") this.#reply?.("\x1b[0n")
    } else if (final === "c" && this.#queryMode === "all") this.#reply?.("\x1b[?1;2c")
    this.#line()
  }
  #publish(): void {
    const previous = new Map(this.#snapshot.lines.map(line => [line.id, line]))
    const lines = this.#cells.map((cells, index): TerminalLine => {
      const id = String(this.#offset + index)
      const runs: TerminalRun[] = []
      for (let offset = 0; offset < cells.length;) {
        const style = cells[offset]!.style
        let text = ""
        do { text += cells[offset++]!.character } while (offset < cells.length && sameStyle(style, cells[offset]!.style))
        runs.push(Object.freeze({text, ...(style.foreground === null ? {} : {color: style.foreground}),
          ...(style.background === null ? {} : {background: style.background}), ...(style.bold ? {bold: true} : {})}))
      }
      const old = previous.get(id)
      if (old && old.runs.length === runs.length && old.runs.every((run, index) => {
        const next = runs[index]!
        return run.text === next.text && run.color === next.color && run.background === next.background && run.bold === next.bold
      })) return old
      return Object.freeze({id, runs: Object.freeze(runs)})
    })
    this.#snapshot = Object.freeze({revision: ++this.#revision, lines: Object.freeze(lines)})
    for (const listener of [...this.#listeners]) listener()
  }
}

function sameStyle(left: CellStyle, right: CellStyle): boolean {
  return left.foreground === right.foreground && left.background === right.background && left.bold === right.bold
}
function sgr(current: CellStyle, params: readonly number[]): CellStyle {
  let next = {...current}
  for (const code of params.length ? params : [0]) {
    if (code === 0) next = {...normal}
    else if (code === 1) next.bold = true
    else if (code === 22) next.bold = false
    else if (code === 39) next.foreground = null
    else if (code === 49) next.background = null
    else if (code >= 30 && code <= 37) next.foreground = colors[code - 30]!
    else if (code >= 40 && code <= 47) next.background = colors[code - 40]!
    else if (code >= 90 && code <= 97) next.foreground = brighten(colors[code - 90]!)
    else if (code >= 100 && code <= 107) next.background = brighten(colors[code - 100]!)
  }
  return Object.freeze(next)
}
function brighten(color: string): string {
  return `#${[1, 3, 5].map(offset => Math.min(255, parseInt(color.slice(offset, offset + 2), 16) + 48).toString(16).padStart(2, "0")).join("")}`
}

export function createTerminalModel(options: TerminalModelOptions = {}): TerminalModel { return new TerminalModel(options) }
