import {describe, expect, test} from "bun:test"
import {createHash} from "node:crypto"
import {existsSync, readFileSync} from "node:fs"
import {dirname, join, resolve} from "node:path"
import {createDocument} from "@zavx0z/dom"
import {runtime} from "./runtime.ts"
import {story_status_unavailable} from "./stories/subjects/components-data-noti.ts"

const packageRoot = resolve(import.meta.dir, "..")
const projectRoot = resolve(packageRoot, "../..")

describe("@ui/components external catalog", () => {
  test("preserves all legacy leaves and adds every current production component", () => {
    const catalog = json(join(import.meta.dir, "catalog.json")) as Catalog
    const variants = catalog.categories.flatMap((category) =>
      category.subjects.flatMap((subject) => subject.variants))
    const baseline = json(join(projectRoot, ".storybook", "route-baseline.json")) as Baseline
    const expected = baseline.leafRoutes.filter((route) =>
      route.startsWith("components/") || route.startsWith("hud/"))

    const expectedSet = new Set(expected)
    expect(variants.map(({route}) => route).filter(route => expectedSet.has(route))).toEqual(expected)
    expect(variants.map(({route}) => route).filter(route => !expectedSet.has(route))).toEqual([
      "components/data/inspector-sections/basic/default",
      "components/data/inspector-section/basic/default",
      "components/data/inspector-text-section/basic/default",
      "components/data/status-bar/basic/default",
    ])
    expect(variants).toHaveLength(89)
    expect(variants.filter(({route}) => route === "components/inputs/reference-input/basic/default" ||
      route === "components/inputs/field/reference/default").map(({label}) => label))
      .toEqual(["Выбрано", "Выбрано"])
    for (const subject of catalog.categories.flatMap(({subjects}) => subjects)) {
      const projection = subject.variants.every(({route}) => route.startsWith("hud/"))
        ? "hud"
        : "display"
      expect(subject.presentation).toEqual({
        protocol: "story-presentation/1",
        projection,
        widgets: ["props", "source", "diagnostics"],
      })
      for (const variant of subject.variants) {
        expect(Object.hasOwn(variant, "presentation"), variant.route).toBeFalse()
      }
    }
    for (const variant of variants) {
      const path = resolve(import.meta.dir, variant.module.path)
      expect(existsSync(path), variant.route).toBeTrue()
      expect(readFileSync(path, "utf8"), variant.route)
        .toContain(`export const ${variant.module.export} = defineOwnerStory(`)
    }
  })

  test("derives one direct catalog component node for every exported TSX factory", () => {
    const catalog = json(join(import.meta.dir, "catalog.json")) as Catalog
    const packageJson = json(join(packageRoot, "package.json")) as Readonly<{
      exports: Readonly<Record<string, string>>
    }>
    const factories = new Set<string>()
    for (const target of Object.values(packageJson.exports)) {
      if (!target.endsWith(".tsx")) continue
      const source = readFileSync(resolve(packageRoot, target), "utf8")
      for (const match of source.matchAll(/export function ([A-Z][A-Za-z0-9_]*)\s*\(/gu)) {
        factories.add(match[1]!)
      }
    }
    const subjects = catalog.categories.flatMap(({subjects}) => subjects)
    const componentApiNames = [
      ...catalog.categories
        .filter(({kind}) => kind === "component")
        .map(({apiName}) => apiName!),
      ...subjects
        .filter(({kind}) => kind === "component")
        .map(({apiName}) => apiName!),
    ]
      .sort()
    expect(componentApiNames).toEqual([...factories].sort())
    expect(subjects.filter(({kind}) => kind === "legacy").map(({route, kind}) => ({route, kind})))
      .toEqual([
        {route: "components/data/scrollbar", kind: "legacy"},
      ])
  })

  test("keeps the exact Button family in one primary category", () => {
    const catalog = json(join(import.meta.dir, "catalog.json")) as Catalog
    const button = catalog.categories.find(({id}) => id === "components-button")
    const foundation = catalog.categories.find(({id}) => id === "components-foundation")
    expect(button).toMatchObject({
      label: "Кнопка",
      route: "components/foundation/button",
      kind: "component",
      apiName: "Button",
    })
    expect(button?.subjects.map(({id, label, kind, apiName, variants}) => ({
      id,
      label,
      kind,
      apiName,
      variants: variants.length,
    }))).toEqual([
      {id: "basic", label: "Основные", kind: "section", apiName: undefined, variants: 3},
      {id: "icon", label: "Иконка", kind: "component", apiName: "IconButton", variants: 1},
      {id: "icon-label", label: "Иконка и подпись", kind: "section", apiName: undefined, variants: 2},
      {id: "sizes", label: "Размер", kind: "section", apiName: undefined, variants: 3},
      {id: "color", label: "Цвет", kind: "section", apiName: undefined, variants: 5},
    ])
    expect(button?.subjects.flatMap(({variants}) => variants)
      .every(variant => !Object.hasOwn(variant, "group"))).toBeTrue()
    expect(foundation?.subjects.map(({apiName}) => apiName)).toEqual([
      "Pane",
      "Badge",
      "Typography",
      "Divider",
    ])
  })

  test("documents the complete 176-leaf and 215-overview owner split", () => {
    const baseline = json(join(projectRoot, ".storybook", "route-baseline.json")) as Baseline
    const remap = json(join(projectRoot, ".storybook", "route-remap.json")) as RouteRemap
    expect(baseline.leafRoutes).toHaveLength(176)
    expect(baseline.overviewRoutes).toHaveLength(215)
    expect(remap.leafMappings.map(({from}) => from.route)).toEqual(baseline.leafRoutes)
    expect(remap.overviewMappings.map(({from}) => from.route)).toEqual(baseline.overviewRoutes)
    expect(remap.leafMappings.filter(({to}) => to.packageId === "@ui/components")).toHaveLength(85)
    expect(remap.leafMappings.filter(({to}) => to.packageId === "@zavx0z/dom")).toHaveLength(91)
    expect(remap.unknownRoutesFailClosed).toBeTrue()
    expect(remap.overviewFallback).toBeFalse()
    expect(remap.overviewMappings.filter(({from}) =>
      from.route === "components/foundation/button" ||
      from.route.startsWith("components/foundation/button/")).map(({from, to}) => ({
      from: from.route,
      to: to.route,
      kind: to.kind,
    }))).toEqual([
      {from: "components/foundation/button", to: "components/foundation/button", kind: "category"},
      {from: "components/foundation/button/basic", to: "components/foundation/button/basic", kind: "subject"},
      {from: "components/foundation/button/icon", to: "components/foundation/button/icon", kind: "subject"},
      {from: "components/foundation/button/icon-label", to: "components/foundation/button/icon-label", kind: "subject"},
      {from: "components/foundation/button/sizes", to: "components/foundation/button/sizes", kind: "subject"},
      {from: "components/foundation/button/color", to: "components/foundation/button/color", kind: "subject"},
    ])
    for (const mapping of remap.overviewMappings.filter(({to}) => to.kind === "section-collapse")) {
      expect(baseline.leafRoutes).not.toContain(mapping.to.route)
      expect(mapping.to.reason).toContain("without selecting a leaf")
    }
  })

  test("keeps visual resources byte-exact under their production owner", () => {
    const resourceRoot = join(import.meta.dir, "resources", "references", "icons")
    const provenance = json(join(resourceRoot, "provenance.json")) as Readonly<{
      assets: Readonly<Record<string, string>>
    }>
    for (const [name, digest] of Object.entries(provenance.assets)) {
      expect(createHash("sha256").update(readFileSync(join(resourceRoot, name))).digest("hex"), name)
        .toBe(digest)
    }
  })

  test("mounts one owner story through the structural runtime and disposes it", async () => {
    const document = createDocument()
    let presentation: Readonly<Record<string, unknown>> | null = null
    const session = runtime.create({
      document,
      signal: new AbortController().signal,
      present(value) {
        presentation = value
        document.appendChild(value.node)
      },
      reportDiagnostic() {},
    })
    await session.mount({
      route: story_status_unavailable.route,
      story: story_status_unavailable,
      signal: new AbortController().signal,
    })
    expect(document.childNodes).toHaveLength(1)
    expect(presentation).toEqual(expect.objectContaining({
      protocol: "story-presentation/1",
      node: document.firstChild,
      source: expect.objectContaining({html: expect.any(String), typescript: expect.any(String)}),
      values: {props: expect.any(Object)},
    }))
    expect(Object.keys((presentation as {source: object}).source).sort()).toEqual(["html", "typescript"])
    expect(typeof (presentation as {componentRoot: {readStyleSheets?: unknown}})
      .componentRoot.readStyleSheets).toBe("function")
    session.unmount()
    expect(document.childNodes).toHaveLength(0)
    session.dispose()
    session.dispose()
  })

  test("declares runtime/3 and the exact linked production theme without custom widgets", () => {
    const manifest = json(join(import.meta.dir, "manifest.json")) as Readonly<{
      authorStyleSheets: readonly Readonly<{specifier: string}>[]
    }>
    expect(runtime.protocol).toBe("storybook-runtime/3")
    expect(manifest.authorStyleSheets).toEqual([
      {specifier: "@ui/components/theme.css"}
    ])
    expect(Object.hasOwn(manifest, "widgetContributions")).toBeFalse()
    const runtimeSource = readFileSync(join(import.meta.dir, "runtime.ts"), "utf8")
    for (const forbidden of ["context.mount", "publishSource", "publishProps", "publishInspector"]) {
      expect(runtimeSource).not.toContain(forbidden)
    }
  })

  test("contains no private Storybook package, dependency, import or lifecycle", async () => {
    const manifest = readFileSync(join(projectRoot, "package.json"), "utf8")
    const lock = readFileSync(join(projectRoot, "bun.lock"), "utf8")
    expect(manifest).not.toContain("@ui/storybook")
    expect(manifest).not.toContain("@zavx0z/storybook")
    expect(lock).not.toContain("@ui/storybook")
    expect(lock).not.toContain("@zavx0z/storybook")
    expect(existsSync(join(projectRoot, "packages", "storybook"))).toBeFalse()

    const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mjs,cjs}")
    for await (const path of glob.scan({cwd: projectRoot, onlyFiles: true})) {
      if (path.startsWith("node_modules/") || path.startsWith("dist/")) continue
      const source = readFileSync(join(projectRoot, path), "utf8")
      expect(source, path).not.toMatch(/(?:from\s*|import\s*\()(["'])@zavx0z\/storybook\//u)
    }
  })
})

type Catalog = Readonly<{
  categories: readonly Readonly<{
    id: string
    label?: string
    route?: string
    kind?: string
    apiName?: string
    subjects: readonly Readonly<{
      id: string
      label?: string
      kind: string
      route: string
      apiName?: string
      presentation: Readonly<{
        protocol: "story-presentation/1"
        projection: "display" | "hud"
        widgets: readonly ["props", "source", "diagnostics"]
      }>
      variants: readonly Readonly<{
        label: string
        route: string
        group?: Readonly<{id: string; label: string}>
        module: Readonly<{path: string; export: string}>
      }>[]
    }>[]
  }>[]
}>

type Baseline = Readonly<{leafRoutes: readonly string[]; overviewRoutes: readonly string[]}>
type RouteRemap = Readonly<{
  unknownRoutesFailClosed: boolean
  overviewFallback: boolean
  leafMappings: readonly Readonly<{
    from: Readonly<{route: string}>
    to: Readonly<{packageId: string; route: string}>
  }>[]
  overviewMappings: readonly Readonly<{
    from: Readonly<{route: string}>
    to: Readonly<{kind: string; route: string; reason: string}>
  }>[]
}>

function json(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}
