import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type HTMLElement} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {runtime} from "../.storybook/runtime.ts"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "nodetree")]}))
const subjects = await import("../.storybook/stories/subjects.ts")
await import("../.storybook/stories/compiled-model-story.tsx")

test("[NODETREE-STORYBOOK-MOUNT] все compiled истории используют Document host, повторяют сценарии и освобождают lifecycle", async () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("xr-space")
  const display = document.createElement("display")
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
      expect(value.source.html).toContain("Вход и действия")
      expect(value.source.typescript).toContain("@zavx0z/nodetree")
    },
    reportDiagnostic(value) { diagnostics.push(value) },
  })
  try {
    for (const story of Object.values(subjects)) {
      await session.mount({route: story.route, story, signal: abort.signal})
      const owner = display.firstElementChild as HTMLElement
      expect(display.children).toHaveLength(1)
      expect(owner.getAttribute("data-scenario-route")).toBe(story.route)
      expect(owner.getAttribute("data-scenario-runs")).toBe("1")
      expect(owner.querySelectorAll("canvas")).toHaveLength(0)
      const firstRow = owner.querySelector("[data-result-key]")
      expect(firstRow).not.toBeNull()
      const before = owner.querySelector('section[aria-label="Результат"]')!.textContent
      owner.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
      await Bun.sleep(0)
      expect(owner.getAttribute("data-scenario-runs")).toBe("2")
      expect(owner.querySelector("[data-result-key]")).toBe(firstRow)
      expect(owner.querySelector('section[aria-label="Результат"]')!.textContent).toBe(before)
      expect(owner.querySelector('[role="status"]')!.textContent).toContain("Выполнений: 2.")
      expect(owner.querySelector("button")!.textContent).toBe("Повторить сценарий")
      session.unmount()
      expect(display.childNodes).toHaveLength(0)
    }
    expect(diagnostics).toEqual([])
  } finally {
    session.dispose()
    abort.abort()
  }
  expect(display.childNodes).toHaveLength(0)
  expect(document.querySelectorAll("xr-space")).toHaveLength(1)
  expect(document.querySelectorAll("xr-view-point")).toHaveLength(1)
})
