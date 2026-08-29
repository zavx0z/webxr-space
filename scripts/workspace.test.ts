import {describe, expect, test} from "bun:test"
import {mkdir, mkdtemp, realpath, rm, symlink} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {
  assertNearestDependencyOwner,
  assertExternalStorybookWorkspace,
  collectOwnedLinkDependencies,
  externalStorybookProjectDeclarations,
  externalStorybookSchemaUrl,
  discoverConsumerManifests,
  gitlinkPaths,
  validateGitlinkPathViews,
  validateGitlinkRecords,
  workspaceConsumerPaths,
  workspaceLinks,
  workspacePatternsFromManifest,
  type GitlinkPathViews,
  type GitlinkRecord,
} from "./workspace.ts"

const revision = "a".repeat(40)
const root = join(import.meta.dir, "..")

describe("superproject workspace contract", () => {
  test("owns only relative, uniquely named package links", () => {
    expect(workspaceLinks.map(({name}) => name)).toEqual([
      "@engine/core",
      "@zavx0z/dom",
      "@zavx0z/renderer",
      "@zavx0z/renderer-browser",
      "@zavx0z/renderer-webgpu",
      "@zavx0z/react",
      "@zavx0z/dom-devtools",
      "@zavx0z/highlighter",
      "@ui/components",
      "@nodes/layout",
      "@zavx0z/template",
    ])
    expect(new Set(workspaceLinks.map(({name}) => name)).size).toBe(workspaceLinks.length)
    expect(workspaceLinks.every(({path}) => !path.startsWith("/"))).toBeTrue()
  })

  test("pins the independent tool repositories to exact revisions", () => {
    expect(workspaceLinks.filter(({revision}) => revision !== undefined)).toEqual([
      {
        name: "@zavx0z/dom",
        path: "../renderer/packages/dom",
        revision: "d48ab1f561323925fb4a0fa61791f24e5812ea3e",
      },
      {
        name: "@zavx0z/highlighter",
        path: "../highlighter",
        revision: "8d6dbd66fc04ca1109450d18ee3fcffcf6e29606",
      },
    ])
  })

  test("owns only an optional data-only external Storybook composition", async () => {
    await expect(assertExternalStorybookWorkspace(root)).resolves.toBeUndefined()
    expect(externalStorybookSchemaUrl).toBe(
      "https://raw.githubusercontent.com/zavx0z/storybook/main/schemas/manifest.schema.json",
    )
    expect(externalStorybookProjectDeclarations).toEqual([
      {
        id: "engine",
        reference: "../projects/engine/.storybook/manifest.json",
        path: "projects/engine/.storybook/manifest.json",
      },
      {
        id: "ui",
        reference: "../projects/ui/.storybook/manifest.json",
        path: "projects/ui/.storybook/manifest.json",
      },
      {
        id: "nodes",
        reference: "../projects/node/.storybook/manifest.json",
        path: "projects/node/.storybook/manifest.json",
      },
    ])
    const declaration = await Bun.file(join(root, ".storybook/manifest.json")).text()
    expect(declaration).not.toContain("renderer")
    expect(declaration).not.toContain("catalog")
    expect(declaration).not.toContain("runtime")
  })

  test("leaves every child route baseline owner-local and read-only", async () => {
    for (const [project, leaves, overviews] of [
      ["engine", 5, 11],
      ["ui", 176, 215],
      ["node", 159, 66],
    ] as const) {
      const baseline = await Bun.file(join(
        root,
        "projects",
        project,
        ".storybook",
        "route-baseline.json",
      )).json() as {
        schemaVersion: number
        readOnlyBaseline: boolean
        leafRoutes: readonly string[]
        overviewRoutes: readonly string[]
      }
      expect(baseline.schemaVersion, project).toBe(1)
      expect(baseline.readOnlyBaseline, project).toBeTrue()
      expect(baseline.leafRoutes, project).toHaveLength(leaves)
      expect(baseline.overviewRoutes, project).toHaveLength(overviews)
    }
  })

  test("installs every consumer root in dependency order", () => {
    expect(workspaceConsumerPaths).toEqual([
      ".",
      "projects/engine",
      "projects/ui",
      "projects/node",
    ])
  })

  test("accepts exact clean gitlinks", () => {
    expect(() => validateGitlinkRecords(records())).not.toThrow()
  })

  test("fails closed for an extra submodule", () => {
    expect(() => validateGitlinkRecords([
      ...records(),
      record("projects/extra"),
    ])).toThrow("configured submodules mismatch")
  })

  test("fails closed for duplicate paths in every Git view", () => {
    const exact: GitlinkPathViews = {
      configured: gitlinkPaths,
      indexed: gitlinkPaths,
      checkedOut: gitlinkPaths,
    }
    for (const [view, label] of [
      ["configured", "configured submodules"],
      ["indexed", "indexed gitlinks"],
      ["checkedOut", "checked out submodules"],
    ] as const) {
      expect(() => validateGitlinkPathViews({
        ...exact,
        [view]: [...exact[view], "projects/node"],
      })).toThrow(`${label} mismatch`)
    }
  })

  test("fails closed for an adopted child revision", () => {
    const changed = records().map((entry) => entry.path === "projects/node"
      ? {...entry, state: "+", worktreeRevision: "b".repeat(40)}
      : entry)
    expect(() => validateGitlinkRecords(changed)).toThrow(
      "Submodule projects/node is not pinned to the indexed revision",
    )
  })

  test("fails closed for a normal file in place of a gitlink", () => {
    const changed = records().map((entry) => entry.path === "projects/ui"
      ? {...entry, mode: "100644"}
      : entry)
    expect(() => validateGitlinkRecords(changed)).toThrow(
      "Submodule projects/ui is not an indexed gitlink",
    )
  })

  test("owns every linked dependency in every consumer manifest", async () => {
    const expected = new Map<string, string[]>([
      [".", [
        "@engine/core",
        "@nodes/layout",
        "@ui/components",
        "@zavx0z/highlighter",
      ]],
      ["projects/engine", []],
      ["projects/ui", [
        "@zavx0z/react",
        "@zavx0z/template",
      ]],
      ["projects/node", [
        "@engine/core",
        "@zavx0z/dom",
        "@zavx0z/react",
        "@zavx0z/renderer",
        "@zavx0z/renderer-browser",
        "@zavx0z/renderer-webgpu",
        "@zavx0z/template",
      ]],
    ])
    for (const consumerPath of workspaceConsumerPaths) {
      const manifest = await Bun.file(join(root, consumerPath, "package.json")).json()
      expect(collectOwnedLinkDependencies(manifest, consumerPath)).toEqual(expected.get(consumerPath)!)
    }
  })

  test("discovers every repository-owned package", async () => {
    const manifests = (await Promise.all(workspaceConsumerPaths.map((consumerPath) =>
      discoverConsumerManifests(root, consumerPath)
    ))).flat()
    expect(manifests.map(({path}) => path)).toEqual([
      ".",
      "projects/engine",
      "projects/engine/packages/core",
      "projects/ui",
      "projects/ui/packages/components",
      "projects/node",
      "projects/node/packages/core",
      "projects/node/packages/editor",
      "projects/node/packages/layout",
      "projects/node/packages/ui",
      "projects/node/packages/worker",
    ])
    for (const record of manifests) {
      expect(() => collectOwnedLinkDependencies(record.manifest, record.path)).not.toThrow()
    }
  })

  test("rejects unsupported or invalid workspace declarations", () => {
    expect(() => workspacePatternsFromManifest({
      name: "@fixture/workspace",
      workspaces: ["packages/**"],
    }, "fixture")).toThrow("Unsupported workspace pattern packages/** in fixture")
    expect(() => workspacePatternsFromManifest({
      name: "@fixture/workspace",
      workspaces: {packages: ["packages/*"]},
    }, "fixture")).toThrow("Invalid workspaces in fixture")
    expect(() => workspacePatternsFromManifest({
      workspaces: ["packages/*"],
    }, "fixture")).toThrow("Invalid package name in fixture")
  })

  test("fails on a stale nearest dependency before a correct root link", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "webxr-space-links-"))
    try {
      const consumerRoot = join(temporaryRoot, "consumer")
      const manifestDirectory = join(consumerRoot, "packages", "core")
      const owner = join(temporaryRoot, "owner")
      const stale = join(temporaryRoot, "stale")
      const rootScope = join(consumerRoot, "node_modules", "@engine")
      const packageScope = join(manifestDirectory, "node_modules", "@engine")
      await Promise.all([
        mkdir(owner, {recursive: true}),
        mkdir(stale, {recursive: true}),
        mkdir(rootScope, {recursive: true}),
        mkdir(packageScope, {recursive: true}),
      ])
      await symlink(owner, join(rootScope, "core"))
      const nearest = join(packageScope, "core")
      await symlink(stale, nearest)
      const expected = await realpath(owner)
      let failure = ""
      try {
        await assertNearestDependencyOwner(
          manifestDirectory,
          consumerRoot,
          "@engine/core",
          expected,
          "consumer/packages/core",
        )
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error)
      }
      expect(failure).toContain("consumer/packages/core @engine/core resolves to")
      expect(failure).toContain(`expected ${expected}`)

      await rm(nearest)
      await expect(assertNearestDependencyOwner(
        manifestDirectory,
        consumerRoot,
        "@engine/core",
        expected,
        "consumer/packages/core",
      )).resolves.toBeUndefined()
    } finally {
      await rm(temporaryRoot, {recursive: true, force: true})
    }
  })

  test("fails closed for unowned or aliased linked dependencies", () => {
    expect(() => collectOwnedLinkDependencies({
      dependencies: {"@outside/package": "link:@outside/package"},
    }, "fixture")).toThrow("fixture declares unowned linked dependency @outside/package")
    expect(() => collectOwnedLinkDependencies({
      dependencies: {"@engine/core": "link:../engine/packages/core"},
    }, "fixture")).toThrow("fixture must link @engine/core by its exact owner name")
  })
})

function records(): GitlinkRecord[] {
  return gitlinkPaths.map(record)
}

function record(path: string): GitlinkRecord {
  return Object.freeze({
    path,
    branch: "main",
    mode: "160000",
    indexRevision: revision,
    worktreeRevision: revision,
    state: " ",
  })
}
