import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {
  discoverWorkspacePackages,
  extractModuleSpecifiers,
  loadFoundationData,
  topologicalCheckUnits,
  validateAcyclicGraph,
  validateFoundation,
  validateImportSpecifier,
  validateOwnership,
  type DependencyEdge,
  type PackageManifestRecord,
} from "./foundation/model.ts"

const root = join(import.meta.dir, "..")

describe("visual monorepo M0 foundation", () => {
  test("validates the complete machine-readable foundation", async () => {
    await expect(validateFoundation(root)).resolves.toEqual({
      packages: 0,
      imports: 0,
      productionEdges: 24,
    })
  })

  test("keeps every destination non-canonical and source-free", async () => {
    const data = await loadFoundationData(root)
    const manifests = await discoverWorkspacePackages(root, data.inventory.workspacePatterns)
    expect(manifests).toEqual([])
    for (const item of data.inventory.packages) {
      expect(await Bun.file(join(root, item.destination, "README.md")).exists()).toBeTrue()
      expect(await Bun.file(join(root, item.destination, "package.json")).exists()).toBeFalse()
    }
  })

  test("preserves every existing public package name", async () => {
    const {inventory} = await loadFoundationData(root)
    const existing = inventory.packages.filter(({packageName}) => packageName !== null)
    expect(existing).toHaveLength(14)
    expect(existing.every(({namePolicy}) => namePolicy === "preserve")).toBeTrue()
    expect(inventory.packages.filter(({packageName}) => packageName === null).map(({id}) => id)).toEqual([
      "presentation-components",
      "presentation-layout",
    ])
  })

  test("preserves prior snapshots and overlays the topologyCommit checkpoint", async () => {
    const data = await loadFoundationData(root)
    const historicalNode = (data.sourceSnapshot.repositories as unknown[])
      .find((value) => (value as {id?: unknown}).id === "node") as {head: string}
    const checkpointRepository = data.nodeCutoverSnapshot.repository as {head: string}
    const contradictionGates = data.nodeR4R5Checkpoint.effectiveGates as Record<string, string>
    const closureGates = data.nodeR4ClosureR5Checkpoint.effectiveGates as Record<string, string>
    const appendGates = data.nodeR5AppendCheckpoint.effectiveGates as Record<string, string>
    const gates = data.nodeR5TopologyCommitCheckpoint.effectiveGates as Record<string, string>
    const latestRepositories = data.nodeR5TopologyCommitCheckpoint.repositories as {
      node: {head: string}
      renderer: {head: string}
    }
    const nodeGroup = data.ownership.groups.find(({id}) => id === "node")!
    const rendererGroup = data.ownership.groups.find(({id}) => id === "renderer")!

    expect(historicalNode.head).toBe("209ba2a5e905edeeb6293bdedf47ea483d011c94")
    expect(checkpointRepository.head).toBe("becff8f34a7152791df8e833a918dfe0142681bb")
    expect(contradictionGates.R4).toBe("blocked")
    expect(closureGates.R4).toBe("verified")
    expect(appendGates.R5).toBe("partial-blocked")
    expect(latestRepositories.node.head).toBe("1f4393e077748ed75a278ec327aa352399f1f65f")
    expect(latestRepositories.renderer.head).toBe("a84672deb1573b1e16bffacf801877f1a3633628")
    expect(nodeGroup.owners.find(({id}) => id === "source:node")?.revision).toBe(
      "1f4393e077748ed75a278ec327aa352399f1f65f",
    )
    expect(gates).toEqual({
      R1: "verified",
      R2: "verified",
      R3: "verified",
      R4: "verified",
      R5: "partial-blocked",
      R6: "blocked",
    })
    expect(rendererGroup.owners.find(({id}) => id === "source:renderer")?.revision).toBe(
      "a84672deb1573b1e16bffacf801877f1a3633628",
    )
    expect((data.nodeR4ClosureR5Checkpoint.r4Closure as {closedContradiction: string})
      .closedContradiction).toBe(
      "contradiction.consumer.node-local-layout",
    )
    expect((data.nodeR5AppendCheckpoint.incrementalAppend as {commit: string}).commit).toBe(
      "0b949e73a77f42bcb32bee7f9041d0500d9655e6",
    )
    expect((data.nodeR5TopologyCommitCheckpoint.topologyCommit as {commit: string}).commit).toBe(
      "1f4393e077748ed75a278ec327aa352399f1f65f",
    )
  })

  test("fails closed on a production package cycle", () => {
    const edges: DependencyEdge[] = [
      {from: "@fixture/a", to: "@fixture/b", kind: "dependency"},
      {from: "@fixture/b", to: "@fixture/a", kind: "peer"},
    ]
    expect(() => validateAcyclicGraph(edges)).toThrow(
      "Production dependency cycle: @fixture/a -> @fixture/b -> @fixture/a",
    )
  })

  test("fails closed on duplicate writable canonical owners", async () => {
    const data = await loadFoundationData(root)
    const first = data.ownership.groups[0]!
    const ledger = {
      ...data.ownership,
      groups: [
        {
          ...first,
          owners: first.owners.map((owner) => ({...owner, writable: true})),
        },
        ...data.ownership.groups.slice(1),
      ],
    }
    expect(() => validateOwnership(data.inventory, ledger, [])).toThrow(
      "Ownership group engine has 2 writable owners",
    )
  })

  test("rejects a materialized destination while its source remains canonical", async () => {
    const data = await loadFoundationData(root)
    const duplicate = record("@engine/core", "engine", {exports: {".": "./index.ts"}})
    expect(() => validateOwnership(data.inventory, data.ownership, [duplicate])).toThrow(
      "External package is materialized as a second owner: @engine/core",
    )
  })

  test("extracts static imports, exports, dynamic imports and require", () => {
    expect(extractModuleSpecifiers(`
      import type {A} from "@fixture/a"
      export {B} from "@fixture/b/public"
      import "@fixture/side-effect"
      const lazy = import("@fixture/lazy")
      const legacy = require("@fixture/legacy")
    `)).toEqual([
      "@fixture/a",
      "@fixture/b/public",
      "@fixture/side-effect",
      "@fixture/lazy",
      "@fixture/legacy",
    ])
  })

  test("allows public exports and rejects private package subpaths", () => {
    const owner = record("@fixture/a", "a", {
      dependencies: {"@fixture/b": "workspace:*"},
      exports: {".": "./index.ts"},
    })
    const target = record("@fixture/b", "b", {
      exports: {".": "./index.ts", "./public": "./public.ts"},
    })
    const packages = new Map([[owner.name, owner], [target.name, target]])
    const input = {
      root: "/fixture",
      file: "/fixture/packages/a/index.ts",
      owner,
      packagesByName: packages,
      declared: new Set(["@fixture/b"]),
      legacyPackage: "@zavx0z/webxr-space",
    }
    expect(() => validateImportSpecifier({...input, specifier: "@fixture/b/public"})).not.toThrow()
    expect(() => validateImportSpecifier({...input, specifier: "@fixture/b/src/private"})).toThrow(
      "Private package import",
    )
  })

  test("rejects cross-package relative and legacy superproject imports", () => {
    const owner = record("@fixture/a", "a", {exports: {".": "./index.ts"}})
    const input = {
      root: "/fixture",
      file: "/fixture/packages/a/index.ts",
      owner,
      packagesByName: new Map([[owner.name, owner]]),
      declared: new Set<string>(),
      legacyPackage: "@zavx0z/webxr-space",
    }
    expect(() => validateImportSpecifier({...input, specifier: "../b/index.ts"})).toThrow(
      "Relative import crosses package boundary",
    )
    expect(() => validateImportSpecifier({...input, specifier: "@zavx0z/webxr-space"})).toThrow(
      "Production import of legacy superproject",
    )
  })

  test("orders exact package checks without rewriting their commands", async () => {
    const {checkUnits} = await loadFoundationData(root)
    const ordered = topologicalCheckUnits(checkUnits.units)
    const positions = new Map(ordered.map(({id}, index) => [id, index]))
    expect(positions.get("engine")!).toBeLessThan(positions.get("renderer")!)
    expect(positions.get("template")!).toBeLessThan(positions.get("renderer")!)
    expect(positions.get("ui")!).toBeLessThan(positions.get("node")!)
    expect(checkUnits.units.find(({id}) => id === "renderer")?.command).toEqual([
      "bun",
      "run",
      "check",
    ])
  })
})

function record(
  name: string,
  directoryName: string,
  manifest: Readonly<Record<string, unknown>>,
): PackageManifestRecord {
  const directory = `/fixture/packages/${directoryName}`
  return Object.freeze({
    name,
    path: `packages/${directoryName}/package.json`,
    directory,
    manifest: Object.freeze({name, ...manifest}),
  })
}
