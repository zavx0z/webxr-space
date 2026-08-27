import {describe, expect, test} from "bun:test"
import {createDocument, HTMLInputElement} from "@zavx0z/dom"
import {
  createMatrixStory,
  createVectorStory,
  matrixStoryDefaultArgs,
  numericCompositeStoriesCss,
  vectorStoryDefaultArgs,
} from "./numeric-composite-stories.ts"

describe("native DOM numeric composite stories", () => {
  test("creates semantic Vector fieldset with label/input fields", () => {
    const story = createVectorStory(createDocument())
    expect(story.element.localName).toBe("fieldset")
    expect(story.refs.legend.localName).toBe("legend")
    expect(story.refs.legend.textContent).toBe("Position")
    expect(story.refs.inputs.size).toBe(3)
    expect(story.refs.inputs.get("x")).toBeInstanceOf(HTMLInputElement)
    expect(story.refs.inputs.get("x")?.type).toBe("number")
    expect(story.refs.inputs.get("x")?.value).toBe("1")
    expect(story.source.html).toContain("<fieldset")
    expect(story.source.css).toBe(numericCompositeStoriesCss)
  })

  test("preserves Vector field/input identity across keyed reorder", () => {
    const story = createVectorStory(createDocument())
    const xField = story.refs.fields.get("x")
    const xInput = story.refs.inputs.get("x")
    story.update({
      title: "Velocity",
      disabled: false,
      readOnly: true,
      fields: [
        {key: "z", label: "Z", value: "9"},
        {key: "x", label: "Horizontal", value: "4.5"},
      ],
    })
    expect(story.refs.fields.get("x")).toBe(xField)
    expect(story.refs.inputs.get("x")).toBe(xInput)
    expect(story.refs.inputs.get("x")?.value).toBe("4.5")
    expect(story.refs.inputs.get("x")?.readOnly).toBeTrue()
    expect(story.refs.inputs.has("y")).toBeFalse()
  })

  test("creates keyed Matrix rows and stable cell inputs", () => {
    const story = createMatrixStory(createDocument())
    const row = story.refs.rows.get("r0")
    const m00 = story.refs.inputs.get("m00")
    expect(story.element.localName).toBe("fieldset")
    expect(story.refs.rows.size).toBe(2)
    expect(m00?.value).toBe("1")
    story.update({
      title: "Scaled 2×2",
      disabled: true,
      readOnly: false,
      rows: [
        {key: "r1", cells: [
          {key: "m10", label: "M10", value: "2"},
          {key: "m11", label: "M11", value: "3"},
        ]},
        {key: "r0", cells: [
          {key: "m00", label: "M00", value: "4"},
          {key: "m01", label: "M01", value: "5"},
        ]},
      ],
    })
    expect(story.refs.rows.get("r0")).toBe(row)
    expect(story.refs.inputs.get("m00")).toBe(m00)
    expect(m00?.value).toBe("4")
    expect(m00?.disabled).toBeTrue()
  })

  test("sanitizes number live values and rejects malformed shapes atomically", () => {
    const vector = createVectorStory(createDocument(), {
      ...vectorStoryDefaultArgs,
      fields: [
        {key: "x", label: "X", value: "not-number"},
        {key: "y", label: "Y", value: "2"},
      ],
    })
    expect(vector.refs.inputs.get("x")?.value).toBe("")
    expect(vector.args.fields[0]?.value).toBe("")

    const matrix = createMatrixStory(createDocument())
    const previous = matrix.args
    const children = [...matrix.element.childNodes]
    expect(() => matrix.update({
      ...matrixStoryDefaultArgs,
      rows: [
        {key: "a", cells: [
          {key: "a0", label: "A0", value: "1"},
          {key: "a1", label: "A1", value: "2"},
        ]},
        {key: "b", cells: [
          {key: "b0", label: "B0", value: "3"},
          {key: "b1", label: "B1", value: "4"},
          {key: "b2", label: "B2", value: "5"},
        ]},
      ],
    })).toThrow("Matrix rows must have equal cell counts")
    expect(matrix.args).toBe(previous)
    expect(matrix.element.childNodes).toEqual(children)
  })

  test("exports one exact DOM-only package boundary", async () => {
    const source = await Bun.file(new URL("./numeric-composite-stories.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }
    for (const forbidden of [
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "../vector-input",
      "../matrix-input",
      "UiSurface",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/numeric-composite-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-NUMERIC-COMPOSITE-STORIES-001")
  })
})
