import {expect, test} from "bun:test"
import {mkdir, mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {createDocument} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {PARAMETER_EXAMPLES} from "../parameters/.storybook/stories/fixtures/parameters.ts"
import type {OwnerStoryDescriptor} from "../.storybook/stories/story-types.ts"

const workspace = resolve(import.meta.dir, "../..")
const nodesRoot = resolve(workspace, "nodes")
const sourceRoots = [nodesRoot, resolve(workspace, "ui"), resolve(workspace, "markdown")]

Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, sourceRoots, persistent: true}))

test("[NODES-STORYBOOK-SOURCE] показанные TSX-примеры компилируются через публичный Template compiler", async () => {
  const [sockets, parameters, components, concreteNodes] = await Promise.all([
    import("../sockets/.storybook/stories/subjects/sockets.ts"),
    import("../parameters/.storybook/stories/subjects/parameters.ts"),
    import("../.storybook/stories/subjects/components.ts"),
    import("../node/.storybook/stories/subjects.ts"),
  ])
  const descriptors = new Map<string, OwnerStoryDescriptor>(
    Object.values({...sockets, ...parameters, ...components, ...concreteNodes}).map(story => [story.route, story]),
  )
  const routes = [
    ...["input", "output", "bidirectional", "shapes", "states", "presentation"].map(variant => `sockets/boolean/${variant}`),
    ...Object.keys(PARAMETER_EXAMPLES).flatMap(mechanism => [
      `parameters/${mechanism}/field`,
      `parameters/${mechanism}/projected`,
    ]),
    ...["vector", "matrix", "collection"].map(mechanism => `parameters/${mechanism}/geometry`),
    ...Object.values(components).map(story => story.route),
    ...Object.values(concreteNodes).map(story => story.route),
  ]

  // The root .gitignore excludes .codex/ at any depth; each run owns only its
  // unique directory. The explicit project also keeps these separate modules
  // configured while their hidden parent is absent from the normal file scan.
  const ignoredRoot = join(import.meta.dir, ".codex")
  await mkdir(ignoredRoot, {recursive: true})
  const directory = await mkdtemp(join(ignoredRoot, "storybook-source-"))
  try {
    const entrypoints: string[] = []
    for (const route of routes) {
      const descriptor = descriptors.get(route)
      if (descriptor === undefined) throw new Error(`Нет Source descriptor: ${route}`)
      const document = createDocument({elementFactories: createSpaceElementFactories()})
      const space = document.createElement("space")
      const display = document.createElement("display")
      space.append(document.createElement("viewpoint"), display)
      document.append(space)
      const {story} = await descriptor.create(document)
      try {
        display.append(story.element)
        story.afterPresent?.()
        const path = join(directory, `${route.replaceAll("/", "--")}.tsx`)
        await Bun.write(path, story.source.typescript)
        entrypoints.push(path)
      } finally {
        story.element.parentNode?.removeChild(story.element)
        story.dispose()
      }
    }
    await Bun.write(join(directory, "tsconfig.json"), JSON.stringify({
      extends: join(nodesRoot, "tsconfig.json"),
      include: ["*.tsx"],
      exclude: [],
    }))

    const built = await Bun.build({
      entrypoints,
      outdir: join(directory, "compiled"),
      target: "bun",
      format: "esm",
      splitting: true,
      external: ["@zavx0z/component", "@zavx0z/dom", "@zavx0z/engine", "@zavx0z/template/compiled"],
      plugins: [createTemplateJsxBunPlugin({cwd: workspace, sourceRoots})],
    })
    if (!built.success) throw new AggregateError(built.logs, "Показанный Storybook Source не прошёл Template compilation")
    expect(built.outputs.filter(output => output.kind === "entry-point")).toHaveLength(routes.length)
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
}, 120_000)
