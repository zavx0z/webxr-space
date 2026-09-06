import {expect, test} from "bun:test"
import {buildCodeEditorViewModel} from "../src/code-editor/model.ts"
import {codeEditorPaintRuns} from "../src/code-editor/paint-runs.ts"
import {codeEditorSyntaxTheme, resolveCodeEditorSyntaxScopeColorHex} from "../src/code-editor/syntax-theme-runtime.ts"

test("presentation coalesces equal colors without merging or mutating lexical tokens", () => {
  const tokens = [[{s: 0, e: 3, c: "k", fg: "#ABC"}, {s: 3, e: 6, c: "d", fg: "#aabbcc"}]]
  const before = JSON.stringify(tokens)
  const model = buildCodeEditorViewModel({value: "abcdef", readOnly: true, tokens})
  const segments = model.segments[0]!
  const runs = codeEditorPaintRuns(segments)
  expect(segments.map(segment => segment.category)).toEqual(["k", "d"])
  expect(runs).toEqual([{key: "run:0:6", start: 0, end: 6, text: "abcdef", foreground: "#aabbcc"}])
  expect(codeEditorPaintRuns(segments)).toBe(runs)
  expect(JSON.stringify(tokens)).toBe(before)
})

test("background swatches and distinct foregrounds remain separate paint ranges", () => {
  const model = buildCodeEditorViewModel({value: "abc", readOnly: true, tokens: [[
    {s: 0, e: 1, c: "s", fg: "#112233"},
    {s: 1, e: 2, c: "s", fg: "#112233", bg: "#ffffff"},
    {s: 2, e: 3, c: "s", fg: "#445566", bg: "#ffffff"},
  ]]})
  expect(codeEditorPaintRuns(model.segments[0]!)).toHaveLength(3)
  expect(codeEditorPaintRuns(model.segments[0]!)[1]?.background).toBe("#ffffff")
})

test("explicit foreground is not turned into inherited text even when it equals the default color", () => {
  const model = buildCodeEditorViewModel({value: "plain gap", readOnly: true, tokens: [[{s: 0, e: 5, c: "plain", fg: "#bcbec4"}]]})
  const runs = codeEditorPaintRuns(model.segments[0]!)
  expect(runs).toHaveLength(2)
  expect(runs[0]?.inheritForeground).toBeUndefined()
  expect(runs[1]?.inheritForeground).toBe(true)
})

test("cached scope resolution preserves exact-first selector and rule precedence", () => {
  const scopes = codeEditorSyntaxTheme.tokenColors.flatMap(rule =>
    (typeof rule.scope === "string" ? [rule.scope] : rule.scope).flatMap(scope => scope.split(",").map(value => value.trim())))
  const reference = (selectors: readonly string[]) => {
    for (const exact of [true, false]) for (const selector of selectors) {
      for (let index = codeEditorSyntaxTheme.tokenColors.length - 1; index >= 0; index--) {
        const rule = codeEditorSyntaxTheme.tokenColors[index]!
        const parts = (typeof rule.scope === "string" ? [rule.scope] : rule.scope)
          .flatMap(scope => scope.split(",").map(value => value.trim()).filter(Boolean))
        if (parts.some(scope => scope === selector || scope.split(/\\s+|>/u).some(value => {
          const part = value.trim()
          return part === selector || !exact && (part.startsWith(`${selector}.`) || selector.startsWith(`${part}.`))
        }))) return rule.settings.foreground.toLowerCase()
      }
    }
    return "#123456"
  }
  for (const scope of [...scopes, "unknown.test", "comment.custom", "keyword.control.custom"]) {
    for (const selectors of [[scope], ["unknown.test", scope], [scope, "string"]]) {
      const expected = reference(selectors)
      expect(resolveCodeEditorSyntaxScopeColorHex(selectors, "#123456")).toBe(expected)
      expect(resolveCodeEditorSyntaxScopeColorHex(selectors, "#123456")).toBe(expected)
    }
  }
  expect(resolveCodeEditorSyntaxScopeColorHex(["unknown"], "#ffffff")).toBe("#ffffff")
  expect(resolveCodeEditorSyntaxScopeColorHex(["unknown"], "#000000")).toBe("#000000")
})
