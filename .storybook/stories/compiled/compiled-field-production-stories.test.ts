/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {
  Event,
  createDocument,
  getPopoverVisibilityState,
  type HTMLButtonElement,
  type HTMLElement,
  type HTMLInputElement,
} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import {
  createCompiledCheckboxFieldProductionStory,
  createCompiledCollectionFieldProductionStory,
  createCompiledColorFieldProductionStory,
  createCompiledCycleFieldProductionStory,
  createCompiledFieldGroupProductionStory,
  createCompiledPathFieldProductionStory,
  createCompiledReferenceFieldProductionStory,
  createCompiledSelectFieldProductionStory,
  createCompiledTextFieldProductionStory,
  createCompiledVectorFieldProductionStory,
} from "./compiled-field-production-stories.tsx"

describe("compiled concrete Field production stories", () => {
  test("mounts the exact hook-controlled owner and publishes executable JSX", () => {
    const document = createDocument()
    const mounted = createCompiledTextFieldProductionStory(document, {
      label: "Name",
      value: "Alpha"
    })
    const input = mounted.story.element.querySelector("input") as HTMLInputElement
    input.value = "Beta"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(input.value).toBe("Beta")
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("text-field")
    expect(mounted.story.source.typescript).toContain("<TextField")
    expect(mounted.story.source.typescript).toContain("@ui/components/fields/text-field")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.typescript).not.toContain("createTextField")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("uses the same adapter for a nested keyed vector owner", () => {
    const document = createDocument()
    const mounted = createCompiledVectorFieldProductionStory(document, {
      label: "Position",
      value: [1, 2, 3]
    })
    expect(mounted.story.element.querySelectorAll("input")).toHaveLength(3)
    expect(mounted.story.source.html).toContain('data-field-group=""')
    expect(mounted.story.source.html).toContain("X")
    expect(mounted.story.source.typescript).toContain("<VectorField")
    mounted.story.dispose()
  })

  test("uses exact FieldGroup and stateful concrete choice owners", () => {
    const document = createDocument()
    const group = createCompiledFieldGroupProductionStory(document, {
      label: "Position",
      items: [
        {key: "x", label: "X", value: 1},
        {key: "y", label: "Y", value: 2},
        {key: "z", label: "Z", value: 3},
      ],
    })
    expect(group.story.element.querySelectorAll("input")).toHaveLength(3)
    expect(group.story.source.typescript).toContain("<FieldGroup")
    expect(group.story.source.typescript).toContain("title={item.label}")
    expect(group.story.source.typescript).not.toContain("accent")

    const select = createCompiledSelectFieldProductionStory(document, {
      value: "output",
      options: [
        {key: "input", value: "input", label: "Input"},
        {key: "output", value: "output", label: "Output"},
      ],
    })
    expect(select.story.element.querySelector("select")).not.toBeNull()
    expect(select.story.source.typescript).toContain("<SelectField")

    const checkbox = createCompiledCheckboxFieldProductionStory(document, {
      checked: false,
      indeterminate: true,
    })
    expect((checkbox.story.element.querySelector("input") as HTMLInputElement).indeterminate).toBeTrue()
    expect(checkbox.story.source.typescript).toContain("<CheckboxField")

    for (const mounted of [group, select, checkbox]) mounted.story.dispose()
  })

  test("keeps popup, resource and collection interactions on exact Field owners", () => {
    const cycleDocument = createDocument()
    const cycle = createCompiledCycleFieldProductionStory(cycleDocument, {
      value: "output",
      open: true,
      options: [
        {key: "input", value: "input", label: "Input", iconSrc: uiIcons.log},
        {key: "output", value: "output", label: "Output", iconSrc: uiIcons.run},
      ],
    })
    const cyclePopover = cycle.story.element.querySelector("[popover]") as HTMLElement
    expect(cyclePopover[getPopoverVisibilityState]()).toBe("hidden")
    cycleDocument.appendChild(cycle.story.element)
    cycle.story.afterPresent?.()
    expect(cyclePopover[getPopoverVisibilityState]()).toBe("showing")
    expect(cycle.story.source.typescript).toContain("<CycleField")

    const colorDocument = createDocument()
    const color = createCompiledColorFieldProductionStory(colorDocument, {
      value: {r: 0.2, g: 0.55, b: 0.8, a: 1},
      open: true,
    })
    const colorPopover = color.story.element.querySelector("[popover]") as HTMLElement
    expect(colorPopover[getPopoverVisibilityState]()).toBe("hidden")
    colorDocument.appendChild(color.story.element)
    color.story.afterPresent?.()
    expect(colorPopover[getPopoverVisibilityState]()).toBe("showing")
    expect(color.story.source.typescript).toContain("<ColorField")

    const document = createDocument()
    const reference = createCompiledReferenceFieldProductionStory(document, {
      value: {id: "output", label: "Output", kind: "view"},
      placeholder: "Not selected",
    })
    const referenceButtons = [...reference.story.element.querySelectorAll("button")] as HTMLButtonElement[]
    referenceButtons[1]!.click()
    expect(referenceButtons[0]!.textContent).toBe("Viewport")
    referenceButtons[2]!.click()
    expect(referenceButtons[0]!.textContent).toBe("Not selected")

    const path = createCompiledPathFieldProductionStory(document, {
      value: "/project/output.exr",
      placeholder: "Choose file",
    })
    const pathInput = path.story.element.querySelector("input") as HTMLInputElement
    pathInput.value = "/project/render.exr"
    pathInput.dispatchEvent(new Event("input", {bubbles: true}))
    expect(pathInput.value).toBe("/project/render.exr")
    const browse = path.story.element.querySelector("button") as HTMLButtonElement
    browse.click()
    expect(pathInput.value).toBe("/project/selected.exr")

    const collection = createCompiledCollectionFieldProductionStory(document, {
      items: [
        {id: "input", label: "Input", iconSrc: uiIcons.log},
        {id: "output", label: "Output", iconSrc: uiIcons.run},
      ],
      selectedId: "input",
    })
    const output = collection.story.element.querySelector('[data-item-key="output"]')!
    output.dispatchEvent(new Event("click", {bubbles: true}))
    expect(output.getAttribute("aria-selected")).toBe("true")
    expect(collection.story.source.typescript).toContain("<CollectionField")

    for (const mounted of [cycle, color, reference, path, collection]) mounted.story.dispose()
  })
})
