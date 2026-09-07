import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const stories = await import("../.storybook/stories/subjects/components-widgets.ts")
// Compile the production fixture during module setup; the assertions below test
// its public story contract, not cold compiler-worker startup against a 5s deadline.
await import("../.storybook/stories/compiled/compiled-widget-production-stories.tsx")

test("universal widget examples use public production owners and the supplied Experience Document", async () => {
  const catalog = await Bun.file(resolve(import.meta.dir, "../.storybook/catalog.json")).text()
  for (const [kind, descriptor] of [["editor", stories.story_editor], ["terminal", stories.story_terminal], ["tree", stories.story_tree]] as const) {
    expect(catalog).toContain(descriptor.route)
    const document = createDocument()
    const {story} = await descriptor.create(document)
    document.append(story.element)
    const owner = story.element as HTMLElement
    try {
      expect(owner.querySelector(`[data-widget="${kind}"]`)).not.toBeNull()
      expect(owner.querySelectorAll("canvas")).toHaveLength(0)
      expect(owner.querySelectorAll('[role="menu"]')).toHaveLength(0)
      expect(story.source.typescript).toContain(`@zavx0z/ui/widgets/${kind}`)
      expect(story.source.typescript).not.toContain("interpreter")
    } finally { story.dispose() }
    expect(document.childNodes).toHaveLength(0)
  }
})
