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
  test("preserves all 85 ordered UI/HUD leaves through static module exports", () => {
    const catalog = json(join(import.meta.dir, "catalog.json")) as Catalog
    const variants = catalog.categories.flatMap((category) =>
      category.subjects.flatMap((subject) => subject.variants))
    const baseline = json(join(projectRoot, ".storybook", "route-baseline.json")) as Baseline
    const expected = baseline.leafRoutes.filter((route) =>
      route.startsWith("components/") || route.startsWith("hud/"))

    expect(variants.map(({route}) => route)).toEqual(expected)
    expect(variants).toHaveLength(85)
    for (const variant of variants) {
      const path = resolve(import.meta.dir, variant.module.path)
      expect(existsSync(path), variant.route).toBeTrue()
      expect(readFileSync(path, "utf8"), variant.route)
        .toContain(`export const ${variant.module.export} = defineOwnerStory(`)
    }
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
    let source: unknown = null
    const session = runtime.create({
      document,
      signal: new AbortController().signal,
      mount: (node) => document.appendChild(node),
      publishInspector() {},
      publishProps() {},
      publishSource: (value) => { source = value },
      reportDiagnostic() {},
    })
    await session.mount({
      route: story_status_unavailable.route,
      story: story_status_unavailable,
      signal: new AbortController().signal,
    })
    expect(document.childNodes).toHaveLength(1)
    expect(source).not.toBeNull()
    session.unmount()
    expect(document.childNodes).toHaveLength(0)
    session.dispose()
    session.dispose()
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
    subjects: readonly Readonly<{
      variants: readonly Readonly<{
        route: string
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
