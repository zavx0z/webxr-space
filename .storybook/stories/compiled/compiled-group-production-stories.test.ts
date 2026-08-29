/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {
  createCompiledControlGroupProductionStory,
  createCompiledMatrixInputProductionStory,
  createCompiledVectorInputProductionStory
} from "./compiled-group-production-stories.tsx"

describe("compiled grouped production stories", () => {
  test("mounts ControlGroup from the class-free hook-controlled owner", () => {
    const mounted = createCompiledControlGroupProductionStory(createDocument(), {
      items: [{key: "x", label: "X", value: "1"}, {key: "y", label: "Y", value: "2"}]
    })
    expect(mounted.story.element.querySelectorAll("input")).toHaveLength(2)
    expect(mounted.story.source.typescript).toContain("<ControlGroup")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).toContain("controlGroupCss")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("mounts VectorInput through nested keyed ControlGroup composition", () => {
    const mounted = createCompiledVectorInputProductionStory(createDocument(), {value: [1, 2, 3]})
    expect(mounted.story.element.querySelectorAll("input")).toHaveLength(3)
    expect(mounted.story.source.typescript).toContain("<VectorInput")
    expect(mounted.story.source.typescript).toContain("vectorInputCss")
    expect(mounted.story.source.html).toContain('data-control-key="X"')
    mounted.story.dispose()
  })

  test("mounts MatrixInput through two keyed composition levels", () => {
    const mounted = createCompiledMatrixInputProductionStory(createDocument(), {value: [[1, 0], [0, 1]]})
    expect(mounted.story.element.querySelectorAll("input")).toHaveLength(4)
    expect(mounted.story.source.typescript).toContain("<MatrixInput")
    expect(mounted.story.source.typescript).toContain("matrixInputCss")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })
})
