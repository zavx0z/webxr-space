import {describe, expect, test} from "bun:test"
import {dirname, resolve} from "node:path"

type Catalog = Readonly<{
  categories: readonly Readonly<{
    id: string
    route: string
    subjects: readonly Readonly<{
      id: string
      route: string
      variants: readonly Readonly<{
        route: string
        module: Readonly<{path: string; export: string}>
      }>[]
    }>[]
  }>[]
}>

const catalogPath = resolve(import.meta.dir, "../.storybook/catalog.json")
const baselinePath = resolve(import.meta.dir, "../../../.storybook/route-baseline.json")

describe("@engine/core external route parity", () => {
  test("preserves exact ordered leaves, overviews and hashes", async () => {
    const catalog = await Bun.file(catalogPath).json() as Catalog
    const baseline = await Bun.file(baselinePath).json() as {
      leafRoutes: readonly string[]
      overviewRoutes: readonly string[]
      hashes: Readonly<{leafRoutes: string; overviewRoutes: string}>
    }
    const leaves = catalog.categories.flatMap(({subjects}) =>
      subjects.flatMap(({variants}) => variants.map(({route}) => route)))
    const overviews = [
      "",
      ...catalog.categories.flatMap((category) => [
        category.route,
        ...category.subjects.map((subject) => subject.route),
      ]),
    ]

    expect(leaves).toEqual([...baseline.leafRoutes])
    expect(overviews).toEqual([...baseline.overviewRoutes])
    expect(routeHash(leaves)).toBe(baseline.hashes.leafRoutes)
    expect(routeHash(overviews)).toBe(baseline.hashes.overviewRoutes)
  })

  test("binds every leaf to one exact owner export without executing a catalog loader", async () => {
    const catalog = await Bun.file(catalogPath).json() as Catalog
    const modules = catalog.categories.flatMap(({subjects}) =>
      subjects.flatMap(({variants}) => variants.map((variant) => variant.module)))
    expect(modules).toHaveLength(5)
    for (const reference of modules) {
      const path = resolve(dirname(catalogPath), reference.path)
      const loaded = await import(path)
      expect(loaded[reference.export], `${reference.path}#${reference.export}`).toBeDefined()
    }
  })
})

function routeHash(routes: readonly string[]): string {
  return new Bun.CryptoHasher("sha256").update(routes.join("\n")).digest("hex")
}
