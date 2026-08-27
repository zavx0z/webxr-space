import {describe, expect, test} from "bun:test"
import {createStorybookPage} from "@zavx0z/storybook/server"
import {createStorybookApp} from "./app.ts"
import {UI_COMPONENT_GRAPH_ROUTES} from "./page/stories.ts"

describe("@webxr-space/storybook", () => {
  test("owns the typed UI component graph route and package composition", async () => {
    const app = createStorybookApp()
    expect(app.id).toBe("webxr-space")
    expect(app.home.path).toBe("/ui/component-graph")
    expect(app.pages).toHaveLength(1)
    expect(app.pages[0]?.routeTree).toBe(UI_COMPONENT_GRAPH_ROUTES)
    expect(UI_COMPONENT_GRAPH_ROUTES.leaves).toEqual(["ui/component-graph"])
    for (const path of [
      "page/entry.ts",
      "page/page.ts",
      "page/stories.ts",
      "page/preview.ts",
      "page/fixtures/graph.ts",
      "page/state/lab-state.ts",
    ]) expect(await Bun.file(new URL(path, import.meta.url)).exists(), path).toBeTrue()
    const entry = await Bun.file(new URL("./page/entry.ts", import.meta.url)).text()
    expect(entry).toContain("new StorybookStatusBarSurface()")
    expect(entry).toContain("planStorybookStatusBarShell(w, h)")
    expect(entry).toContain("frames(w, h).content")
    expect(entry).toContain("frames(w, h).status")
  })

  test("uses an automatic-port package server without consumer port knowledge", async () => {
    const source = await Bun.file(new URL("./server.ts", import.meta.url)).text()
    expect(source).toContain("startStorybookPackageServer")
    expect(source).not.toContain("port:")
    expect(source).not.toMatch(/_STORYBOOK_PORT/u)
  })

  test("inherits the Blender node-editor fallback from the shared shell", async () => {
    const source = await Bun.file(new URL("./page/style.css", import.meta.url)).text()
    expect(source).not.toContain("background")
    expect(source).not.toContain("#171615")
    const app = createStorybookApp()
    const html = await createStorybookPage(app, app.pages[0]!).htmlResponse().then((response) => response.text())
    expect(html).toContain("--storybook-shell-background: #1d1d1d")
    expect(html).toContain('<meta name="storybook-status-bar-lead" content="Создано для">')
    expect(html).toContain('<meta name="storybook-status-bar-owner" content="webxr-space">')
    expect(html).toContain('<meta name="storybook-status-bar-detail" content="живой UI component graph">')
    expect(html).not.toContain("data-storybook-footer")
  })
})
