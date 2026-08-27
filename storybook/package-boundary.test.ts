import {describe, expect, test} from "bun:test"
import {access} from "node:fs/promises"
import {join, resolve} from "node:path"

const storybookRoot = import.meta.dir
const legacyRoot = resolve(storybookRoot, "../../storybook/pages/ui")
const sharedImports = new Set([
  "@zavx0z/storybook/stories",
  "@zavx0z/storybook/environment",
])

describe("@nodes/ui Storybook owner boundary", () => {
  test("keeps every UI story and fixture beside its semantic owner", async () => {
    expect(await filesBelow(legacyRoot)).toEqual([])
    expect(await filesBelow(join(storybookRoot, ".missing-owner-root"))).toEqual([])
    expect(await filesBelow(storybookRoot)).toEqual(expect.arrayContaining([
      "parameter-catalog.ts",
      "socket-catalog.ts",
      "dom/graph-story.ts",
      "dom/node-tree-editor-story.ts",
      "dom/parameter-socket-story.ts",
      "dom/remaining-dom-story.ts",
      "dom/remaining-dom-data.ts",
      "dom/remaining-route-catalog.ts",
    ]))
    for (const removed of [
      "node-ui-story.ts",
      "ui-story-catalog.ts",
      "stories/node-components.ts",
      "stories/parameter.ts",
      "stories/socket.ts",
      "stories/socket-overview.ts",
      "fixtures/ui-fixtures.ts",
      "fixtures/parameter-fixtures.ts",
      "state/controlled-field-state.ts",
      "surfaces/reference-surfaces.ts",
    ]) expect(await Bun.file(join(storybookRoot, removed)).exists(), removed).toBeFalse()
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
      "@zavx0z/storybook/stories",
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
  try {
    await access(root)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
  const files: string[] = []
  const glob = new Bun.Glob("**/*")
  for await (const path of glob.scan({cwd: root, onlyFiles: true})) files.push(path)
  return files.sort()
}
