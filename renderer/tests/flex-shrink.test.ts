import {describe, expect, test} from "bun:test"
import {createDocument} from "../../dom/src/index.ts"
import {createDocumentRenderer} from "../src/index.ts"

type Item = Readonly<{
  size: number
  minimum?: number | string
  shrink?: number
  padding?: number
  border?: number
  margin?: number
  boxSizing?: "content-box" | "border-box"
}>

type Case = Readonly<{
  name: string
  available: number
  items: readonly Item[]
  expected: readonly number[]
  overflow?: number
  gap?: number
  exact?: boolean
}>

// Shrink weights use the original inner bases; minimum violations freeze items.
// https://www.w3.org/TR/css-flexbox-1/#resolve-flexible-lengths
const cases: readonly Case[] = [
  {
    name: "freezes the explicit minimum in the reported 520px reproduction",
    available: 520,
    items: [{size: 42, minimum: 42}, {size: 520, minimum: 0}],
    expected: [42, 478],
    exact: true,
  },
  {
    name: "redistributes with original weights after a minimum is reached",
    available: 330,
    items: [{size: 200, minimum: 190}, {size: 100, minimum: 0}, {size: 100, minimum: 0, shrink: 2}],
    expected: [190, 80, 60],
  },
  {
    name: "freezes successive minima without leaving a residual deficit",
    available: 210,
    items: [{size: 100, minimum: 90}, {size: 100, minimum: 65}, {size: 100, minimum: 0}],
    expected: [90, 65, 55],
  },
  {
    name: "keeps zero-shrink items unchanged",
    available: 200,
    items: [{size: 80, minimum: 0, shrink: 0}, {size: 240, minimum: 0}],
    expected: [80, 120],
  },
  {
    name: "preserves real overflow when minima cannot fit",
    available: 140,
    items: [{size: 120, minimum: 90}, {size: 100, minimum: 80}],
    expected: [90, 80],
    overflow: 30,
  },
  {
    name: "continues to respect the existing automatic minimum",
    available: 180,
    items: [{size: 100}, {size: 200, minimum: 0}],
    expected: [100, 80],
  },
  {
    name: "fits fractional dimensions without manufacturing a scrollbar",
    available: 520.25,
    items: [{size: 42.125, minimum: 42.125}, {size: 520.25, minimum: 0}],
    expected: [42.125, 478.125],
  },
  {
    name: "does not hide a genuinely small minimum overflow",
    available: 520,
    items: [{size: 42.0001, minimum: 42.0001}, {size: 520, minimum: 478}],
    expected: [42.0001, 478],
    overflow: 0.0001,
  },
  {
    name: "reserves gaps and margins before distributing shrink",
    available: 200,
    gap: 10,
    items: [{size: 42, minimum: 42, margin: 2}, {size: 200, minimum: 0, margin: 3}],
    expected: [42, 138],
  },
  {
    name: "resolves percentage minima against the main-axis viewport",
    available: 200,
    items: [{size: 100, minimum: "40%"}, {size: 200, minimum: 0}],
    expected: [80, 120],
  },
  {
    name: "uses inner bases for differently padded content boxes",
    available: 300,
    items: [
      {size: 100, minimum: 80, padding: 10, border: 1},
      {size: 100, minimum: 0, border: 1},
      {size: 100, minimum: 0, padding: 20, border: 1},
    ],
    expected: [102, 79, 119],
  },
  {
    name: "does not shrink border boxes below their padding and border",
    available: 70,
    items: [
      {size: 80, minimum: 60, padding: 10, border: 1, boxSizing: "border-box"},
      {size: 160, minimum: 0, padding: 10, border: 1, boxSizing: "border-box"},
    ],
    expected: [60, 22],
    overflow: 12,
  },
  {
    name: "retains partial shrink factors after freezing a minimum",
    available: 100,
    items: [{size: 100, minimum: 90, shrink: 0.25}, {size: 100, minimum: 0, shrink: 0.25}],
    expected: [90, 75],
    overflow: 65,
  },
]

for (const direction of ["row", "column"] as const) {
  describe(`flex-shrink ${direction}`, () => {
    for (const scenario of cases) {
      test(scenario.name, () => {
        const document = createDocument()
        const container = document.createElement("div")
        const row = direction === "row"
        const axis = row ? "width" : "height"
        const cross = row ? "height" : "width"
        container.setAttribute("style", [
          "display:flex",
          `flex-direction:${direction}`,
          `${axis}:${scenario.available}px`,
          `${cross}:100px`,
          `gap:${scenario.gap ?? 0}px`,
          "overflow:auto",
        ].join(";"))
        const items = scenario.items.map(item => {
          const element = document.createElement("div")
          element.setAttribute("style", [
            `${axis}:${item.size}px`,
            `${cross}:10px`,
            `box-sizing:${item.boxSizing ?? "content-box"}`,
            `padding:${item.padding ?? 0}px`,
            `border:${item.border ?? 0}px solid #fff`,
            `margin:${item.margin ?? 0}px`,
            `flex-shrink:${item.shrink ?? 1}`,
            ...(item.minimum === undefined ? [] : [
              `min-${axis}:${typeof item.minimum === "number" ? `${item.minimum}px` : item.minimum}`,
            ]),
          ].join(";"))
          container.append(element)
          return element
        })
        document.append(container)
        const renderer = createDocumentRenderer({
          document,
          root: container,
          viewport: {width: 1000, height: 1000},
        })
        try {
          const frame = renderer.flush()
          for (const [index, item] of items.entries()) {
            const actual = frame.boxByNode.get(item)?.[axis]
            if (scenario.exact) expect(actual).toBe(scenario.expected[index])
            else expect(actual).toBeCloseTo(scenario.expected[index]!, 9)
          }
          const scroll = frame.scrolls.get(container)!
          const overflow = row ? scroll.maxScrollLeft : scroll.maxScrollTop
          const expectedOverflow = scenario.overflow ?? 0
          if (expectedOverflow === 0) expect(overflow).toBe(0)
          else {
            expect(overflow).toBeGreaterThan(0)
            expect(overflow).toBeCloseTo(expectedOverflow, 9)
          }
          const hasScrollbar = frame.displayList.some(item =>
            item.node === container && item.key === `ua:scrollbar-${row ? "x" : "y"}-thumb`,
          )
          expect(hasScrollbar).toBe(expectedOverflow > 0)
        } finally {
          renderer.dispose()
        }
      })
    }
  })
}
