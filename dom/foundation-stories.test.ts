import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLDivElement,
  HTMLSpanElement,
  Text,
} from "@zavx0z/dom"
import {
  badgeStoryDefaultArgs,
  createBadgeStory,
  createDividerStory,
  createPaneStory,
  createTypographyStory,
  dividerStoryDefaultArgs,
  foundationStoriesCss,
  paneStoryDefaultArgs,
  typographyStoryDefaultArgs,
  type BadgeStoryArgs,
  type DividerStoryArgs,
  type PaneStoryArgs,
  type TypographyStoryArgs,
  type TypographyStoryVariant,
} from "./foundation-stories.ts"

describe("native DOM foundation stories", () => {
  test("covers the filled Pane route with one stable div and Text node", () => {
    const story = createPaneStory(createDocument())
    const element = story.element
    const text = element.firstChild

    expect(element).toBeInstanceOf(HTMLDivElement)
    expect(element.localName).toBe("div")
    expect(element.className).toBe("ui-pane-story ui-pane-story--filled")
    expect(element.title).toBe("Filled pane")
    expect(element.textContent).toBe("Panel content")
    expect(text).toBeInstanceOf(Text)
    expect(story.args).toEqual(paneStoryDefaultArgs)

    story.update({label: "Outline", variant: "outlined", title: "Outlined pane"})
    expect(story.element).toBe(element)
    expect(element.firstChild).toBe(text)
    expect(element.className).toBe("ui-pane-story ui-pane-story--outlined")
    expect(element.title).toBe("Outlined pane")
    expect(text?.textContent).toBe("Outline")
  })

  test("covers the basic Badge route with one stable span and Text node", () => {
    const story = createBadgeStory(createDocument())
    const element = story.element
    const text = element.firstChild

    expect(element).toBeInstanceOf(HTMLSpanElement)
    expect(element.localName).toBe("span")
    expect(element.className).toBe("ui-badge-story ui-badge-story--neutral")
    expect(element.textContent).toBe("Ready")
    expect(story.args).toEqual(badgeStoryDefaultArgs)

    story.update({label: "Live", tone: "success", title: "Live state"})
    expect(story.element).toBe(element)
    expect(element.firstChild).toBe(text)
    expect(element.className).toBe("ui-badge-story ui-badge-story--success")
    expect(element.title).toBe("Live state")
    expect(text?.textContent).toBe("Live")
  })

  test("covers all Typography variants on one stable span and Text node", () => {
    const story = createTypographyStory(createDocument())
    const element = story.element
    const text = element.firstChild
    const variants: readonly TypographyStoryVariant[] = ["title", "subtitle", "body", "caption"]

    expect(element).toBeInstanceOf(HTMLSpanElement)
    expect(story.args).toEqual(typographyStoryDefaultArgs)
    for (const variant of variants) {
      story.update({text: `Text ${variant}`, variant, title: `Typography ${variant}`})
      expect(story.element).toBe(element)
      expect(element.firstChild).toBe(text)
      expect(element.className).toBe(`ui-typography-story ui-typography-story--${variant}`)
      expect(element.title).toBe(`Typography ${variant}`)
      expect(text?.textContent).toBe(`Text ${variant}`)
    }
  })

  test("covers full-width, inset and middle Divider on one childless hr", () => {
    const story = createDividerStory(createDocument())
    const element = story.element

    expect(element.localName).toBe("hr")
    expect(element.childNodes).toHaveLength(0)
    expect(story.args).toEqual(dividerStoryDefaultArgs)
    for (const variant of ["full-width", "inset", "middle"] as const) {
      story.update({variant, title: `Divider ${variant}`})
      expect(story.element).toBe(element)
      expect(element.childNodes).toHaveLength(0)
      expect(element.className).toBe(`ui-divider-story ui-divider-story--${variant}`)
      expect(element.title).toBe(`Divider ${variant}`)
    }
  })

  test("derives live HTML, exact CSS and direct standard-element TypeScript", () => {
    const document = createDocument()
    const pane = createPaneStory(document)
    const badge = createBadgeStory(document)
    const typography = createTypographyStory(document)
    const divider = createDividerStory(document)
    pane.element.setAttribute("data-source-proof", "live & exact")

    expect(pane.source.html).toBe('<div class="ui-pane-story ui-pane-story--filled" data-source-proof="live &amp; exact" title="Filled pane">Panel content</div>')
    expect(badge.source.html).toBe('<span class="ui-badge-story ui-badge-story--neutral" title="Ready">Ready</span>')
    expect(typography.source.html).toBe('<span class="ui-typography-story ui-typography-story--body" title="Body text">Typography</span>')
    expect(divider.source.html).toBe('<hr class="ui-divider-story ui-divider-story--full-width" title="Divider">')

    for (const story of [pane, badge, typography, divider]) {
      expect(story.source.css).toBe(foundationStoriesCss)
      expect(story.source.typescript).toContain("document.createElement")
      expect(story.source.typescript).not.toContain("surface")
    }
    expect(pane.source.typescript).toContain('document.createElement("div")')
    expect(badge.source.typescript).toContain('document.createElement("span")')
    expect(typography.source.typescript).toContain('document.createElement("span")')
    expect(divider.source.typescript).toContain('document.createElement("hr")')
    expect(pane.source.typescript).not.toContain("createPaneStory")
    expect(badge.source.typescript).not.toContain("createBadgeStory")
    expect(typography.source.typescript).not.toContain("createTypographyStory")
    expect(divider.source.typescript).not.toContain("createDividerStory")
  })

  test("uses only flat CSS properties supported by the document renderer", () => {
    expect(foundationStoriesCss).toContain(".ui-pane-story--filled")
    expect(foundationStoriesCss).toContain(".ui-badge-story--neutral")
    expect(foundationStoriesCss).toContain(".ui-typography-story--caption")
    expect(foundationStoriesCss).toContain(".ui-divider-story--full-width")
    expect(foundationStoriesCss).toContain("width: 248px")
    expect(foundationStoriesCss).toContain("margin-left: 72px")
    expect(foundationStoriesCss).toContain("width: 288px")
    expect(foundationStoriesCss).toContain("margin-left: 16px")
    expect(foundationStoriesCss).not.toContain("calc(")
    expect(foundationStoriesCss).not.toContain("&")
  })

  test("rejects malformed args before changing each stable element", () => {
    const document = createDocument()
    const pane = createPaneStory(document)
    const badge = createBadgeStory(document)
    const typography = createTypographyStory(document)
    const divider = createDividerStory(document)
    const previousPaneArgs = pane.args
    const previousBadgeArgs = badge.args
    const previousTypographyArgs = typography.args
    const previousDividerArgs = divider.args

    expect(() => pane.update({
      ...paneStoryDefaultArgs,
      variant: "unknown" as PaneStoryArgs["variant"],
    })).toThrow("Unknown Pane story variant: unknown")
    expect(() => badge.update({
      ...badgeStoryDefaultArgs,
      tone: "unknown" as BadgeStoryArgs["tone"],
    })).toThrow("Unknown Badge story tone: unknown")
    expect(() => typography.update({
      ...typographyStoryDefaultArgs,
      variant: "unknown" as TypographyStoryArgs["variant"],
    })).toThrow("Unknown Typography story variant: unknown")
    expect(() => divider.update({
      ...dividerStoryDefaultArgs,
      variant: "unknown" as DividerStoryArgs["variant"],
    })).toThrow("Unknown Divider story variant: unknown")

    expect(pane.args).toBe(previousPaneArgs)
    expect(badge.args).toBe(previousBadgeArgs)
    expect(typography.args).toBe(previousTypographyArgs)
    expect(divider.args).toBe(previousDividerArgs)
  })

  test("keeps the batch independent from production factories and retained owners", async () => {
    const source = await Bun.file(new URL("./foundation-stories.ts", import.meta.url)).text()
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
      "../pane",
      "../badge",
      "../typography",
      "../divider",
      "__componentsStoryControlBridge",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./dom/foundation-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-FOUNDATION-STORIES-001")
  })
})
