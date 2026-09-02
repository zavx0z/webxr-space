import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const uiRoot = resolve(import.meta.dir, "..")
const root = resolve(uiRoot, "..")

Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [uiRoot],
}))

const [
  {checkboxFieldLayout},
  {collectionFieldLayout},
  {colorFieldLayout},
  {colorPickerFieldLayout},
  {cycleFieldLayout},
  {fieldGroupLayout},
  {matrixFieldLayout},
  {numberFieldLayout},
  {pathFieldLayout},
  {referenceFieldLayout},
  {selectFieldLayout},
  {sliderFieldLayout},
  {switchFieldLayout},
  {textFieldLayout},
  {vectorFieldLayout},
  {toggleButtonGroupLayout},
] = await Promise.all([
  import("../fields/checkbox-field.tsx"),
  import("../fields/collection-field.tsx"),
  import("../fields/color-field.tsx"),
  import("../fields/color-picker-field.tsx"),
  import("../fields/cycle-field.tsx"),
  import("../fields/field-group.tsx"),
  import("../fields/matrix-field.tsx"),
  import("../fields/number-field.tsx"),
  import("../fields/path-field.tsx"),
  import("../fields/reference-field.tsx"),
  import("../fields/select-field.tsx"),
  import("../fields/slider-field.tsx"),
  import("../fields/switch-field.tsx"),
  import("../fields/text-field.tsx"),
  import("../fields/vector-field.tsx"),
  import("../buttons/toggle-button-group.tsx"),
])

test("[UI-005] числовая тема полей и CSS содержат один набор точных метрик", async () => {
  const metrics = await Bun.file(resolve(uiRoot, "themes/field-metrics.json")).json() as Record<string, number>
  const theme = await Bun.file(resolve(uiRoot, "themes/theme.css")).text()
  const cssMetrics = new Map(
    [...theme.matchAll(/--(field-[a-z0-9-]+):\s*([0-9]+)(px)?;/gu)].map(match => [
      match[1]!,
      Object.freeze({value: Number(match[2]), unit: match[3] ?? ""}),
    ])
  )

  expect([...cssMetrics.keys()].sort()).toEqual(Object.keys(metrics).sort())
  for (const [name, value] of Object.entries(metrics)) {
    expect(Number.isFinite(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(cssMetrics.get(name)?.value).toBe(value)
    expect(cssMetrics.get(name)?.unit).toBe(name.endsWith("-count") ? "" : "px")
  }
})

describe("[UI-006] простые поля заранее сообщают свою точную внешнюю высоту", () => {
  test("однострочные значения", () => {
    expect(numberFieldLayout.height()).toBe(22)
    expect(textFieldLayout.height()).toBe(22)
    expect(textFieldLayout.height({label: true})).toBe(28)
    expect(sliderFieldLayout.height()).toBe(28)
    expect(sliderFieldLayout.height({density: "compact"})).toBe(22)
    expect(sliderFieldLayout.height({density: "compact", label: true})).toBe(28)
    expect(colorFieldLayout.height()).toBe(28)
  })

  test("переключатели", () => {
    expect(checkboxFieldLayout.height()).toBe(16)
    expect(checkboxFieldLayout.height({label: true})).toBe(28)
    expect(switchFieldLayout.height()).toBe(18)
    expect(switchFieldLayout.height({label: true})).toBe(28)
    expect(toggleButtonGroupLayout.height()).toBe(22)
    expect(toggleButtonGroupLayout.height({density: "compact"})).toBe(22)
    expect(toggleButtonGroupLayout.height({label: true})).toBe(28)
  })

  test("выбор", () => {
    expect(selectFieldLayout.height()).toBe(22)
    expect(selectFieldLayout.height({density: "regular"})).toBe(28)
    expect(selectFieldLayout.height({label: true})).toBe(28)
    expect(cycleFieldLayout.height()).toBe(28)
    expect(cycleFieldLayout.height({density: "compact"})).toBe(22)
    expect(cycleFieldLayout.height({density: "compact", label: true})).toBe(28)
  })

  test("составные однострочные поля", () => {
    expect(pathFieldLayout.height()).toBe(28)
    expect(pathFieldLayout.height({density: "compact"})).toBe(24)
    expect(pathFieldLayout.height({density: "compact", label: true})).toBe(28)
    expect(referenceFieldLayout.height()).toBe(28)
    expect(referenceFieldLayout.height({density: "compact"})).toBe(24)
    expect(referenceFieldLayout.height({density: "compact", label: true})).toBe(28)
    expect(fieldGroupLayout.height()).toBe(28)
    expect(fieldGroupLayout.height({density: "compact"})).toBe(22)
    expect(fieldGroupLayout.height({density: "compact", label: true})).toBe(28)
    expect(vectorFieldLayout.height()).toBe(28)
    expect(vectorFieldLayout.height({density: "compact"})).toBe(22)
    expect(vectorFieldLayout.height({density: "compact", label: true})).toBe(28)
  })
})

test("[UI-007] MatrixField учитывает каждую вертикальную строку и промежуток", () => {
  expect([2, 3, 4].map(size => matrixFieldLayout.height({size}))).toEqual([58, 88, 118])
  expect([2, 3, 4].map(size => matrixFieldLayout.height({size, density: "compact"}))).toEqual([46, 70, 94])
  expect(() => matrixFieldLayout.height({size: 1})).toThrow("integer from 2 to 4")
  expect(() => matrixFieldLayout.height({size: 5})).toThrow("integer from 2 to 4")
  expect(() => matrixFieldLayout.height({size: 2.5})).toThrow("integer from 2 to 4")
})

test("[UI-008] CollectionField учитывает список и полный столбец перестановки", () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8].map(visibleRows =>
    collectionFieldLayout.height({visibleRows})
  )).toEqual([58, 58, 84, 110, 136, 162, 188, 214])
  expect([1, 2, 3, 4, 5, 6, 7, 8].map(visibleRows =>
    collectionFieldLayout.height({visibleRows, movable: true})
  )).toEqual([118, 118, 118, 118, 136, 162, 188, 214])
  expect(collectionFieldLayout.height()).toBe(84)
  expect(collectionFieldLayout.height({visibleRows: Number.NaN})).toBe(84)
  expect(collectionFieldLayout.height({visibleRows: 0})).toBe(58)
  expect(collectionFieldLayout.height({visibleRows: 9})).toBe(214)
})

test("[UI-009] ColorPickerField учитывает образец, четыре канала, промежутки, отступы и рамку", () => {
  expect(colorPickerFieldLayout.height()).toBe(178)
})

test("[UI-010] каждый владелец Field связывает публичный план со своими переменными темы", async () => {
  const owners = Object.freeze({
    "fields/checkbox-field.tsx": ["checkboxFieldLayout", "var(--field-checkbox-height)"],
    "fields/collection-field.tsx": ["collectionFieldLayout", "collectionVisibleRowsHeight", "var(--field-collection-action-height)"],
    "fields/color-field.tsx": ["colorFieldLayout", "var(--field-height-regular)"],
    "fields/color-picker-field.tsx": ["colorPickerFieldLayout", "height: var(--field-color-picker-height)"],
    "fields/cycle-field.tsx": ["cycleFieldLayout", "var(--control-height-medium)"],
    "fields/field-group.tsx": ["fieldGroupLayout", "var(--field-height-compact)"],
    "fields/matrix-field.tsx": ["matrixFieldLayout", "var(--field-matrix-row-gap)"],
    "fields/number-field.tsx": ["numberFieldLayout", "var(--control-height-medium)"],
    "fields/path-field.tsx": ["pathFieldLayout", "var(--field-path-height-compact)"],
    "fields/reference-field.tsx": ["referenceFieldLayout", "var(--field-reference-height-compact)"],
    "fields/select-field.tsx": ["selectFieldLayout", "var(--control-height-medium)"],
    "fields/slider-field.tsx": ["sliderFieldLayout", "var(--field-height-compact)"],
    "fields/switch-field.tsx": ["switchFieldLayout", "var(--field-switch-height)"],
    "fields/text-field.tsx": ["textFieldLayout", "var(--control-height-medium)"],
    "fields/vector-field.tsx": ["vectorFieldLayout", "var(--field-group-content-height)"],
    "buttons/toggle-button-group.tsx": ["toggleButtonGroupLayout", "var(--control-height-medium)"],
  })

  for (const [relativePath, requiredFragments] of Object.entries(owners)) {
    const source = await Bun.file(resolve(uiRoot, relativePath)).text()
    for (const fragment of requiredFragments) expect(source).toContain(fragment)
  }
})
