/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {
  createCompiledPathInputProductionStory,
  createCompiledReferenceInputProductionStory,
} from "./compiled-resource-production-stories.tsx"

describe("compiled resource production stories", () => {
  test("keeps PathInput hook-controlled through input and browse proposals", () => {
    const mounted = createCompiledPathInputProductionStory(createDocument(), {
      value: "/project/output.exr",
      placeholder: "Choose file",
    })
    const owner = mounted.story.element
    const input = owner.querySelector("input") as HTMLInputElement
    const browse = owner.querySelector("button") as HTMLButtonElement

    input.value = "/project/render.exr"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(mounted.story.element).toBe(owner)
    expect(owner.querySelector("input")).toBe(input)
    expect(input.value).toBe("/project/render.exr")
    expect(mounted.story.source.typescript).toContain('useState("/project/render.exr")')

    browse.click()
    expect(input.value).toBe("/project/selected.exr")
    expect(mounted.story.source.typescript).toContain("<PathInput")
    expect(mounted.story.source.typescript).toContain("pathInputCss")
    expect(mounted.story.source.typescript).not.toContain("createPathInput(")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("keeps ReferenceInput value, pick and clear actions in hook state", () => {
    const mounted = createCompiledReferenceInputProductionStory(createDocument(), {
      value: {id: "output", label: "Output", kind: "view"},
      placeholder: "Not selected",
    })
    const owner = mounted.story.element
    const buttons = [...owner.querySelectorAll("button")] as HTMLButtonElement[]
    const valueButton = buttons[0]!
    const valueText = valueButton.querySelector("span")!.firstChild

    buttons[1]!.click()
    expect(valueButton.textContent).toBe("Viewport")
    expect(valueButton.querySelector("span")!.firstChild).toBe(valueText)
    buttons[2]!.click()
    expect(valueButton.textContent).toBe("Not selected")
    expect(mounted.story.element).toBe(owner)
    expect(mounted.story.source.typescript).toContain("<ReferenceInput")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).toContain("referenceInputCss")
    expect(mounted.story.source.typescript).not.toContain("createReferenceInput(")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })
})
