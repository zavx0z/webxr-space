import {expect, setDefaultTimeout, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, type Node as SemanticNode} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {runtime} from "../.storybook/runtime.ts"
import type {OwnerStoryDescriptor} from "../.storybook/stories/story-types.ts"

const root = resolve(import.meta.dir, "../..")
const nodesRoot = resolve(root, "nodes")
const uiRoot = resolve(root, "ui")

setDefaultTimeout(30_000)

const expected = Object.freeze([
  {route: "layout/fixed/baseline/right", policy: "fixed", direction: "RIGHT", frames: 2, nodes: 4, links: 3},
  {route: "layout/fixed/baseline/down", policy: "fixed", direction: "DOWN", frames: 2, nodes: 4, links: 3},
  {route: "layout/adaptive/shared/right", policy: "adaptive", direction: "RIGHT", frames: 0, nodes: 3, links: 2},
  {route: "layout/adaptive/shared/down", policy: "adaptive", direction: "DOWN", frames: 0, nodes: 3, links: 2},
  {route: "layout/adaptive/compound/right", policy: "adaptive", direction: "RIGHT", frames: 2, nodes: 3, links: 2},
  {route: "layout/adaptive/compound/down", policy: "adaptive", direction: "DOWN", frames: 2, nodes: 3, links: 2},
] as const)

Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [nodesRoot, uiRoot],
}))

test("[NODES-STORYBOOK-001] WebXR объявляет один package-owned Nodes catalog с шестью Display-примерами", async () => {
  const project = await Bun.file(resolve(root, ".storybook/manifest.json")).json() as {
    packages: readonly Readonly<{declaration: string}>[]
  }
  const manifest = await Bun.file(resolve(nodesRoot, ".storybook/manifest.json")).json() as {
    id: string
    runtime: Readonly<{module: string; export: string}>
    authorStyleSheets?: unknown
  }
  const catalog = await Bun.file(resolve(nodesRoot, ".storybook/catalog.json")).json() as Catalog

  expect(project.packages).toContainEqual({declaration: "../ui/.storybook/manifest.json"})
  expect(project.packages).toContainEqual({declaration: "../nodes/.storybook/manifest.json"})
  expect(manifest).toMatchObject({
    id: "@zavx0z/nodes",
    runtime: {module: "./runtime.ts", export: "runtime"},
  })
  expect(manifest.authorStyleSheets).toBeUndefined()
  expect(runtime.protocol).toBe("storybook-runtime/4")

  const variants = catalog.categories.flatMap(category => category.subjects.flatMap(subject =>
    subject.variants.map(variant => ({
      route: variant.route,
      presentation: subject.presentation,
    }))))
  expect(variants.map(({route}) => route)).toEqual(expected.map(({route}) => route))
  for (const {presentation} of variants) {
    expect(presentation).toEqual({
      protocol: "story-presentation/1",
      projection: "display",
      widgets: ["props", "source", "diagnostics"],
    })
  }

  const storySource = await Bun.file(resolve(
    nodesRoot,
    ".storybook/stories/compiled/compiled-layout-story.tsx",
  )).text()
  expect(storySource).toContain('from "@zavx0z/nodes/node-editor"')
  expect(storySource).toContain('from "@zavx0z/layout/fixed"')
  expect(storySource).toContain('from "@zavx0z/layout/adaptive"')
  expect(storySource).not.toContain("layoutTopDown")
  expect(storySource).not.toContain("layoutCoffmanGraham")
  expect(storySource).not.toContain("renderLayoutSvg")
})

test("[NODES-STORYBOOK-002] каждый route вычисляет реальный Layout и монтирует production NodeEditor", async () => {
  const subjects = await import("../.storybook/stories/subjects/layout.ts") as Record<string, unknown>
  const descriptors = Object.values(subjects).filter(isOwnerStoryDescriptor)
  expect(descriptors.map(({route}) => route).sort()).toEqual(expected.map(({route}) => route).sort())

  for (const scenario of expected) {
    const descriptor = descriptors.find(({route}) => route === scenario.route)
    if (descriptor === undefined) throw new Error(`Нет story descriptor: ${scenario.route}`)
    const document = createDocument({elementFactories: createSpaceElementFactories()})
    const space = document.createElement("xr-space")
    const viewPoint = document.createElement("xr-view-point")
    const display = document.createElement("xr-display")
    document.transaction(() => {
      space.append(viewPoint, display)
      document.append(space)
    })
    const abort = new AbortController()
    const diagnostics: unknown[] = []
    let presented: SemanticNode | null = null
    let values: Readonly<Record<string, unknown>> | null = null
    const session = runtime.create({
      document,
      signal: abort.signal,
      present(value) {
        presented = value.node
        values = value.values.props
        display.append(value.node)
        const styleSnapshot = value.componentRoot.readStyleSheets() as Readonly<{
          styleSheets?: unknown
        }>
        expect(Array.isArray(styleSnapshot.styleSheets)).toBeTrue()
        expect((styleSnapshot.styleSheets as readonly unknown[]).length).toBeGreaterThan(0)
      },
      reportDiagnostic(value) {
        diagnostics.push(value)
      },
    })

    try {
      await session.mount({route: scenario.route, story: descriptor, signal: abort.signal})
      if (presented === null) throw new Error(`Story не представила NodeEditor: ${scenario.route}`)
      const owner = presented as SemanticNode & {
        getAttribute(name: string): string | null
        querySelector(selector: string): SemanticNode | null
        querySelectorAll(selector: string): readonly SemanticNode[]
      }
      expect(owner.parentNode).toBe(display)
      expect(owner.getAttribute("data-node-editor")).toBe("")
      expect(owner.getAttribute("data-layout-policy")).toBe(scenario.policy)
      expect(owner.getAttribute("data-layout-direction")).toBe(scenario.direction)
      expect(Array.from(owner.querySelectorAll("[data-node-id]"))
        .filter(node => "localName" in node && node.localName === "article"))
        .toHaveLength(scenario.nodes)
      expect(Array.from(owner.querySelectorAll("[data-link-id]"))).toHaveLength(scenario.links)
      expect(Array.from(owner.querySelectorAll("[data-frame-id]"))
        .filter(node => "localName" in node && node.localName === "section"))
        .toHaveLength(scenario.frames)
      expect(owner.querySelector('button[data-action="fit-node-tree"]')).not.toBeNull()
      expect(values).toMatchObject({
        route: scenario.route,
        direction: scenario.direction,
        nodeCount: scenario.nodes,
        frameCount: scenario.frames,
        linkCount: scenario.links,
      })
      expect(diagnostics).toEqual([])
    } finally {
      session.dispose()
      abort.abort()
      expect(display.childNodes).toHaveLength(0)
    }
  }
})

function isOwnerStoryDescriptor(value: unknown): value is OwnerStoryDescriptor {
  return value !== null && typeof value === "object" &&
    typeof (value as Partial<OwnerStoryDescriptor>).route === "string" &&
    typeof (value as Partial<OwnerStoryDescriptor>).create === "function"
}

type Catalog = Readonly<{
  categories: readonly Readonly<{
    subjects: readonly Readonly<{
      presentation: Readonly<{
        protocol: string
        projection: string
        widgets: readonly string[]
      }>
      variants: readonly Readonly<{route: string}>[]
    }>[]
  }>[]
}>
