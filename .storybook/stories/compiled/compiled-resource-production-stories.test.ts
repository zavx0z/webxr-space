/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {
  createCompiledPathControlProductionStory,
  createCompiledReferenceControlProductionStory,
} from "./compiled-resource-production-stories.tsx"
import {uiIcons} from "@ui/components/icons"

describe("compiled resource production stories", () => {
  test("keeps PathControl hook-controlled through input and browse proposals", () => {
    const mounted = createCompiledPathControlProductionStory(createDocument(), {
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
    expect(mounted.story.source.typescript).toContain("<PathControl")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.typescript).not.toContain("createPathControl(")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("keeps ReferenceControl value, pick and clear actions in hook state", () => {
    const mounted = createCompiledReferenceControlProductionStory(createDocument(), {
      value: {id: "output", label: "Output", kind: "view"},
      placeholder: "Not selected",
    })
    const owner = mounted.story.element
    const buttons = [...owner.querySelectorAll("button")] as HTMLButtonElement[]
    const valueButton = buttons[0]!
    const valueText = valueButton.querySelector("span")!.firstChild
    expect(valueButton.querySelector("img")?.getAttribute("src")).toBe(uiIcons.resource)
    expect(buttons[1]!.querySelector("img")?.getAttribute("src")).toBe(uiIcons.picker)
    expect(buttons[2]!.querySelector("img")?.getAttribute("src")).toBe(uiIcons.close)

    buttons[1]!.click()
    expect(valueButton.textContent).toBe("Viewport")
    expect(valueButton.querySelector("span")!.firstChild).toBe(valueText)
    buttons[2]!.click()
    expect(valueButton.textContent).toBe("Not selected")
    expect(mounted.story.element).toBe(owner)
    expect(mounted.story.source.typescript).toContain("<ReferenceControl")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.typescript).not.toContain("createReferenceControl(")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })
})
