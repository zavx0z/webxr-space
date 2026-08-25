import {describe, expect, test} from "bun:test"
import {join, resolve} from "node:path"

const storybookRoot = import.meta.dir
const legacyRoot = resolve(storybookRoot, "../../storybook/pages/ui")
const sharedImports = new Set([
  "@zavx0z/storybook/route-tree",
  "@zavx0z/storybook/stories",
  "@zavx0z/storybook/workbench",
  "@zavx0z/storybook/environment",
  "@zavx0z/storybook/references",
])

describe("@nodes/ui Storybook owner boundary", () => {
  test("keeps every UI story and fixture beside its semantic owner", async () => {
    expect(await filesBelow(legacyRoot)).toEqual([])
    expect(await filesBelow(storybookRoot)).toEqual(expect.arrayContaining([
      "node-editor.stories.ts",
      "ui-navigation.ts",
      "ui-story-catalog.ts",
      "fixtures/ui-fixtures.ts",
      "state/controlled-field-state.ts",
      "surfaces/story-preview-surface.ts",
      "evidence/retained-observer.ts",
    ]))
  })

  test("imports only exact shared Storybook subpaths", async () => {
    const usedSharedImports = new Set<string>()
    for (const path of await filesBelow(storybookRoot)) {
      if (!path.endsWith(".ts")) continue
      const source = await Bun.file(join(storybookRoot, path)).text()
      for (const specifier of importedSpecifiers(source)) {
        expect(specifier, path).not.toMatch(/^@ui\/storybook(?:\/|$)/u)
        expect(specifier, path).not.toBe("@zavx0z/storybook")
        if (!specifier.startsWith("@zavx0z/storybook/")) continue
        expect(sharedImports.has(specifier), `${path}: ${specifier}`).toBeTrue()
        usedSharedImports.add(specifier)
      }
    }
    expect(usedSharedImports).toEqual(new Set([
      "@zavx0z/storybook/route-tree",
      "@zavx0z/storybook/stories",
      "@zavx0z/storybook/workbench",
      "@zavx0z/storybook/environment",
    ]))
  })

  test("does not expose or depend on Storybook in the production package", async () => {
    const manifest = await Bun.file(resolve(storybookRoot, "../package.json")).json() as {
      exports: Readonly<Record<string, string>>
      dependencies: Readonly<Record<string, string>>
    }
    expect(Object.keys(manifest.exports).some((path) => path.includes("storybook"))).toBeFalse()
    expect(manifest.dependencies["@zavx0z/storybook"]).toBeUndefined()
    expect(manifest.dependencies[["@ui", "storybook"].join("/")]).toBeUndefined()
  })
})

function importedSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/(?:from\s+|import\s*\(\s*)(["'])([^"']+)\1/gu)]
    .flatMap((match) => match[2] === undefined ? [] : [match[2]])
}

async function filesBelow(root: string): Promise<readonly string[]> {
  const files: string[] = []
  const glob = new Bun.Glob("**/*")
  for await (const path of glob.scan({cwd: root, onlyFiles: true})) files.push(path)
  return files.sort()
}
