import {describe, expect, test} from "bun:test"
import {createDocument, getPopoverVisibilityState, type HTMLButtonElement, type HTMLElement} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import {createCompiledEnumInputProductionStory} from "./compiled-enum-input-production-story.tsx"

describe("compiled EnumInput production story", () => {
  test("serializes the controlled option value rather than its visible label", () => {
    const mounted = createCompiledEnumInputProductionStory(createDocument(), {
      value: "output",
      presentation: "expanded",
      options: [
        {key: "input", value: "input", label: "Input"},
        {key: "output", value: "output", label: "Output"}
      ]
    })
    expect(mounted.story.element.getAttribute("data-value")).toBe("output")
    expect(mounted.story.source.typescript).toContain('useState("output")')
    expect(mounted.story.source.typescript).not.toContain('useState("Output")')
    mounted.story.dispose()
  })

  test("restores cycle header and popup option icons", () => {
    const document = createDocument()
    const mounted = createCompiledEnumInputProductionStory(document, {
      value: "output",
      presentation: "cycle",
      popupLabel: "Icon options",
      options: [
        {key: "input", value: "input", label: "Input", iconSrc: uiIcons.log},
        {key: "output", value: "output", label: "Output", iconSrc: uiIcons.run}
      ]
    })
    document.appendChild(mounted.story.element)
    const trigger = mounted.story.element.querySelector('[data-enum-icon-cycle]')!.querySelector("button") as HTMLButtonElement
    const popover = mounted.story.element.querySelector("[popover]") as HTMLElement
    expect(trigger.querySelector("img")?.getAttribute("src")).toBe(uiIcons.run)
    trigger.click()
    expect(popover[getPopoverVisibilityState]()).toBe("showing")
    expect([...popover.querySelectorAll('[role="option"]')].map(option => option.querySelector("img")?.getAttribute("src")))
      .toEqual([uiIcons.log, uiIcons.run])
    expect(mounted.story.source.typescript).toContain("uiIcons.run")
    mounted.story.dispose()
  })

  test("materializes an initially open icon cycle only after presentation", () => {
    const document = createDocument()
    const mounted = createCompiledEnumInputProductionStory(document, {
      value: "output",
      open: true,
      options: [
        {key: "input", value: "input", label: "Input", iconSrc: uiIcons.log},
        {key: "output", value: "output", label: "Output", iconSrc: uiIcons.run}
      ]
    })
    const popover = mounted.story.element.querySelector("[popover]") as HTMLElement
    expect(popover[getPopoverVisibilityState]()).toBe("hidden")
    document.appendChild(mounted.story.element)
    mounted.story.afterPresent?.()
    expect(popover[getPopoverVisibilityState]()).toBe("showing")
    mounted.story.dispose()
  })
})
