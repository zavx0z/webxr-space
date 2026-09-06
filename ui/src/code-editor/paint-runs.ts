import type {CodeEditorSegment} from "./model.ts"

export type CodeEditorPaintRun = Readonly<{
  key: string
  start: number
  end: number
  text: string
  foreground: string
  background?: string | undefined
  category?: string | undefined
  inheritForeground?: true | undefined
}>

const cache = new WeakMap<readonly CodeEditorSegment[], readonly CodeEditorPaintRun[]>()

/** Coalesces presentation only. Original token categories and ranges stay in the model. */
export function codeEditorPaintRuns(segments: readonly CodeEditorSegment[]): readonly CodeEditorPaintRun[] {
  const cached = cache.get(segments)
  if (cached !== undefined) return cached
  const runs: CodeEditorPaintRun[] = []
  let start = 0
  while (start < segments.length) {
    const first = segments[start]!
    let end = start + 1
    let category: string | undefined = first.category
    while (end < segments.length) {
      const next = segments[end]!
      if (segments[end - 1]!.end !== next.start || next.foreground !== first.foreground || next.background !== first.background ||
        next.inheritForeground !== first.inheritForeground) break
      if (category !== next.category) category = undefined
      end++
    }
    const last = segments[end - 1]!
    runs.push(Object.freeze({
      key: `run:${first.start}:${last.end}`,
      start: first.start,
      end: last.end,
      text: segments.slice(start, end).map(segment => segment.text).join(""),
      foreground: first.foreground,
      ...(first.inheritForeground === true ? {inheritForeground: true as const} : {}),
      ...(first.background === undefined ? {} : {background: first.background}),
      ...(category === undefined ? {} : {category}),
    }))
    start = end
  }
  const result = Object.freeze(runs)
  if (Object.isFrozen(segments)) cache.set(segments, result)
  return result
}
