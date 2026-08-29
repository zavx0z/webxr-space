import {describe, expect, test} from "bun:test"
import {existsSync} from "node:fs"
import {join, resolve} from "node:path"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const coreRoot = resolve(import.meta.dir, "..")

describe("@engine/core external Storybook boundary", () => {
  test("keeps declarations and stories outside the production package contract", async () => {
    const manifest = await Bun.file(join(coreRoot, "package.json")).json() as {
      exports: Record<string, unknown>
      dependencies?: Record<string, string>
    }
    const tsconfig = await Bun.file(join(coreRoot, "tsconfig.json")).json() as {
      include: readonly string[]
    }

    expect(Object.keys(manifest.exports)).toEqual([
      ".",
      "./default-font",
      "./fonts/jetbrains-mono-bold.ttf",
    ])
    expect(manifest.dependencies).toBeUndefined()
    expect(tsconfig.include).toEqual(["src/**/*.ts", "test/**/*.ts"])
    expect(Object.keys(manifest.exports).some((path) => path.includes("storybook"))).toBeFalse()
  })

  test("contains no private Storybook package, lifecycle wrapper or dependency", async () => {
    const rootManifest = await Bun.file(join(repositoryRoot, "package.json")).json() as {
      scripts: Record<string, string>
      devDependencies: Record<string, string>
    }
    const lock = await Bun.file(join(repositoryRoot, "bun.lock")).text()

    expect(existsSync(join(repositoryRoot, "packages/storybook"))).toBeFalse()
    expect(rootManifest.devDependencies["@zavx0z/storybook"]).toBeUndefined()
    expect(Object.values(rootManifest.scripts).join(" ")).not.toContain("packages/storybook")
    expect(lock).not.toContain("@engine/storybook")
    expect(lock).not.toContain("@zavx0z/storybook")
    for (const path of [
      ".storybook/package.json",
      ".storybook/bunfig.toml",
      ".storybook/server.ts",
      ".storybook/build.ts",
      "packages/core/.storybook/package.json",
      "packages/core/.storybook/bunfig.toml",
      "packages/core/.storybook/server.ts",
      "packages/core/.storybook/build.ts",
    ]) expect(existsSync(join(repositoryRoot, path)), path).toBeFalse()
  })

  test("keeps owner modules free of shared Storybook imports and loaders", async () => {
    const glob = new Bun.Glob("**/*.{ts,json,md}")
    for await (const path of glob.scan({cwd: coreRoot, onlyFiles: true})) {
      if (!path.startsWith("storybook/") && !path.startsWith(".storybook/")) continue
      if (path.endsWith(".test.ts")) continue
      const source = await Bun.file(join(coreRoot, path)).text()
      expect(source, path).not.toContain("@zavx0z/storybook")
      expect(source, path).not.toContain("defineStorybookDomCatalog")
    }
    expect(existsSync(join(coreRoot, "storybook/catalog.ts"))).toBeFalse()

    const runtime = await Bun.file(join(coreRoot, ".storybook/runtime.ts")).text()
    const imports = [...runtime.matchAll(/from ["']([^"']+)["']/gu)].map((match) => match[1])
    expect(imports).toEqual(["@engine/core", "../storybook/story.ts"])
  })
})
