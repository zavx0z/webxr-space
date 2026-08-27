import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"

const storybookRoot = fileURLToPath(new URL(".", import.meta.url))
const uiStorybookRoot = fileURLToPath(new URL("..", import.meta.url))

describe("Node Socket package-owned story boundary", () => {
  test("keeps metadata static and imports the production renderer only from the lazy story module", async () => {
    const metadata = await Bun.file(join(uiStorybookRoot, "ui-story-catalog.ts")).text()
    const story = await Bun.file(join(storybookRoot, "socket.ts")).text()
    expect(metadata).toContain('import("./stories/socket.ts")')
    expect(metadata).not.toContain('from "@nodes/ui/node"')
    expect(story).toContain('from "@nodes/ui/node"')
    expect(story).toContain("socketRenderer.render")
    expect(story).not.toContain('from "../../node.ts"')
  })

  test("loads remaining Node component story code through exact production subpaths", async () => {
    const metadata = await Bun.file(join(uiStorybookRoot, "ui-story-catalog.ts")).text()
    const story = await Bun.file(join(storybookRoot, "node-components.ts")).text()
    expect(metadata).toContain('import("@nodes/ui/node-editor")')
    expect(metadata).toContain('import("@nodes/ui/node")')
    expect(metadata).toContain('import("@nodes/ui/link-curve")')
    expect(metadata).toContain('import("./stories/node-components.ts")')
    expect(story.split("\n").slice(0, 3).join("\n")).not.toContain('from "@nodes/ui/node-editor"')
    expect(story).toContain("Surface-based production previews")
  })

  test("keeps controlled Node state source on exact public production imports", async () => {
    const story = await Bun.file(join(storybookRoot, "node-components.ts")).text()
    expect(story).toContain('from "@nodes/ui/node-editor"')
    expect(story).toContain('from "@nodes/ui/node"')
    expect(story).not.toContain('from "../../node-editor.ts"')
    expect(story).not.toContain('from "../../node.ts"')
  })

})
