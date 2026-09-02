import {describe, expect, test} from "bun:test"
import {
  createNodeCutoverPlan,
  type NodeCutoverAuthorization,
  type NodeCutoverPlanInput,
} from "./foundation/plan-node-cutover.ts"
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

  test("keeps the Node cutover plan inert while authorization gates are closed", () => {
    const plan = createNodeCutoverPlan(nodeCutoverInput(blockedNodeAuthorization))

    expect(plan.executable).toBeFalse()
    expect(plan.blockers).toEqual([
      "sourceRevisionExact",
      "remoteRefPresent",
      "remoteBacked",
      "r5Accepted",
      "sourceFrozenReadOnly",
      "historyImportAuthorized",
      "ownershipSwitchAuthorized",
    ])
    expect(plan.invariants).toEqual({
      sourceMutationAllowed: false,
      squash: false,
      createsBranch: false,
      createsWorktree: false,
      executesCommands: false,
      productionImportPerformed: false,
      pushAuthorized: false,
    })
    expect(plan.packages[0]).toMatchObject({
      destination: "packages/nodes-core",
      placeholderFiles: ["README.md"],
      placeholderOnly: true,
    })
    expect(plan.orderedCommands.map(({argv}) => argv)).toContainEqual([
      "git",
      "rm",
      "packages/nodes-core/README.md",
    ])
    expect(plan.orderedCommands.map(({argv}) => argv)).toContainEqual([
      "git",
      "commit",
      "-m",
      "chore: open Node package destinations",
    ])
    expect(plan.orderedCommands.flatMap(({argv}) => argv)).not.toContain("--squash")
    expect(plan.orderedCommands.some(({argv}) => argv[0] === "git" && argv[1] === "push"))
      .toBeFalse()
  })

  test("makes the Node cutover plan ready without coupling it to push authorization", () => {
    const revision = "a".repeat(40)
    const authorization: NodeCutoverAuthorization = Object.freeze({
      acceptedRevision: revision,
      remoteRef: "refs/heads/main",
      r5Accepted: true,
      sourceFrozenReadOnly: true,
      historyImportAuthorized: true,
      ownershipSwitchAuthorized: true,
      pushAuthorized: false,
    })
    const plan = createNodeCutoverPlan(nodeCutoverInput(authorization, {
      observedRevision: revision,
      actualRevision: revision,
      remoteBacked: true,
    }))

    expect(plan.executable).toBeTrue()
    expect(plan.blockers).toEqual([])
    expect(plan.invariants.pushAuthorized).toBeFalse()
    expect(plan.orderedCommands[0]?.argv).toEqual([
      "git",
      "fetch",
      "git@example.invalid:visual/node.git",
      "refs/heads/main:refs/migration/node/source",
    ])
    expect(plan.orderedCommands[1]).toMatchObject({
      argv: ["git", "rev-parse", "refs/migration/node/source^{commit}"],
      expectedStdout: revision,
    })
    expect(plan.packages[0]?.splitCommand).toEqual([
      "git",
      "subtree",
      "split",
      "--prefix=packages/core",
      "refs/migration/node/source",
    ])
    expect(plan.packages[0]?.addCommand).toEqual([
      "git",
      "subtree",
      "add",
      "--prefix=packages/nodes-core",
      "<split:@nodes/core>",
    ])
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

  test("preserves rejected visual evidence and overlays the Checkbox Path checkpoint", async () => {
    const data = await loadFoundationData(root)
    const historicalNode = (data.sourceSnapshot.repositories as unknown[])
      .find((value) => (value as {id?: unknown}).id === "node") as {head: string}
    const checkpointRepository = data.nodeCutoverSnapshot.repository as {head: string}
    const contradictionGates = data.nodeR4R5Checkpoint.effectiveGates as Record<string, string>
    const closureGates = data.nodeR4ClosureR5Checkpoint.effectiveGates as Record<string, string>
    const appendGates = data.nodeR5AppendCheckpoint.effectiveGates as Record<string, string>
    const topologyCommitGates = data.nodeR5TopologyCommitCheckpoint.effectiveGates as Record<string, string>
    const topologyClosureGates = data.nodeR5TopologyClosureCheckpoint.effectiveGates as Record<string, string>
    const calibrationGates = data.nodeR5TransformCalibrationCheckpoint.effectiveGates as Record<string, string>
    const transformClosureGates = data.nodeR5TransformClosureCheckpoint.effectiveGates as Record<string, string>
    const linkClosureGates = data.nodeR5LinkClosureCheckpoint.effectiveGates as Record<string, string>
    const denseLifecycleGates = data.nodeR5DenseLifecycleCheckpoint.effectiveGates as Record<string, string>
    const ownerDecisionGates = data.nodeR5OwnerDecisionsCheckpoint.effectiveGates as Record<string, string>
    const compatibilityGates = data.nodeR5BlenderCompatibilityCheckpoint.effectiveGates as Record<string, string>
    const finalCandidateGates = data.nodeR5FinalCandidateCheckpoint.effectiveGates as Record<string, string>
    const visualClosureGates = data.nodeR5VisualClosureCheckpoint.effectiveGates as Record<string, string>
    const alignmentGates = data.nodeR5SocketAlignmentCheckpoint.effectiveGates as Record<string, string>
    const componentGates = data.nodeR5ComponentDefaultsCheckpoint.effectiveGates as Record<string, string>
    const gates = data.nodeR5CheckboxPathCheckpoint.effectiveGates as Record<string, string>
    const ownerDecisionRepositories = data.nodeR5OwnerDecisionsCheckpoint.repositories as {
      node: {head: string}
      renderer: {head: string}
    }
    const compatibilityRepositories = data.nodeR5BlenderCompatibilityCheckpoint.repositories as {
      node: {head: string}
      renderer: {head: string}
    }
    const finalCandidateRepositories = data.nodeR5FinalCandidateCheckpoint.repositories as {
      node: {head: string}
      ui: {head: string}
      renderer: {head: string}
    }
    const visualClosureRepositories = data.nodeR5VisualClosureCheckpoint.repositories as {
      node: {head: string}
      ui: {head: string}
      renderer: {head: string}
    }
    const alignmentRepositories = data.nodeR5SocketAlignmentCheckpoint.repositories as {
      node: {head: string}
      ui: {head: string}
      renderer: {head: string}
    }
    const componentRepositories = data.nodeR5ComponentDefaultsCheckpoint.repositories as {
      node: {head: string}
      ui: {head: string}
      renderer: {head: string}
    }
    const latestRepositories = data.nodeR5CheckboxPathCheckpoint.repositories as {
      node: {head: string}
      ui: {head: string}
      renderer: {head: string}
    }
    const nodeGroup = data.ownership.groups.find(({id}) => id === "node")!
    const uiGroup = data.ownership.groups.find(({id}) => id === "ui")!
    const rendererGroup = data.ownership.groups.find(({id}) => id === "renderer")!

    expect(historicalNode.head).toBe("209ba2a5e905edeeb6293bdedf47ea483d011c94")
    expect(checkpointRepository.head).toBe("becff8f34a7152791df8e833a918dfe0142681bb")
    expect(contradictionGates.R4).toBe("blocked")
    expect(closureGates.R4).toBe("verified")
    expect(appendGates.R5).toBe("partial-blocked")
    expect(topologyCommitGates.R5).toBe("partial-blocked")
    expect(topologyClosureGates.R5).toBe("partial-blocked")
    expect(calibrationGates.R5).toBe("partial-blocked")
    expect(transformClosureGates.R5).toBe("partial-blocked")
    expect(linkClosureGates.R5).toBe("partial-blocked")
    expect(denseLifecycleGates.R5).toBe("partial-blocked")
    expect(ownerDecisionRepositories.node.head).toBe("176816b1ec89a3485309ff16675cc21c798e06db")
    expect(compatibilityRepositories.node.head).toBe("c399bf312dcb214aa0ed31d631a086bc7be0569d")
    expect(finalCandidateRepositories.node.head).toBe("996619791e9abfc32e5a5139f9f3b1e4bc20e716")
    expect(finalCandidateRepositories.ui.head).toBe("5c351459555ec0980893a1da1c1ee8e7f99de2ed")
    expect(visualClosureRepositories.node.head).toBe("9855abd9683affb8759647ebd27c342ab8b4dda4")
    expect(alignmentRepositories.node.head).toBe("9ddded88425f69e6052687e7dccb4a02fb3016a5")
    expect(componentRepositories.node.head).toBe("1e2450aaceb5d5dbf34239eb7e1252595e053efd")
    expect(latestRepositories.node.head).toBe("b544860e95aea7d57b3d0f0a29d1a8274a5c51b0")
    expect(latestRepositories.ui.head).toBe("90c77080c27d92fea5ee803e8ff1e49d65885ae1")
    expect(latestRepositories.renderer.head).toBe("b6c4845cfacd3c5afc4d6b82d939e95e2bc52a59")
    expect(nodeGroup.owners.find(({id}) => id === "source:node")?.revision).toBe(
      "b544860e95aea7d57b3d0f0a29d1a8274a5c51b0",
    )
    expect(ownerDecisionGates).toEqual({
      R1: "verified",
      R2: "verified",
      R3: "verified",
      R4: "verified",
      R5: "owner-decisions-pending",
      R6: "blocked",
    })
    expect(compatibilityGates).toEqual({
      R1: "verified",
      R2: "verified",
      R3: "verified",
      R4: "verified",
      R5: "owner-decisions-pending",
      R6: "blocked",
    })
    expect(finalCandidateGates).toEqual({
      R1: "verified",
      R2: "verified",
      R3: "verified",
      R4: "verified",
      R5: "platform-gap-and-owner-verdict",
      R6: "blocked",
    })
    expect(visualClosureGates).toEqual({
      R1: "verified",
      R2: "verified",
      R3: "verified",
      R4: "verified",
      R5: "owner-verdict-pending",
      R6: "blocked",
    })
    expect(alignmentGates).toEqual({
      R1: "verified",
      R2: "verified",
      R3: "verified",
      R4: "verified",
      R5: "owner-verdict-pending",
      R6: "blocked",
    })
    expect(componentGates).toEqual(alignmentGates)
    expect(gates).toEqual(alignmentGates)
    expect(uiGroup.owners.find(({id}) => id === "source:ui")?.revision).toBe(
      "90c77080c27d92fea5ee803e8ff1e49d65885ae1",
    )
    expect(rendererGroup.owners.find(({id}) => id === "source:renderer")?.revision).toBe(
      "b6c4845cfacd3c5afc4d6b82d939e95e2bc52a59",
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
    expect((data.nodeR5TopologyClosureCheckpoint.topologyClosure as {nodeCommit: string})
      .nodeCommit).toBe(
      "5d029c2e91b5f807b05459fb6fea94e64e8d4bc7",
    )
    expect((data.nodeR5TransformCalibrationCheckpoint.transformCalibration as {commit: string})
      .commit).toBe(
      "9d7aa6cd35e76cb8eba1b7721c17033edb8610c8",
    )
    expect((data.nodeR5TransformClosureCheckpoint.transformClosure as {nodeEvidenceCommit: string})
      .nodeEvidenceCommit).toBe(
      "be37431b2babe0e2ff18e9296ff45feca30e7ad7",
    )
    expect((data.nodeR5LinkClosureCheckpoint.linkClosure as {commit: string}).commit).toBe(
      "f4519ea1f2271634ce8cd8afa57d1ac5a62a86d1",
    )
    expect((data.nodeR5DenseLifecycleCheckpoint.denseLifecycle as {status: string}).status).toBe(
      "bounded-lifecycle-verified",
    )
    expect((data.nodeR5OwnerDecisionsCheckpoint.technicalR5 as {status: string}).status).toBe(
      "verified",
    )
    expect((data.nodeR5BlenderCompatibilityCheckpoint.blenderCompatibility as {
      implementationCommit: string
    }).implementationCommit).toBe(
      "1bce579a10ee2be4110ee43e10235ee173c2243f",
    )
    expect((data.nodeR5BlenderCompatibilityCheckpoint.blenderReferenceBoundary as {
      normativeTarget: string
      currentReferenceSceneHasNodeGraph: boolean
    })).toMatchObject({
      normativeTarget: "Blender 5.2 LTS",
      currentReferenceSceneHasNodeGraph: false,
    })
    expect((data.nodeR5FinalCandidateCheckpoint.technicalR5 as {
      status: string
      bundle: {pass: boolean}
      denseMemory: {pass: boolean}
      topology: {pass: boolean; componentMarkers: number}
    })).toMatchObject({
      status: "verified",
      bundle: {pass: true},
      denseMemory: {pass: true},
      topology: {pass: true, componentMarkers: 33},
    })
    expect((data.nodeR5FinalCandidateCheckpoint.visualAcceptance as {
      status: string
      ownerVerdict: string
    })).toMatchObject({
      status: "candidate-platform-gap",
      ownerVerdict: "pending-zavx0z",
    })
    expect((data.nodeR5VisualClosureCheckpoint.visualAcceptance as {
      status: string
      ownerVerdict: string
      restoredIndicator: {source: string; platformGap: boolean}
    })).toMatchObject({
      status: "candidate-owner-verdict",
      ownerVerdict: "pending-zavx0z",
      restoredIndicator: {source: "chevronDownIcon", platformGap: false},
    })
    expect((data.nodeR5SocketAlignmentCheckpoint.visualAcceptance as {
      status: string
      previousOwnerVerdict: string
      ownerVerdict: string
    })).toMatchObject({
      status: "candidate-owner-verdict",
      previousOwnerVerdict: "rejected-zavx0z",
      ownerVerdict: "pending-zavx0z",
    })
    expect((data.nodeR5SocketAlignmentCheckpoint.socketAlignment as {
      inputSocketsChecked: number
      outputSocketsChecked: number
      maximumContourDeltaPx: number
    })).toMatchObject({
      inputSocketsChecked: 6,
      outputSocketsChecked: 2,
      maximumContourDeltaPx: 1,
    })
    expect((data.nodeR5ComponentDefaultsCheckpoint.visualAcceptance as {
      status: string
      previousOwnerVerdicts: string[]
      mechanicalGeometryVerified: boolean
      ownerVerdict: string
      parityClaimed: boolean
    })).toEqual({
      status: "candidate-owner-verdict",
      previousOwnerVerdicts: ["rejected-zavx0z", "rejected-zavx0z"],
      mechanicalGeometryVerified: true,
      ownerVerdict: "pending-zavx0z",
      parityClaimed: false,
    })
    expect((data.nodeR5ComponentDefaultsCheckpoint.corrections as {
      node: {
        removesFieldVisualOverrides: boolean
        geometry: {socket: {width: number; height: number}; numberFieldY: number[]}
      }
    }).node).toMatchObject({
      removesFieldVisualOverrides: true,
      geometry: {
        socket: {width: 12, height: 12},
        numberFieldY: [183, 208, 233, 258, 283],
      },
    })
    expect((data.nodeR5ComponentDefaultsCheckpoint.technicalR5 as {
      status: string
      bundle: {exactNodeEditor: {bytes: number; gzipBytes: number}; pass: boolean}
      uiBundle: {exactComponents: {bytes: number; gzipBytes: number}; pass: boolean}
    })).toMatchObject({
      status: "verified",
      bundle: {exactNodeEditor: {bytes: 278439, gzipBytes: 70370}, pass: true},
      uiBundle: {exactComponents: {bytes: 131190, gzipBytes: 31700}, pass: true},
    })
    expect((data.nodeR5CheckboxPathCheckpoint.correction as {
      implementationCommit: string
      capabilityCommit: string
      previousPaint: string
      currentPaint: string
      uiWorkaroundAdded: boolean
      nodeWorkaroundAdded: boolean
    })).toMatchObject({
      implementationCommit: "5e21783b688339fb892cb288a4bd030605191c68",
      capabilityCommit: "b6c4845cfacd3c5afc4d6b82d939e95e2bc52a59",
      previousPaint: "Engine-font text glyph U+2713",
      currentPaint: "retained two-segment Path with 2px stroke",
      uiWorkaroundAdded: false,
      nodeWorkaroundAdded: false,
    })
    expect((data.nodeR5CheckboxPathCheckpoint.pixelEvidence as {
      normalizedReferenceWhiteBox: number[]
      normalizedLiveWhiteBox: number[]
      status: string
    })).toMatchObject({
      normalizedReferenceWhiteBox: [6, 7, 23, 21],
      normalizedLiveWhiteBox: [6, 7, 23, 21],
      status: "exact-normalized-bounds",
    })
    expect((data.nodeR5CheckboxPathCheckpoint.visualAcceptance as {
      status: string
      checkboxDefectClosed: boolean
      ownerVerdict: string
      parityClaimed: boolean
    })).toMatchObject({
      status: "candidate-owner-verdict",
      checkboxDefectClosed: true,
      ownerVerdict: "pending-zavx0z",
      parityClaimed: false,
    })
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

const blockedNodeAuthorization: NodeCutoverAuthorization = Object.freeze({
  acceptedRevision: null,
  remoteRef: null,
  r5Accepted: false,
  sourceFrozenReadOnly: false,
  historyImportAuthorized: false,
  ownershipSwitchAuthorized: false,
  pushAuthorized: false,
})

function nodeCutoverInput(
  authorization: NodeCutoverAuthorization,
  overrides: Partial<NodeCutoverPlanInput> = {},
): NodeCutoverPlanInput {
  return Object.freeze({
    sourcePath: "/fixture/node",
    observedRevision: "b".repeat(40),
    actualRevision: "b".repeat(40),
    sourceClean: true,
    origin: "git@example.invalid:visual/node.git",
    originMain: "b".repeat(40),
    remoteBacked: false,
    worktreeClean: true,
    destinationOwnerReadOnly: true,
    authorization,
    imports: Object.freeze([{
      package: "@nodes/core",
      sourcePrefix: "packages/core",
      destination: "packages/nodes-core",
      placeholderFiles: Object.freeze(["README.md"]),
    }]),
    ...overrides,
  })
}

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
