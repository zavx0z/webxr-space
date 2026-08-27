import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLButtonElement,
  Text,
  type Event,
} from "@zavx0z/dom"
import {
  buttonStoryCss,
  buttonStoryDefaultArgs,
  createButtonStory,
  type ButtonStoryArgs,
} from "./button-story.ts"

describe("native DOM Button story", () => {
  test("creates one standard button with the Output title mechanism", () => {
    const document = createDocument()
    const story = createButtonStory(document)

    expect(story.element).toBeInstanceOf(HTMLButtonElement)
    expect(story.element.localName).toBe("button")
    expect(story.element.getAttribute("type")).toBe("button")
    expect(story.element.className).toBe("ui-button-story ui-button-story--contained ui-button-story--medium ui-button-story--neutral")
    expect(story.element.disabled).toBeFalse()
    expect(story.element.title).toBe("Output")
    expect(story.element.textContent).toBe("Output")
    expect(story.element.childNodes).toHaveLength(1)
    expect(story.element.firstChild).toBeInstanceOf(Text)
    expect(story.args).toEqual(buttonStoryDefaultArgs)
    expect(Object.isFrozen(story.args)).toBeTrue()
  })

  test("updates className, disabled, title and the same Text node", () => {
    const document = createDocument()
    const story = createButtonStory(document)
    const button = story.element
    const text = button.firstChild

    story.update({
      label: "Run",
      variant: "outlined",
      disabled: true,
      title: "Run output",
      size: "large",
      tone: "success",
    })

    expect(story.element).toBe(button)
    expect(button.firstChild).toBe(text)
    expect(button.childNodes).toHaveLength(1)
    expect(button.className).toBe("ui-button-story ui-button-story--outlined ui-button-story--large ui-button-story--success")
    expect(button.disabled).toBeTrue()
    expect(button.title).toBe("Run output")
    expect(text?.textContent).toBe("Run")
    expect(story.args).toEqual({
      label: "Run",
      variant: "outlined",
      disabled: true,
      title: "Run output",
      size: "large",
      tone: "success",
    })

    story.update({label: "Plain", variant: "text", disabled: false, title: ""})
    expect(story.element).toBe(button)
    expect(button.firstChild).toBe(text)
    expect(button.className).toBe("ui-button-story ui-button-story--text ui-button-story--medium ui-button-story--neutral")
    expect(button.disabled).toBeFalse()
    expect(button.title).toBe("")
    expect(text?.textContent).toBe("Plain")
  })

  test("keeps click as an ordinary bubbling DOM event and honors disabled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createButtonStory(document)
    document.appendChild(host)
    host.appendChild(story.element)
    const events: Event[] = []
    host.addEventListener("click", (event) => events.push(event))

    story.element.click()
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe("click")
    expect(events[0]?.bubbles).toBeTrue()
    expect(events[0]?.target).toBe(story.element)

    story.update({...story.args, disabled: true})
    story.element.click()
    expect(events).toHaveLength(1)
  })

  test("derives live HTML, exact flat CSS and executable native TypeScript", () => {
    const document = createDocument()
    const story = createButtonStory(document)
    story.element.setAttribute("data-source-proof", "live & exact")
    const source = story.source

    expect(source.html).toBe('<button class="ui-button-story ui-button-story--contained ui-button-story--medium ui-button-story--neutral" data-source-proof="live &amp; exact" title="Output" type="button">Output</button>')
    expect(source.css).toBe(buttonStoryCss)
    expect(source.css).toContain(".ui-button-story--contained")
    expect(source.css).toContain(".ui-button-story[disabled]")
    expect(source.css).not.toContain("&")
    expect(source.typescript).toContain('document.createElement("button")')
    expect(source.typescript).toContain('button.title = "Output"')
    expect(source.typescript).toContain('document.createTextNode("Output")')
    expect(source.typescript).not.toContain("createButtonStory")
    expect(source.typescript).not.toContain("surface")
  })

  test("rejects malformed args before changing the native button", () => {
    const story = createButtonStory(createDocument())
    const button = story.element
    const previous = story.args

    expect(() => story.update({
      ...buttonStoryDefaultArgs,
      variant: "unknown" as ButtonStoryArgs["variant"],
    })).toThrow("Unknown Button story variant: unknown")
    expect(() => story.update({
      ...buttonStoryDefaultArgs,
      disabled: "yes" as unknown as boolean,
    })).toThrow("Button story disabled must be a boolean")
    expect(story.element).toBe(button)
    expect(story.args).toBe(previous)
    expect(story.element.title).toBe("Output")
  })

  test("keeps the proof independent from production Button and retained owners", async () => {
    const source = await Bun.file(new URL("./button-story.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    for (const forbidden of [
      "UiSurface",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"),
      "defineStorybookStoryModule",
      "../button",
      "./button",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/button-story"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-BUTTON-STORY-001")
  })
})
