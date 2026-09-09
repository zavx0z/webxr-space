import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentInteractionController, createDocumentRenderer} from "../src/index.ts"

// Deliberately proportional metrics: equal character counts have different widths.
const measure = (text: string) => Array.from(text).reduce((width, char) =>
  width + (char === "W" ? 13 : char === "i" ? 2 : char === " " ? 3 : 7), 0)

function fixture(title: string, width = 320, height = 160) {
  const document = createDocument()
  const root = document.createElement("button")
  root.title = title
  root.setAttribute("style", "width: 100px; height: 24px")
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width, height}})
  const interaction = createDocumentInteractionController({
    document,
    textMeasurer: {measureTextAdvance: measure},
  })
  const frame = renderer.flush()
  interaction.pointerMove(frame, {clientX: 10, clientY: 10, timeStamp: 0})
  return {root, interaction, frame, dispose() {
    interaction.dispose()
    renderer.dispose()
  }}
}

test("title uses measured proportional text with equal padding and opaque rounded background", () => {
  for (const title of ["iiii", "WWWW", "WebXR", "External Storybook", "Компоненты"]) {
    const f = fixture(title)
    try {
      expect(f.interaction.composeFrame(f.frame, 499)).toBe(f.frame)
      const frame = f.interaction.composeFrame(f.frame, 500)
      const background = frame.displayList.find(item => item.key === "ua:title-background")!
      const text = frame.displayList.find(item => item.key === "ua:title-text:0")!
      expect(background.kind).toBe("rect")
      expect(text.kind).toBe("text")
      if (background.kind !== "rect" || text.kind !== "text") throw new Error("Missing tooltip paint")
      expect(background.width).toBe(measure(title) + 16)
      expect(text.x - background.x).toBe(8)
      expect(background.x + background.width - text.x - measure(title)).toBe(8)
      expect(background.color).toBe("#111827")
      expect(background.border.radii).toEqual({topLeft: 3, topRight: 3, bottomLeft: 3, bottomRight: 3})
      expect(f.interaction.composeFrame(f.frame, 501)).toBe(frame)
      f.root.title = ""
      expect(f.interaction.composeFrame(f.frame, 502)).toBe(f.frame)
    } finally { f.dispose() }
  }
})

test("title wraps measured words and truncates height without overflowing the viewport", () => {
  const f = fixture("WWWW WWWW iiiiiiiiiiiiiiii 😀😀😀😀", 70, 60)
  try {
    const frame = f.interaction.composeFrame(f.frame, 500)
    const tooltip = f.interaction.tooltip!
    expect(tooltip.lines.length).toBe(2)
    expect(tooltip.lines.at(-1)).toEndWith("…")
    for (const line of tooltip.lines) expect(measure(line)).toBeLessThanOrEqual(46)
    expect(tooltip.x).toBeGreaterThanOrEqual(4)
    expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(66)
    expect(tooltip.y + tooltip.height).toBeLessThanOrEqual(56)
    expect(frame.displayList.filter(item => item.key.startsWith("ua:title-text:")).length).toBe(2)
  } finally { f.dispose() }
})

test("title keeps narrow glyphs on one line and does not split Unicode code points", () => {
  for (const title of ["iiiiiiiiiiiiiiii", "😀😀😀😀😀😀😀😀"]) {
    const f = fixture(title, 70)
    try {
      f.interaction.composeFrame(f.frame, 500)
      const lines = f.interaction.tooltip!.lines
      expect(lines.join("")).toBe(title)
      expect(lines[0]).toBe(title.startsWith("i") ? title : "😀😀😀😀😀😀")
    } finally { f.dispose() }
  }
})

test("title does not emit invalid geometry when the viewport cannot fit its padding", () => {
  const f = fixture("WebXR", 16, 16)
  try {
    expect(f.interaction.composeFrame(f.frame, 500)).toBe(f.frame)
    expect(f.interaction.tooltip).toBeNull()
  } finally { f.dispose() }
})
