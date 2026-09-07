import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type HTMLElement} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {runtime} from "../.storybook/runtime.ts"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "layout")]}))
const subjects = await import("../.storybook/stories/subjects.ts")
await import("../.storybook/stories/compiled/report.tsx")

test("[LAYOUT-STORYBOOK-MOUNT] числовой сценарий использует Document и Display host, повторный расчёт и cleanup", async () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("xr-space")
  const display = document.createElement("xr-display")
  space.append(document.createElement("xr-view-point"), display)
  document.append(space)
  const abort = new AbortController()
  const diagnostics: unknown[] = []
  const session = runtime.create({
    document,
    signal: abort.signal,
    present(value) {
      display.append(value.node)
      expect(value.node.ownerDocument).toBe(document)
      const styles = value.componentRoot.readStyleSheets() as {styleSheets: unknown[]}
      expect(styles.styleSheets.length).toBeGreaterThan(0)
      expect(value.source.html).toContain("Числовой вход")
      expect(value.source.typescript).toContain('from "@zavx0z/layout/top-down"')
    },
    reportDiagnostic(value) { diagnostics.push(value) },
  })
  const story = subjects.story_algorithms_top_down_baseline
  try {
    await session.mount({route: story.route, story, signal: abort.signal})
    const owner = display.firstElementChild as HTMLElement
    expect(owner.getAttribute("data-layout-story")).toBe(story.route)
    expect(owner.getAttribute("data-layout-status")).toBe("result")
    expect(owner.querySelectorAll("canvas")).toHaveLength(0)
    expect(owner.querySelectorAll("pre")).toHaveLength(2)
    const before = owner.querySelector('pre[aria-label="Числовой результат"]')!.textContent
    owner.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    await Promise.resolve()
    expect(owner.querySelector('pre[aria-label="Числовой результат"]')!.textContent).toBe(before)
    expect(owner.querySelector('[role="alert"]')!.hasAttribute("hidden")).toBe(true)
    expect(diagnostics).toEqual([])
  } finally {
    session.dispose()
    abort.abort()
  }
  expect(display.childNodes).toHaveLength(0)
  expect(document.querySelectorAll("xr-space")).toHaveLength(1)
  expect(document.querySelectorAll("xr-view-point")).toHaveLength(1)
})
