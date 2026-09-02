import {readdir} from "node:fs/promises"
import {dirname, isAbsolute, join, relative, resolve, sep} from "node:path"

export const dataFiles = Object.freeze({
  inventory: "architecture/package-inventory.json",
  graph: "architecture/dependency-graph.json",
  ownership: "architecture/ownership-ledger.json",
  storybook: "architecture/storybook.json",
  checkUnits: "architecture/check-units.json",
  migration: "migration/manifest.json",
  historyImport: "migration/history-import.json",
  nodeCutover: "migration/node-cutover.json",
  capabilities: "capabilities/evidence-matrix.json",
  sourceSnapshot: "evidence/source-snapshot.json",
  historySnapshot: "evidence/history-snapshot.json",
  nodeCutoverSnapshot: "evidence/node-cutover-snapshot.json",
  nodeR4R5Checkpoint: "evidence/node-r4-r5-checkpoint.json",
  nodeR4ClosureR5Checkpoint: "evidence/node-r4-closure-r5-checkpoint.json",
  nodeR5AppendCheckpoint: "evidence/node-r5-append-checkpoint.json",
  nodeR5TopologyCommitCheckpoint: "evidence/node-r5-topology-commit-checkpoint.json",
  nodeR5TopologyClosureCheckpoint: "evidence/node-r5-topology-closure-checkpoint.json",
  nodeR5TransformCalibrationCheckpoint: "evidence/node-r5-transform-calibration-checkpoint.json",
  nodeR5TransformClosureCheckpoint: "evidence/node-r5-transform-closure-checkpoint.json",
  nodeR5LinkClosureCheckpoint: "evidence/node-r5-link-closure-checkpoint.json",
  nodeR5DenseLifecycleCheckpoint: "evidence/node-r5-dense-lifecycle-checkpoint.json",
  nodeR5OwnerDecisionsCheckpoint: "evidence/node-r5-owner-decisions-checkpoint.json",
  nodeR5BlenderCompatibilityCheckpoint: "evidence/node-r5-blender-compatibility-checkpoint.json",
  nodeR5FinalCandidateCheckpoint: "evidence/node-r5-final-candidate-checkpoint.json",
} as const)

const dependencyFields = Object.freeze({
  dependencies: "dependency",
  peerDependencies: "peer",
  optionalDependencies: "optional",
  devDependencies: "development",
} as const)

const sourceExtensions = Object.freeze([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const)

const ignoredDirectories = new Set(["node_modules", "dist", "coverage", ".git"])

export type DependencyKind = typeof dependencyFields[keyof typeof dependencyFields]

export type InventoryPackage = Readonly<{
  id: string
  packageName: string | null
  version: string | null
  category: string
  sourceRepository: string | null
  sourceManifest: string | null
  destination: string
  state: "external" | "external-node-gated" | "imported" | "proposal"
  namePolicy: "preserve" | "undecided"
  importGate: string
  plannedPublicOwners?: readonly string[]
}>

export type PackageInventory = Readonly<{
  schemaVersion: number
  workspacePatterns: readonly string[]
  legacySuperprojectPackage: string
  externalLibraries: readonly string[]
  externalDevelopmentTools: readonly string[]
  packages: readonly InventoryPackage[]
}>

export type DependencyEdge = Readonly<{
  from: string
  to: string
  kind: DependencyKind
}>

export type DependencyGraph = Readonly<{
  schemaVersion: number
  cyclePolicy: string
  productionKinds: readonly DependencyKind[]
  currentEdges: readonly DependencyEdge[]
  targetLayers: readonly Readonly<{id: string; packages: readonly string[]}>[]
}>

export type OwnershipOwner = Readonly<{
  id: string
  kind: string
  path: string
  revision: string | null
  writable: boolean
  state: string
}>

export type OwnershipGroup = Readonly<{
  id: string
  packages: readonly string[]
  proposalSlots?: readonly string[]
  owners: readonly OwnershipOwner[]
}>

export type OwnershipLedger = Readonly<{
  schemaVersion: number
  invariant: string
  groups: readonly OwnershipGroup[]
}>

export type PackageManifestRecord = Readonly<{
  name: string
  path: string
  directory: string
  manifest: Readonly<Record<string, unknown>>
}>

export type CheckUnit = Readonly<{
  id: string
  state: "workspace" | "external"
  repository: string
  dependsOn: readonly string[]
  command: readonly string[]
}>

export type FoundationData = Readonly<{
  inventory: PackageInventory
  graph: DependencyGraph
  ownership: OwnershipLedger
  storybook: Readonly<Record<string, unknown>>
  checkUnits: Readonly<{schemaVersion: number; units: readonly CheckUnit[]}>
  migration: Readonly<Record<string, unknown>>
  historyImport: Readonly<Record<string, unknown>>
  nodeCutover: Readonly<Record<string, unknown>>
  capabilities: Readonly<Record<string, unknown>>
  sourceSnapshot: Readonly<Record<string, unknown>>
  historySnapshot: Readonly<Record<string, unknown>>
  nodeCutoverSnapshot: Readonly<Record<string, unknown>>
  nodeR4R5Checkpoint: Readonly<Record<string, unknown>>
  nodeR4ClosureR5Checkpoint: Readonly<Record<string, unknown>>
  nodeR5AppendCheckpoint: Readonly<Record<string, unknown>>
  nodeR5TopologyCommitCheckpoint: Readonly<Record<string, unknown>>
  nodeR5TopologyClosureCheckpoint: Readonly<Record<string, unknown>>
  nodeR5TransformCalibrationCheckpoint: Readonly<Record<string, unknown>>
  nodeR5TransformClosureCheckpoint: Readonly<Record<string, unknown>>
  nodeR5LinkClosureCheckpoint: Readonly<Record<string, unknown>>
  nodeR5DenseLifecycleCheckpoint: Readonly<Record<string, unknown>>
  nodeR5OwnerDecisionsCheckpoint: Readonly<Record<string, unknown>>
  nodeR5BlenderCompatibilityCheckpoint: Readonly<Record<string, unknown>>
  nodeR5FinalCandidateCheckpoint: Readonly<Record<string, unknown>>
}>

export async function loadFoundationData(root: string): Promise<FoundationData> {
  const loaded = await Promise.all(Object.values(dataFiles).map(async (path) => [
    path,
    await readJson(join(root, path)),
  ] as const))
  const byPath = new Map(loaded)
  return Object.freeze({
    inventory: byPath.get(dataFiles.inventory) as PackageInventory,
    graph: byPath.get(dataFiles.graph) as DependencyGraph,
    ownership: byPath.get(dataFiles.ownership) as OwnershipLedger,
    storybook: byPath.get(dataFiles.storybook) as Readonly<Record<string, unknown>>,
    checkUnits: byPath.get(dataFiles.checkUnits) as FoundationData["checkUnits"],
    migration: byPath.get(dataFiles.migration) as Readonly<Record<string, unknown>>,
    historyImport: byPath.get(dataFiles.historyImport) as Readonly<Record<string, unknown>>,
    nodeCutover: byPath.get(dataFiles.nodeCutover) as Readonly<Record<string, unknown>>,
    capabilities: byPath.get(dataFiles.capabilities) as Readonly<Record<string, unknown>>,
    sourceSnapshot: byPath.get(dataFiles.sourceSnapshot) as Readonly<Record<string, unknown>>,
    historySnapshot: byPath.get(dataFiles.historySnapshot) as Readonly<Record<string, unknown>>,
    nodeCutoverSnapshot: byPath.get(dataFiles.nodeCutoverSnapshot) as Readonly<Record<string, unknown>>,
    nodeR4R5Checkpoint: byPath.get(dataFiles.nodeR4R5Checkpoint) as Readonly<Record<string, unknown>>,
    nodeR4ClosureR5Checkpoint: byPath.get(
      dataFiles.nodeR4ClosureR5Checkpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5AppendCheckpoint: byPath.get(
      dataFiles.nodeR5AppendCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5TopologyCommitCheckpoint: byPath.get(
      dataFiles.nodeR5TopologyCommitCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5TopologyClosureCheckpoint: byPath.get(
      dataFiles.nodeR5TopologyClosureCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5TransformCalibrationCheckpoint: byPath.get(
      dataFiles.nodeR5TransformCalibrationCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5TransformClosureCheckpoint: byPath.get(
      dataFiles.nodeR5TransformClosureCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5LinkClosureCheckpoint: byPath.get(
      dataFiles.nodeR5LinkClosureCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5DenseLifecycleCheckpoint: byPath.get(
      dataFiles.nodeR5DenseLifecycleCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5OwnerDecisionsCheckpoint: byPath.get(
      dataFiles.nodeR5OwnerDecisionsCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5BlenderCompatibilityCheckpoint: byPath.get(
      dataFiles.nodeR5BlenderCompatibilityCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5FinalCandidateCheckpoint: byPath.get(
      dataFiles.nodeR5FinalCandidateCheckpoint,
    ) as Readonly<Record<string, unknown>>,
  })
}

export async function validateFoundation(
  root: string,
  options: Readonly<{boundariesOnly?: boolean}> = {},
): Promise<Readonly<{packages: number; imports: number; productionEdges: number}>> {
  const data = await loadFoundationData(root)
  validateInventory(data.inventory)
  await validateRootContract(root, data)
  const manifests = await discoverWorkspacePackages(root, data.inventory.workspacePatterns)
  validateOwnership(data.inventory, data.ownership, manifests)
  validateDependencyGraph(data.inventory, data.graph, manifests)
  const imports = await validatePackageBoundaries(root, data.inventory, manifests)
  await validateStorybook(root, data.inventory, data.storybook, manifests)

  if (options.boundariesOnly !== true) {
    validateMigrationCoverage(data)
    validateCheckUnits(data.checkUnits.units, repositoryIds(data.sourceSnapshot))
    validateUniqueCapabilityIds(data.capabilities)
  }

  return Object.freeze({
    packages: manifests.length,
    imports,
    productionEdges: data.graph.currentEdges.filter(({kind}) =>
      data.graph.productionKinds.includes(kind)
    ).length,
  })
}

export function validateInventory(inventory: PackageInventory): void {
  if (inventory.schemaVersion !== 1) throw new Error("Unsupported package inventory schema")
  if (JSON.stringify(inventory.workspacePatterns) !== JSON.stringify(["packages/*"])) {
    throw new Error("Workspace inventory must use only packages/*")
  }
  if (inventory.legacySuperprojectPackage !== "@zavx0z/webxr-space") {
    throw new Error("Unexpected legacy superproject package identity")
  }

  const ids = new Set<string>()
  const names = new Set<string>()
  const destinations = new Set<string>()
  for (const item of inventory.packages) {
    if (ids.has(item.id)) throw new Error(`Duplicate inventory id: ${item.id}`)
    ids.add(item.id)
    if (!/^packages\/[a-z0-9-]+$/u.test(item.destination)) {
      throw new Error(`Invalid package destination: ${item.destination}`)
    }
    if (destinations.has(item.destination)) {
      throw new Error(`Duplicate package destination: ${item.destination}`)
    }
    destinations.add(item.destination)

    if (item.packageName === null) {
      if (item.state !== "proposal" || item.namePolicy !== "undecided") {
        throw new Error(`Unnamed inventory item must remain a proposal: ${item.id}`)
      }
      continue
    }
    if (names.has(item.packageName)) throw new Error(`Duplicate package name: ${item.packageName}`)
    names.add(item.packageName)
    if (item.namePolicy !== "preserve") {
      throw new Error(`Existing package name must be preserved: ${item.packageName}`)
    }
    if (item.sourceRepository === null || item.sourceManifest === null) {
      throw new Error(`Existing package has no source provenance: ${item.packageName}`)
    }
  }
}

async function validateRootContract(root: string, data: FoundationData): Promise<void> {
  const manifest = await readJson(join(root, "package.json"))
  if (manifest.name !== "@zavx0z/webxr-space" || manifest.private !== true) {
    throw new Error("Visual monorepo root must remain the private webxr-space owner")
  }
  if (JSON.stringify(manifest.workspaces) !== JSON.stringify(data.inventory.workspacePatterns)) {
    throw new Error("Root workspace patterns do not match package inventory")
  }
  const dependencies = declaredDependencies(manifest)
  for (const tool of data.inventory.externalDevelopmentTools) {
    if (dependencies.has(tool)) throw new Error(`Root must not install external Storybook tool: ${tool}`)
  }
  const scripts = objectRecordOrEmpty(manifest.scripts)
  if ("storybook" in scripts) throw new Error("Root must not own a Storybook lifecycle")

  const budget = await readJson(join(root, "budgets/github.json"))
  const policy = objectRecord(budget.policy, "GitHub budget policy")
  if (budget.schemaVersion !== 1 || policy.artifactRetentionDays !== 1 ||
    policy.allowLargerRunners !== false) {
    throw new Error("GitHub resource budget drifted")
  }

  const repositoryValues = arrayValue(data.sourceSnapshot.repositories, "source repositories")
  const superproject = repositoryValues
    .map((value) => objectRecord(value, "source repository"))
    .find(({id}) => id === "webxr-space")
  if (superproject === undefined) throw new Error("Source snapshot has no webxr-space record")
  const expectedGitlinks = objectRecord(superproject.indexedGitlinks, "indexed gitlinks")
  const result = Bun.spawnSync(["git", "ls-files", "--stage", "projects"], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().trim())
  const actual = new Map<string, string>()
  for (const line of result.stdout.toString().trim().split("\n").filter(Boolean)) {
    const match = /^(\d+) ([0-9a-f]{40}) \d+\t(.+)$/u.exec(line)
    if (match === null || match[1] !== "160000" || match[2] === undefined || match[3] === undefined) {
      throw new Error(`Invalid transition gitlink: ${line}`)
    }
    actual.set(match[3], match[2])
  }
  if (JSON.stringify(Object.fromEntries([...actual].sort())) !==
    JSON.stringify(Object.fromEntries(Object.entries(expectedGitlinks).sort()))) {
    throw new Error("Transition gitlinks drifted from source evidence")
  }
}

export function validateOwnership(
  inventory: PackageInventory,
  ledger: OwnershipLedger,
  manifests: readonly PackageManifestRecord[],
): void {
  if (ledger.schemaVersion !== 1) throw new Error("Unsupported ownership ledger schema")
  const groupIds = new Set<string>()
  const packageGroups = new Map<string, OwnershipGroup>()
  for (const group of ledger.groups) {
    if (groupIds.has(group.id)) throw new Error(`Duplicate ownership group: ${group.id}`)
    groupIds.add(group.id)
    const writable = group.owners.filter(({writable}) => writable)
    if (group.packages.length > 0 && writable.length !== 1) {
      throw new Error(`Ownership group ${group.id} has ${writable.length} writable owners`)
    }
    if (group.packages.length === 0 && writable.length !== 0) {
      throw new Error(`Proposal group ${group.id} must not have a writable owner`)
    }
    for (const packageName of group.packages) {
      if (packageGroups.has(packageName)) {
        throw new Error(`Package has multiple ownership groups: ${packageName}`)
      }
      packageGroups.set(packageName, group)
    }
  }

  const manifestsByName = new Map(manifests.map((record) => [record.name, record]))
  for (const item of inventory.packages) {
    if (item.packageName === null) continue
    const group = packageGroups.get(item.packageName)
    if (group === undefined) throw new Error(`Package has no ownership group: ${item.packageName}`)
    const writable = group.owners.find(({writable}) => writable)!
    const manifest = manifestsByName.get(item.packageName)
    if (item.state === "imported") {
      if (!writable.id.startsWith("destination:")) {
        throw new Error(`Imported package is not destination-owned: ${item.packageName}`)
      }
      if (manifest === undefined) {
        throw new Error(`Imported package manifest is missing: ${item.packageName}`)
      }
    } else {
      if (!writable.id.startsWith("source:")) {
        throw new Error(`External package is not source-owned: ${item.packageName}`)
      }
      if (manifest !== undefined) {
        throw new Error(`External package is materialized as a second owner: ${item.packageName}`)
      }
    }
  }

  for (const manifest of manifests) {
    const item = inventory.packages.find(({packageName}) => packageName === manifest.name)
    if (item === undefined) throw new Error(`Workspace package is absent from inventory: ${manifest.name}`)
    if (item.destination !== relative(resolve(manifest.directory, "../.."), manifest.directory)) {
      const normalized = manifest.path.replace(/\/package\.json$/u, "")
      if (normalized !== item.destination) {
        throw new Error(`Package destination mismatch for ${manifest.name}: ${normalized}`)
      }
    }
  }
}

export function validateDependencyGraph(
  inventory: PackageInventory,
  graph: DependencyGraph,
  manifests: readonly PackageManifestRecord[],
): void {
  if (graph.schemaVersion !== 1) throw new Error("Unsupported dependency graph schema")
  if (graph.cyclePolicy !== "production-only") {
    throw new Error("Dependency graph must fail closed on production cycles")
  }
  const known = new Set(inventory.packages.flatMap(({packageName}) =>
    packageName === null ? [] : [packageName]
  ))
  const allowedTargets = new Set([
    ...known,
    ...inventory.externalLibraries,
    ...inventory.externalDevelopmentTools,
  ])
  const edgeKeys = new Set<string>()
  for (const edge of graph.currentEdges) {
    if (!known.has(edge.from)) throw new Error(`Unknown dependency source: ${edge.from}`)
    if (!allowedTargets.has(edge.to)) throw new Error(`Unknown dependency target: ${edge.to}`)
    if (!Object.values(dependencyFields).includes(edge.kind)) {
      throw new Error(`Unknown dependency kind: ${edge.kind}`)
    }
    const key = `${edge.from}\0${edge.to}\0${edge.kind}`
    if (edgeKeys.has(key)) throw new Error(`Duplicate dependency edge: ${edge.from} -> ${edge.to}`)
    edgeKeys.add(key)
  }

  validateAcyclicGraph(
    graph.currentEdges.filter(({kind}) => graph.productionKinds.includes(kind)),
  )

  for (const record of manifests) {
    for (const edge of manifestDependencyEdges(record.manifest, known)) {
      const key = `${record.name}\0${edge.to}\0${edge.kind}`
      if (!edgeKeys.has(key)) {
        throw new Error(`Dependency graph is missing ${record.name} -> ${edge.to} (${edge.kind})`)
      }
    }
  }
}

export function validateAcyclicGraph(edges: readonly DependencyEdge[]): void {
  const nodes = new Set<string>()
  for (const {from, to} of edges) {
    nodes.add(from)
    nodes.add(to)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const outgoing = new Map<string, string[]>()
  for (const {from, to} of edges) {
    const targets = outgoing.get(from) ?? []
    targets.push(to)
    outgoing.set(from, targets)
  }

  function visit(node: string, path: readonly string[]): void {
    if (visiting.has(node)) {
      const start = path.indexOf(node)
      throw new Error(`Production dependency cycle: ${[...path.slice(start), node].join(" -> ")}`)
    }
    if (visited.has(node)) return
    visiting.add(node)
    for (const target of outgoing.get(node) ?? []) visit(target, [...path, node])
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of [...nodes].sort()) visit(node, [])
}

export async function discoverWorkspacePackages(
  root: string,
  patterns: readonly string[],
): Promise<PackageManifestRecord[]> {
  if (JSON.stringify(patterns) !== JSON.stringify(["packages/*"])) {
    throw new Error(`Unsupported workspace patterns: ${patterns.join(", ")}`)
  }
  const packagesRoot = join(root, "packages")
  const records: PackageManifestRecord[] = []
  for (const entry of await readdir(packagesRoot, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue
    const directory = join(packagesRoot, entry.name)
    const manifestPath = join(directory, "package.json")
    if (!await Bun.file(manifestPath).exists()) continue
    const manifest = await readJson(manifestPath)
    const name = manifest.name
    if (typeof name !== "string" || name.length === 0) {
      throw new Error(`Invalid workspace package name: ${relative(root, manifestPath)}`)
    }
    records.push(Object.freeze({
      name,
      path: relative(root, manifestPath),
      directory,
      manifest,
    }))
  }
  records.sort((left, right) => left.path.localeCompare(right.path))
  const names = new Set<string>()
  for (const record of records) {
    if (names.has(record.name)) throw new Error(`Duplicate workspace package name: ${record.name}`)
    names.add(record.name)
  }
  return records
}

export async function validatePackageBoundaries(
  root: string,
  inventory: PackageInventory,
  manifests: readonly PackageManifestRecord[],
): Promise<number> {
  const packagesByName = new Map(manifests.map((record) => [record.name, record]))
  let importCount = 0
  for (const record of manifests) {
    validateNoLegacyDependency(record, inventory.legacySuperprojectPackage)
    const declared = declaredDependencies(record.manifest)
    for (const file of await discoverSourceFiles(record.directory)) {
      const text = await Bun.file(file).text()
      for (const specifier of extractModuleSpecifiers(text)) {
        importCount++
        validateImportSpecifier({
          root,
          file,
          owner: record,
          specifier,
          packagesByName,
          declared,
          legacyPackage: inventory.legacySuperprojectPackage,
        })
      }
    }
  }
  return importCount
}

export function validateImportSpecifier(input: Readonly<{
  root: string
  file: string
  owner: PackageManifestRecord
  specifier: string
  packagesByName: ReadonlyMap<string, PackageManifestRecord>
  declared: ReadonlySet<string>
  legacyPackage: string
}>): void {
  const {root, file, owner, specifier, packagesByName, declared, legacyPackage} = input
  if (specifier === legacyPackage || specifier.startsWith(`${legacyPackage}/`)) {
    throw new Error(`Production import of legacy superproject in ${relative(root, file)}`)
  }
  if (specifier.startsWith(".")) {
    const target = resolve(dirname(file), specifier)
    if (!isWithin(owner.directory, target)) {
      throw new Error(`Relative import crosses package boundary in ${relative(root, file)}: ${specifier}`)
    }
    return
  }
  if (isAbsolute(specifier)) {
    throw new Error(`Absolute import is forbidden in ${relative(root, file)}: ${specifier}`)
  }

  const packageName = packageNameFromSpecifier(specifier)
  if (packageName === null) return
  const target = packagesByName.get(packageName)
  if (target === undefined) return
  if (!declared.has(packageName) && packageName !== owner.name) {
    throw new Error(`Undeclared workspace dependency in ${relative(root, file)}: ${packageName}`)
  }
  const subpath = specifier.slice(packageName.length)
  if (subpath.length === 0) return
  const exportKey = `.${subpath}`
  const exports = publicExportKeys(target.manifest)
  if (!exports.has(exportKey)) {
    throw new Error(`Private package import in ${relative(root, file)}: ${specifier}`)
  }
}

export function topologicalCheckUnits(units: readonly CheckUnit[]): CheckUnit[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]))
  if (byId.size !== units.length) throw new Error("Duplicate package check unit")
  const result: CheckUnit[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(id: string, path: readonly string[]): void {
    const unit = byId.get(id)
    if (unit === undefined) throw new Error(`Unknown package check dependency: ${id}`)
    if (visiting.has(id)) {
      const start = path.indexOf(id)
      throw new Error(`Package check cycle: ${[...path.slice(start), id].join(" -> ")}`)
    }
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of unit.dependsOn) visit(dependency, [...path, id])
    visiting.delete(id)
    visited.add(id)
    result.push(unit)
  }

  for (const id of [...byId.keys()].sort()) visit(id, [])
  return result
}

function validateCheckUnits(units: readonly CheckUnit[], repositories: ReadonlySet<string>): void {
  for (const unit of units) {
    if (!repositories.has(unit.repository)) {
      throw new Error(`Check unit ${unit.id} uses unknown repository ${unit.repository}`)
    }
    if (unit.command.length === 0 || unit.command.some((part) => part.length === 0)) {
      throw new Error(`Check unit ${unit.id} has an invalid command`)
    }
  }
  topologicalCheckUnits(units)
}

async function validateStorybook(
  root: string,
  inventory: PackageInventory,
  storybook: Readonly<Record<string, unknown>>,
  manifests: readonly PackageManifestRecord[],
): Promise<void> {
  if (storybook.schemaVersion !== 1 || storybook.lifecycleOwner !== "external-storybook") {
    throw new Error("Invalid Storybook ownership record")
  }
  const constraints = objectRecord(storybook.constraints, "Storybook constraints")
  for (const field of ["dataOnly"] as const) {
    if (constraints[field] !== true) throw new Error(`Storybook ${field} must be true`)
  }
  for (const field of ["ownsServer", "ownsRuntime", "ownsCatalog", "ownsStories", "allowsStorybookDependency"] as const) {
    if (constraints[field] !== false) throw new Error(`Storybook ${field} must be false`)
  }

  const storybookDirectory = join(root, ".storybook")
  const entries = (await readdir(storybookDirectory, {withFileTypes: true}))
    .map(({name}) => name)
    .sort()
  if (JSON.stringify(entries) !== JSON.stringify(["manifest.json"])) {
    throw new Error(`Workspace Storybook must remain data-only: ${entries.join(", ")}`)
  }
  const manifest = await readJson(join(storybookDirectory, "manifest.json"))
  if (manifest.kind !== "workspace" || manifest.id !== "webxr-space" || manifest.schemaVersion !== 1) {
    throw new Error("Invalid external Storybook workspace manifest")
  }
  const projects = arrayValue(manifest.projects, "Storybook projects").map((value) =>
    objectRecord(value, "Storybook project").declaration
  )
  const expected = arrayValue(storybook.transitionDeclarations, "transitionDeclarations").map((value) =>
    objectRecord(value, "transition declaration").reference
  )
  if (JSON.stringify(projects) !== JSON.stringify(expected)) {
    throw new Error("External Storybook declaration order does not match ownership data")
  }

  for (const record of manifests) {
    const dependencies = declaredDependencies(record.manifest)
    for (const tool of inventory.externalDevelopmentTools) {
      if (dependencies.has(tool)) {
        throw new Error(`Workspace package depends on external Storybook tool: ${record.name}`)
      }
    }
    const scripts = objectRecordOrEmpty(record.manifest.scripts)
    if ("storybook" in scripts) {
      throw new Error(`Workspace package owns Storybook lifecycle: ${record.name}`)
    }
  }
}

function validateMigrationCoverage(data: FoundationData): void {
  if (data.migration.schemaVersion !== 1 || data.historyImport.schemaVersion !== 1 ||
    data.nodeCutover.schemaVersion !== 1 || data.sourceSnapshot.schemaVersion !== 1 ||
    data.historySnapshot.schemaVersion !== 1 || data.nodeCutoverSnapshot.schemaVersion !== 1 ||
    data.nodeR4R5Checkpoint.schemaVersion !== 1 ||
    data.nodeR4ClosureR5Checkpoint.schemaVersion !== 1 ||
    data.nodeR5AppendCheckpoint.schemaVersion !== 1 ||
    data.nodeR5TopologyCommitCheckpoint.schemaVersion !== 1 ||
    data.nodeR5TopologyClosureCheckpoint.schemaVersion !== 1 ||
    data.nodeR5TransformCalibrationCheckpoint.schemaVersion !== 1 ||
    data.nodeR5TransformClosureCheckpoint.schemaVersion !== 1 ||
    data.nodeR5LinkClosureCheckpoint.schemaVersion !== 1 ||
    data.nodeR5DenseLifecycleCheckpoint.schemaVersion !== 1 ||
    data.nodeR5OwnerDecisionsCheckpoint.schemaVersion !== 1 ||
    data.nodeR5BlenderCompatibilityCheckpoint.schemaVersion !== 1 ||
    data.nodeR5FinalCandidateCheckpoint.schemaVersion !== 1) {
    throw new Error("Unsupported migration or evidence schema")
  }
  const imported = arrayValue(data.historyImport.imports, "history imports")
    .map((value) => objectRecord(value, "history import").package)
  const expected = data.inventory.packages.flatMap(({packageName, state}) =>
    packageName !== null && state !== "proposal" ? [packageName] : []
  )
  assertExactStringSet("history import coverage", imported, expected)
  const historyEntries = arrayValue(data.historySnapshot.entries, "history snapshot entries")
    .map((value) => objectRecord(value, "history snapshot entry"))
  assertExactStringSet(
    "package-prefix history coverage",
    historyEntries.map(({package: packageName}) => packageName),
    expected,
  )
  const importsByPackage = new Map(imported.map((packageName, index) => [
    packageName,
    objectRecord(arrayValue(data.historyImport.imports, "history imports")[index], "history import"),
  ]))
  for (const entry of historyEntries) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || plan?.sourceRepository !== entry.repository) {
      throw new Error(`History evidence does not match import plan: ${String(entry.package)}`)
    }
    if (typeof entry.commitCount !== "number" || entry.commitCount <= 0) {
      throw new Error(`Package has no prefix history: ${String(entry.package)}`)
    }
  }

  const nodeDestinations = arrayValue(data.nodeCutover.destinationPackages, "Node destinations")
    .map((value) => objectRecord(value, "Node destination"))
  const nodeInventory = data.inventory.packages.filter(({sourceRepository}) => sourceRepository === "node")
  assertExactStringSet(
    "Node package coverage",
    nodeDestinations.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const destination of nodeDestinations) {
    const inventory = nodeInventory.find(({packageName}) => packageName === destination.package)
    if (inventory?.destination !== destination.path) {
      throw new Error(`Node destination mismatch: ${String(destination.package)}`)
    }
  }
  validateNodeCutoverAuthorization(data.nodeCutover.r6Authorization)

  const componentCheckpointPath = "evidence/node-cutover-snapshot.json"
  const r4R5CheckpointPath = "evidence/node-r4-r5-checkpoint.json"
  const closureCheckpointPath = "evidence/node-r4-closure-r5-checkpoint.json"
  const appendCheckpointPath = "evidence/node-r5-append-checkpoint.json"
  const topologyCommitCheckpointPath = "evidence/node-r5-topology-commit-checkpoint.json"
  const topologyClosureCheckpointPath = "evidence/node-r5-topology-closure-checkpoint.json"
  const transformCalibrationCheckpointPath = "evidence/node-r5-transform-calibration-checkpoint.json"
  const transformClosureCheckpointPath = "evidence/node-r5-transform-closure-checkpoint.json"
  const linkClosureCheckpointPath = "evidence/node-r5-link-closure-checkpoint.json"
  const denseLifecycleCheckpointPath = "evidence/node-r5-dense-lifecycle-checkpoint.json"
  const ownerDecisionsCheckpointPath = "evidence/node-r5-owner-decisions-checkpoint.json"
  const compatibilityCheckpointPath = "evidence/node-r5-blender-compatibility-checkpoint.json"
  const latestCheckpointPath = "evidence/node-r5-final-candidate-checkpoint.json"
  const componentRepository = objectRecord(
    data.nodeCutoverSnapshot.repository,
    "Node cutover checkpoint repository",
  )
  const closureRepositories = objectRecord(
    data.nodeR4ClosureR5Checkpoint.repositories,
    "R4 closure checkpoint repositories",
  )
  const closureNode = objectRecord(closureRepositories.node, "R4 closure Node repository")
  const appendRepositories = objectRecord(
    data.nodeR5AppendCheckpoint.repositories,
    "append checkpoint repositories",
  )
  const appendNode = objectRecord(appendRepositories.node, "append Node repository")
  const topologyCommitRepositories = objectRecord(
    data.nodeR5TopologyCommitCheckpoint.repositories,
    "topologyCommit checkpoint repositories",
  )
  const topologyCommitNode = objectRecord(
    topologyCommitRepositories.node,
    "topologyCommit Node repository",
  )
  const topologyClosureRepositories = objectRecord(
    data.nodeR5TopologyClosureCheckpoint.repositories,
    "topology closure checkpoint repositories",
  )
  const topologyClosureNode = objectRecord(
    topologyClosureRepositories.node,
    "topology closure Node repository",
  )
  const topologyClosureRenderer = objectRecord(
    topologyClosureRepositories.renderer,
    "topology closure Renderer repository",
  )
  const calibrationRepositories = objectRecord(
    data.nodeR5TransformCalibrationCheckpoint.repositories,
    "transform calibration checkpoint repositories",
  )
  const calibrationNode = objectRecord(calibrationRepositories.node, "transform calibration Node")
  const transformClosureRepositories = objectRecord(
    data.nodeR5TransformClosureCheckpoint.repositories,
    "transform closure checkpoint repositories",
  )
  const transformClosureNode = objectRecord(
    transformClosureRepositories.node,
    "transform closure Node repository",
  )
  const transformClosureRenderer = objectRecord(
    transformClosureRepositories.renderer,
    "transform closure Renderer repository",
  )
  const linkClosureRepositories = objectRecord(
    data.nodeR5LinkClosureCheckpoint.repositories,
    "Link closure checkpoint repositories",
  )
  const linkClosureNode = objectRecord(linkClosureRepositories.node, "Link closure Node repository")
  const denseRepositories = objectRecord(
    data.nodeR5DenseLifecycleCheckpoint.repositories,
    "dense lifecycle checkpoint repositories",
  )
  const denseNode = objectRecord(denseRepositories.node, "dense lifecycle Node repository")
  const denseRenderer = objectRecord(denseRepositories.renderer, "dense lifecycle Renderer repository")
  const decisionRepositories = objectRecord(
    data.nodeR5OwnerDecisionsCheckpoint.repositories,
    "owner decision checkpoint repositories",
  )
  const decisionNode = objectRecord(decisionRepositories.node, "owner decision Node repository")
  const decisionRenderer = objectRecord(
    decisionRepositories.renderer,
    "owner decision Renderer repository",
  )
  const compatibilityRepositories = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.repositories,
    "Blender compatibility checkpoint repositories",
  )
  const compatibilityNode = objectRecord(compatibilityRepositories.node, "compatibility Node repository")
  const compatibilityRenderer = objectRecord(
    compatibilityRepositories.renderer,
    "compatibility Renderer repository",
  )
  const latestRepositories = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.repositories,
    "latest Node R5 candidate checkpoint repositories",
  )
  const latestNode = objectRecord(latestRepositories.node, "latest Node repository")
  const latestUi = objectRecord(latestRepositories.ui, "latest UI repository")
  const latestRenderer = objectRecord(latestRepositories.renderer, "latest Renderer repository")
  if (data.nodeCutover.observedHead !== latestNode.head ||
    data.nodeCutover.componentCutoverCommit !== componentRepository.head ||
    data.nodeCutover.layoutContractCommit !== closureNode.head ||
    data.nodeCutover.incrementalAppendCommit !== appendNode.head ||
    data.nodeCutover.topologyCommitOptimizationCommit !== topologyCommitNode.head ||
    data.nodeCutover.topologyClosureCommit !== topologyClosureNode.head ||
    data.nodeCutover.transformCalibrationCommit !== calibrationNode.head ||
    data.nodeCutover.transformClosureCommit !== transformClosureNode.head ||
    data.nodeCutover.linkClosureCommit !== linkClosureNode.head ||
    data.nodeCutover.denseLifecycleCommit !== denseNode.head ||
    data.nodeCutover.bundleOwnershipCommit !== decisionNode.head ||
    data.nodeCutover.blenderCompatibilityImplementationCommit !== compatibilityNode.parent ||
    data.nodeCutover.blenderCompatibilityEvidenceCommit !== compatibilityNode.head ||
    data.nodeCutover.finalCandidateEvidenceCommit !== latestNode.head ||
    data.nodeCutover.hiddenTransformRendererCommit !== transformClosureRenderer.parent ||
    data.nodeCutover.hiddenTransformEvidenceCommit !== transformClosureRenderer.head ||
    data.nodeCutover.bulkBackendCleanupCommit !== denseRenderer.parent ||
    data.nodeCutover.bulkBackendCleanupEvidenceCommit !== denseRenderer.head ||
    data.nodeCutover.componentCutoverEvidenceCheckpoint !== componentCheckpointPath ||
    data.nodeCutover.blenderCompatibilityEvidenceCheckpoint !== compatibilityCheckpointPath ||
    data.nodeCutover.previousEvidenceCheckpoint !== compatibilityCheckpointPath ||
    data.nodeCutover.evidenceCheckpoint !== latestCheckpointPath) {
    throw new Error("Node cutover manifest does not match its evidence checkpoint")
  }
  const nodeGroup = data.ownership.groups.find(({id}) => id === "node")
  const nodeOwner = nodeGroup?.owners.find(({id}) => id === "source:node")
  if (nodeOwner === undefined || nodeOwner.revision !== latestNode.head ||
    nodeOwner.writable !== true) {
    throw new Error("Node ownership ledger does not match the current canonical source checkpoint")
  }
  const rendererGroup = data.ownership.groups.find(({id}) => id === "renderer")
  const rendererOwner = rendererGroup?.owners.find(({id}) => id === "source:renderer")
  if (rendererOwner === undefined || rendererOwner.revision !== latestRenderer.head ||
    rendererOwner.writable !== true) {
    throw new Error("Renderer ownership ledger does not match the latest checkpoint")
  }
  const uiGroup = data.ownership.groups.find(({id}) => id === "ui")
  const uiOwner = uiGroup?.owners.find(({id}) => id === "source:ui")
  if (uiOwner === undefined || uiOwner.revision !== latestUi.head || uiOwner.writable !== true) {
    throw new Error("UI ownership ledger does not match the latest checkpoint")
  }
  for (const path of [componentCheckpointPath, r4R5CheckpointPath, closureCheckpointPath]) {
    validateFollowUpSnapshot(data.sourceSnapshot, path, "source snapshot")
    validateFollowUpSnapshot(data.historySnapshot, path, "history snapshot")
  }

  const checkpointHistory = arrayValue(
    data.nodeCutoverSnapshot.packageHistory,
    "Node cutover package history",
  ).map((value) => objectRecord(value, "Node cutover history entry"))
  assertExactStringSet(
    "Node cutover history coverage",
    checkpointHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of checkpointHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Node checkpoint history does not match import plan: ${String(entry.package)}`)
    }
  }

  const previousRepositories = objectRecord(
    data.nodeR4R5Checkpoint.repositories,
    "R4/R5 checkpoint repositories",
  )
  const previousRenderer = objectRecord(previousRepositories.renderer, "R4/R5 Renderer repository")
  const previousRendererHistory = arrayValue(
    data.nodeR4R5Checkpoint.rendererPackageHistory,
    "R4/R5 Renderer package history",
  ).map((value) => objectRecord(value, "R4/R5 Renderer history entry"))
  const rendererInventory = data.inventory.packages.filter(({sourceRepository}) =>
    sourceRepository === "renderer"
  )
  assertExactStringSet(
    "R4/R5 Renderer history coverage",
    previousRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of previousRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Renderer checkpoint history does not match import plan: ${String(entry.package)}`)
    }
  }
  const rendererCapability = objectRecord(
    data.nodeR4R5Checkpoint.rendererInputValueFastPath,
    "Renderer input-value checkpoint",
  )
  if (rendererCapability.capabilityId !== "renderer.features.input-value-fast-path" ||
    rendererCapability.implementationCommit !== previousRenderer.head) {
    throw new Error("Renderer input-value capability does not match the latest checkpoint")
  }
  const contradiction = objectRecord(
    data.nodeR4R5Checkpoint.nodeLayoutContradiction,
    "Node layout contradiction",
  )
  if (contradiction.id !== "contradiction.consumer.node-local-layout" ||
    contradiction.sourceRevision !== componentRepository.head || contradiction.status !== "open") {
    throw new Error("Node layout contradiction does not match the committed source checkpoint")
  }

  const latestNodeHistory = arrayValue(
    data.nodeR4ClosureR5Checkpoint.nodePackageHistory,
    "latest Node package history",
  ).map((value) => objectRecord(value, "latest Node history entry"))
  assertExactStringSet(
    "latest Node history coverage",
    latestNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of latestNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Latest Node history does not match import plan: ${String(entry.package)}`)
    }
  }
  const latestRendererHistory = arrayValue(
    data.nodeR4ClosureR5Checkpoint.rendererPackageHistory,
    "latest Renderer package history",
  ).map((value) => objectRecord(value, "latest Renderer history entry"))
  assertExactStringSet(
    "latest Renderer history coverage",
    latestRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of latestRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Latest Renderer history does not match import plan: ${String(entry.package)}`)
    }
  }
  const r4Closure = objectRecord(data.nodeR4ClosureR5Checkpoint.r4Closure, "R4 closure")
  if (r4Closure.status !== "verified" || r4Closure.commit !== closureNode.head ||
    r4Closure.closedContradiction !== "contradiction.consumer.node-local-layout") {
    throw new Error("R4 closure does not match the latest Node checkpoint")
  }

  const appendNodeHistory = arrayValue(
    data.nodeR5AppendCheckpoint.nodePackageHistory,
    "append Node package history",
  ).map((value) => objectRecord(value, "append Node history entry"))
  assertExactStringSet(
    "append Node history coverage",
    appendNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of appendNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Append Node history does not match import plan: ${String(entry.package)}`)
    }
  }
  const appendRendererHistory = arrayValue(
    data.nodeR5AppendCheckpoint.rendererPackageHistory,
    "append Renderer package history",
  ).map((value) => objectRecord(value, "append Renderer history entry"))
  assertExactStringSet(
    "append Renderer history coverage",
    appendRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of appendRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Append Renderer history does not match import plan: ${String(entry.package)}`)
    }
  }
  const incrementalAppend = objectRecord(
    data.nodeR5AppendCheckpoint.incrementalAppend,
    "incremental append checkpoint",
  )
  if (incrementalAppend.commit !== appendNode.head || incrementalAppend.operation !== "append-node" ||
    incrementalAppend.correctness !== "verified") {
    throw new Error("Incremental append evidence does not match the latest Node checkpoint")
  }

  const topologyNodeHistory = arrayValue(
    data.nodeR5TopologyCommitCheckpoint.nodePackageHistory,
    "topologyCommit Node package history",
  ).map((value) => objectRecord(value, "topologyCommit Node history entry"))
  assertExactStringSet(
    "topologyCommit Node history coverage",
    topologyNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of topologyNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`TopologyCommit Node history does not match import plan: ${String(entry.package)}`)
    }
  }
  const topologyRendererHistory = arrayValue(
    data.nodeR5TopologyCommitCheckpoint.rendererPackageHistory,
    "topologyCommit Renderer package history",
  ).map((value) => objectRecord(value, "topologyCommit Renderer history entry"))
  assertExactStringSet(
    "topologyCommit Renderer history coverage",
    topologyRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of topologyRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`TopologyCommit Renderer history does not match import plan: ${String(entry.package)}`)
    }
  }
  const topologyCommit = objectRecord(
    data.nodeR5TopologyCommitCheckpoint.topologyCommit,
    "topologyCommit checkpoint",
  )
  if (topologyCommit.commit !== topologyCommitNode.head ||
    topologyCommit.status !== "verified-r5-subgate") {
    throw new Error("TopologyCommit evidence does not match the latest Node checkpoint")
  }

  const closureNodeHistory = arrayValue(
    data.nodeR5TopologyClosureCheckpoint.nodePackageHistory,
    "topology closure Node package history",
  ).map((value) => objectRecord(value, "topology closure Node history entry"))
  assertExactStringSet(
    "topology closure Node history coverage",
    closureNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of closureNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Topology closure Node history does not match import plan: ${String(entry.package)}`)
    }
  }
  const closureRendererHistory = arrayValue(
    data.nodeR5TopologyClosureCheckpoint.rendererPackageHistory,
    "topology closure Renderer package history",
  ).map((value) => objectRecord(value, "topology closure Renderer history entry"))
  assertExactStringSet(
    "topology closure Renderer history coverage",
    closureRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of closureRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Topology closure Renderer history does not match import plan: ${String(entry.package)}`)
    }
  }
  const topologyClosure = objectRecord(
    data.nodeR5TopologyClosureCheckpoint.topologyClosure,
    "topology closure checkpoint",
  )
  if (topologyClosure.nodeCommit !== topologyClosureNode.head ||
    topologyClosure.rendererImplementation !== topologyClosureRenderer.parent ||
    topologyClosure.rendererEvidence !== topologyClosureRenderer.head ||
    topologyClosure.status !== "verified-r5-subgate") {
    throw new Error("Topology closure evidence does not match the latest checkpoint")
  }

  const calibrationNodeHistory = arrayValue(
    data.nodeR5TransformCalibrationCheckpoint.nodePackageHistory,
    "transform calibration Node package history",
  ).map((value) => objectRecord(value, "transform calibration Node history entry"))
  assertExactStringSet(
    "transform calibration Node history coverage",
    calibrationNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of calibrationNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Transform calibration Node history mismatch: ${String(entry.package)}`)
    }
  }
  const calibrationRendererHistory = arrayValue(
    data.nodeR5TransformCalibrationCheckpoint.rendererPackageHistory,
    "transform calibration Renderer package history",
  ).map((value) => objectRecord(value, "transform calibration Renderer history entry"))
  assertExactStringSet(
    "transform calibration Renderer history coverage",
    calibrationRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of calibrationRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Transform calibration Renderer history mismatch: ${String(entry.package)}`)
    }
  }
  const calibration = objectRecord(
    data.nodeR5TransformCalibrationCheckpoint.transformCalibration,
    "transform calibration checkpoint",
  )
  if (calibration.commit !== calibrationNode.head || calibration.status !== "partial-r5" ||
    calibration.p99ProcessesFailing !== 2) {
    throw new Error("Transform calibration evidence does not match the latest checkpoint")
  }

  const transformClosureNodeHistory = arrayValue(
    data.nodeR5TransformClosureCheckpoint.nodePackageHistory,
    "transform closure Node package history",
  ).map((value) => objectRecord(value, "transform closure Node history entry"))
  assertExactStringSet(
    "transform closure Node history coverage",
    transformClosureNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of transformClosureNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Transform closure Node history mismatch: ${String(entry.package)}`)
    }
  }
  const transformClosureRendererHistory = arrayValue(
    data.nodeR5TransformClosureCheckpoint.rendererPackageHistory,
    "transform closure Renderer package history",
  ).map((value) => objectRecord(value, "transform closure Renderer history entry"))
  assertExactStringSet(
    "transform closure Renderer history coverage",
    transformClosureRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of transformClosureRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Transform closure Renderer history mismatch: ${String(entry.package)}`)
    }
  }
  const transformClosure = objectRecord(
    data.nodeR5TransformClosureCheckpoint.transformClosure,
    "transform closure checkpoint",
  )
  if (transformClosure.nodeEvidenceCommit !== transformClosureNode.head ||
    transformClosure.rendererImplementation !== transformClosureRenderer.parent ||
    transformClosure.rendererEvidence !== transformClosureRenderer.head ||
    transformClosure.status !== "verified-r5-subgate" ||
    transformClosure.allProcessesPass !== true) {
    throw new Error("Transform closure evidence does not match the latest checkpoint")
  }

  const linkClosureNodeHistory = arrayValue(
    data.nodeR5LinkClosureCheckpoint.nodePackageHistory,
    "Link closure Node package history",
  ).map((value) => objectRecord(value, "Link closure Node history entry"))
  assertExactStringSet(
    "Link closure Node history coverage",
    linkClosureNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of linkClosureNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Link closure Node history mismatch: ${String(entry.package)}`)
    }
  }
  const linkClosureRendererHistory = arrayValue(
    data.nodeR5LinkClosureCheckpoint.rendererPackageHistory,
    "Link closure Renderer package history",
  ).map((value) => objectRecord(value, "Link closure Renderer history entry"))
  assertExactStringSet(
    "Link closure Renderer history coverage",
    linkClosureRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of linkClosureRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Link closure Renderer history mismatch: ${String(entry.package)}`)
    }
  }
  const linkClosure = objectRecord(data.nodeR5LinkClosureCheckpoint.linkClosure, "Link closure checkpoint")
  if (linkClosure.commit !== linkClosureNode.head || linkClosure.status !== "verified-r5-subgates") {
    throw new Error("Link closure evidence does not match the latest checkpoint")
  }

  const denseNodeHistory = arrayValue(
    data.nodeR5DenseLifecycleCheckpoint.nodePackageHistory,
    "dense lifecycle Node package history",
  ).map((value) => objectRecord(value, "dense lifecycle Node history entry"))
  assertExactStringSet(
    "dense lifecycle Node history coverage",
    denseNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of denseNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Dense lifecycle Node history mismatch: ${String(entry.package)}`)
    }
  }
  const denseRendererHistory = arrayValue(
    data.nodeR5DenseLifecycleCheckpoint.rendererPackageHistory,
    "dense lifecycle Renderer package history",
  ).map((value) => objectRecord(value, "dense lifecycle Renderer history entry"))
  assertExactStringSet(
    "dense lifecycle Renderer history coverage",
    denseRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of denseRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Dense lifecycle Renderer history mismatch: ${String(entry.package)}`)
    }
  }
  const backendCleanup = objectRecord(
    data.nodeR5DenseLifecycleCheckpoint.backendCleanup,
    "dense backend cleanup checkpoint",
  )
  if (backendCleanup.implementationCommit !== denseRenderer.parent ||
    backendCleanup.capabilityEvidenceCommit !== denseRenderer.head) {
    throw new Error("Backend cleanup evidence does not match the latest Renderer checkpoint")
  }
  const denseLifecycle = objectRecord(
    data.nodeR5DenseLifecycleCheckpoint.denseLifecycle,
    "dense lifecycle checkpoint",
  )
  const denseCorrectness = objectRecord(denseLifecycle.correctness, "dense lifecycle correctness")
  if (denseLifecycle.status !== "bounded-lifecycle-verified" ||
    denseCorrectness.mounted !== denseCorrectness.disposed || denseCorrectness.observable !== true) {
    throw new Error("Dense lifecycle evidence does not match the latest checkpoint")
  }

  const decisionNodeHistory = arrayValue(
    data.nodeR5OwnerDecisionsCheckpoint.nodePackageHistory,
    "owner decision Node package history",
  ).map((value) => objectRecord(value, "owner decision Node history entry"))
  assertExactStringSet(
    "owner decision Node history coverage",
    decisionNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of decisionNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Owner decision Node history mismatch: ${String(entry.package)}`)
    }
  }
  const decisionRendererHistory = arrayValue(
    data.nodeR5OwnerDecisionsCheckpoint.rendererPackageHistory,
    "owner decision Renderer package history",
  ).map((value) => objectRecord(value, "owner decision Renderer history entry"))
  assertExactStringSet(
    "owner decision Renderer history coverage",
    decisionRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of decisionRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Owner decision Renderer history mismatch: ${String(entry.package)}`)
    }
  }
  const compatibilityNodeHistory = arrayValue(
    data.nodeR5BlenderCompatibilityCheckpoint.nodePackageHistory,
    "Blender compatibility Node package history",
  ).map((value) => objectRecord(value, "Blender compatibility Node history entry"))
  assertExactStringSet(
    "Blender compatibility Node history coverage",
    compatibilityNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of compatibilityNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Blender compatibility Node history mismatch: ${String(entry.package)}`)
    }
  }
  const compatibilityRendererHistory = arrayValue(
    data.nodeR5BlenderCompatibilityCheckpoint.rendererPackageHistory,
    "Blender compatibility Renderer package history",
  ).map((value) => objectRecord(value, "Blender compatibility Renderer history entry"))
  assertExactStringSet(
    "Blender compatibility Renderer history coverage",
    compatibilityRendererHistory.map(({package: packageName}) => packageName),
    rendererInventory.map(({packageName}) => packageName),
  )
  for (const entry of compatibilityRendererHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "renderer") {
      throw new Error(`Blender compatibility Renderer history mismatch: ${String(entry.package)}`)
    }
  }
  const finalNodeHistory = arrayValue(
    data.nodeR5FinalCandidateCheckpoint.nodePackageHistory,
    "final candidate Node package history",
  ).map((value) => objectRecord(value, "final candidate Node history entry"))
  assertExactStringSet(
    "final candidate Node history coverage",
    finalNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of finalNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Final candidate Node history mismatch: ${String(entry.package)}`)
    }
  }
  const uiInventory = data.inventory.packages.filter(({sourceRepository}) => sourceRepository === "ui")
  const finalUiHistory = arrayValue(
    data.nodeR5FinalCandidateCheckpoint.uiPackageHistory,
    "final candidate UI package history",
  ).map((value) => objectRecord(value, "final candidate UI history entry"))
  assertExactStringSet(
    "final candidate UI history coverage",
    finalUiHistory.map(({package: packageName}) => packageName),
    uiInventory.map(({packageName}) => packageName),
  )
  for (const entry of finalUiHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "ui") {
      throw new Error(`Final candidate UI history mismatch: ${String(entry.package)}`)
    }
  }
  const bundleDecision = objectRecord(
    data.nodeR5OwnerDecisionsCheckpoint.bundleOwnerDecision,
    "bundle owner decision",
  )
  if (bundleDecision.commit !== decisionNode.head ||
    bundleDecision.contract !== "nodes-component-ui-bundle/2" ||
    bundleDecision.oldCeilingChanged !== false) {
    throw new Error("Bundle owner decision does not match its append-only checkpoint")
  }
  const technicalR5 = objectRecord(data.nodeR5OwnerDecisionsCheckpoint.technicalR5, "technical R5")
  if (technicalR5.status !== "verified" || latestRenderer.head !== decisionRenderer.head) {
    throw new Error("Technical R5 must remain verified at the owner decision checkpoint")
  }

  const compatibilityProvenance = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.provenance,
    "Blender compatibility provenance",
  )
  if (compatibilityProvenance.previousCheckpoint !== ownerDecisionsCheckpointPath ||
    compatibilityProvenance.preservesPreviousSnapshots !== true ||
    compatibilityProvenance.productionRuntimeChanged !== false ||
    compatibilityProvenance.externalSourceProductionChanged !== true) {
    throw new Error("Blender compatibility checkpoint must append to the owner decision checkpoint")
  }
  const compatibility = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.blenderCompatibility,
    "Blender compatibility evidence",
  )
  if (compatibility.implementationCommit !== compatibilityNode.parent ||
    compatibility.evidenceCommit !== compatibilityNode.head ||
    compatibility.platformCodeChanged !== false ||
    compatibility.status !== "node-owned-4.5-compatibility-corrected-5.2-reference-pending") {
    throw new Error("Blender compatibility evidence does not match the latest Node checkpoint")
  }
  const latestBundle = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.bundleOwnerDecision,
    "latest bundle owner decision",
  )
  const exactBundle = objectRecord(latestBundle.exactNodeEditor, "latest exact NodeEditor bundle")
  const bundleDelta = objectRecord(latestBundle.visualSliceDelta, "latest visual bundle delta")
  if (latestBundle.contract !== "nodes-component-ui-bundle/2" ||
    latestBundle.measurementCommit !== compatibilityNode.head ||
    latestBundle.baselineCommit !== decisionNode.head ||
    exactBundle.bytes !== 277269 || exactBundle.gzipBytes !== 69694 ||
    bundleDelta.bytes !== 1131 || bundleDelta.gzipBytes !== 278 ||
    latestBundle.oldCeilingChanged !== false) {
    throw new Error("Blender compatibility bundle evidence does not match the accepted measurement")
  }
  const latestStorybook = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.storybook,
    "latest Node Storybook evidence",
  )
  const storybookCaptures = arrayValue(latestStorybook.captures, "latest Storybook captures")
    .map((value) => objectRecord(value, "latest Storybook capture"))
  if (latestStorybook.activeRevision !== "6f658a4daf7149e42718cfe1" ||
    latestStorybook.graphDigest !== "daa513c0f6b280d4bd3ed1068a6a06ef650a521fb6a77028b9560c495b184517" ||
    latestStorybook.ready !== true || latestStorybook.presented !== true ||
    storybookCaptures.length !== 2 ||
    !storybookCaptures.some(({sha256}) =>
      sha256 === "923ed85e2b079c40e6c4cd79a71c5fd6f383e7fe5863285667f71bf86b4f1bf9") ||
    !storybookCaptures.some(({sha256}) =>
      sha256 === "484e8ffccdf89bb5167ecfa5cdc197382b9d8a7b97a5fb41c7b6df07429145e1")) {
    throw new Error("Latest Storybook evidence does not match the reproducible captures")
  }
  const referenceBoundary = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.blenderReferenceBoundary,
    "Blender reference boundary",
  )
  const numericCandidate = objectRecord(referenceBoundary.numericRowCandidate, "numeric row candidate")
  if (referenceBoundary.normativeTarget !== "Blender 5.2 LTS" ||
    referenceBoundary.currentReferenceSceneHasNodeGraph !== false ||
    referenceBoundary.exactNoiseNumericContourAvailable !== false ||
    numericCandidate.classification !== "candidate-owner-gap-unconfirmed") {
    throw new Error("Blender 5.2 reference boundary must fail closed without exact node evidence")
  }
  const functionalAcceptance = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.functionalAcceptance,
    "latest Node functional acceptance",
  )
  if (functionalAcceptance.commit !== compatibilityNode.head || functionalAcceptance.pass !== 220 ||
    functionalAcceptance.fail !== 0 || functionalAcceptance.todo !== 1) {
    throw new Error("Latest Node functional acceptance does not match the checkpoint")
  }
  const latestTechnicalR5 = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.technicalR5,
    "latest technical R5",
  )
  if (latestTechnicalR5.status !== "verified") {
    throw new Error("Technical R5 must remain verified at the Blender compatibility checkpoint")
  }

  const finalProvenance = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.provenance,
    "final candidate provenance",
  )
  if (finalProvenance.previousCheckpoint !== compatibilityCheckpointPath ||
    finalProvenance.preservesPreviousSnapshots !== true ||
    finalProvenance.productionRuntimeChanged !== false ||
    finalProvenance.externalSourceProductionChanged !== true) {
    throw new Error("Final candidate checkpoint must append to the Blender compatibility checkpoint")
  }
  if (latestNode.head !== "996619791e9abfc32e5a5139f9f3b1e4bc20e716" ||
    latestNode.parent !== "a72e0e685c8d830d591555aecf164a7d2214d22c" ||
    latestNode.status !== "clean" || latestNode.headContainedByOriginMain !== false ||
    latestUi.head !== "5c351459555ec0980893a1da1c1ee8e7f99de2ed" ||
    latestUi.status !== "clean" || latestUi.headContainedByOriginMain !== false ||
    latestRenderer.head !== "99ce7846e6086ba4c3adebad23acbb6faafa277f" ||
    latestRenderer.status !== "clean" || latestRenderer.headContainedByOriginMain !== false) {
    throw new Error("Final candidate repository revisions do not match the observed clean sources")
  }
  const finalTechnical = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.technicalR5,
    "final technical R5",
  )
  const finalFunctional = objectRecord(finalTechnical.functional, "final functional acceptance")
  const finalBundle = objectRecord(finalTechnical.bundle, "final bundle acceptance")
  const finalExactBundle = objectRecord(finalBundle.exactNodeEditor, "final exact NodeEditor bundle")
  const finalBundleCeiling = objectRecord(finalBundle.ceiling, "final bundle ceiling")
  const finalDenseMemory = objectRecord(finalTechnical.denseMemory, "final dense-memory acceptance")
  const finalOneThousandMemory = objectRecord(finalDenseMemory.oneThousand, "final 1k memory")
  const finalTenThousandMemory = objectRecord(finalDenseMemory.tenThousand, "final 10k memory")
  const finalTopology = objectRecord(finalTechnical.topology, "final topology acceptance")
  const finalOneThousandTopology = objectRecord(finalTopology.oneThousand, "final 1k topology")
  const finalTenThousandTopology = objectRecord(finalTopology.tenThousand, "final 10k topology")
  if (finalTechnical.status !== "verified" || finalFunctional.pass !== 220 ||
    finalFunctional.fail !== 0 || finalFunctional.todo !== 0 ||
    finalBundle.contract !== "nodes-component-ui-bundle/2" ||
    finalExactBundle.bytes !== 278365 || finalExactBundle.gzipBytes !== 70095 ||
    finalExactBundle.sha256 !== "c4263691dd03965bf2b5315f98d4aefc38d6cf90f1c56a2b07c41ca87963559b" ||
    finalBundleCeiling.bytes !== 285000 || finalBundleCeiling.gzipBytes !== 72000 ||
    finalBundle.pass !== true || finalOneThousandMemory.ceilingBytes !== 600000000 ||
    finalTenThousandMemory.ceilingBytes !== 5400000000 || finalDenseMemory.pass !== true ||
    JSON.stringify(finalOneThousandMemory.retainedBytesRange) !== "[566435021,566625377]" ||
    JSON.stringify(finalTenThousandMemory.retainedBytesRange) !== "[5171008087,5171371966]" ||
    finalOneThousandTopology.commitMs !== 12.201 ||
    finalOneThousandTopology.inputToPresentMs !== 12.498 ||
    finalTenThousandTopology.commitMs !== 64.596 ||
    finalTenThousandTopology.inputToPresentMs !== 64.902 ||
    finalTopology.componentMarkers !== 33 || finalTopology.runtimeMounts !== 33 ||
    finalTopology.moves !== 0 || finalTopology.disposes !== 0 || finalTopology.pass !== true) {
    throw new Error("Final technical R5 evidence does not match the executable acceptance")
  }
  const finalReference = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.blender52Reference,
    "final Blender 5.2 reference",
  )
  const finalReferencePixels = objectRecord(finalReference.pixelSize, "final reference pixel size")
  if (finalReference.sha256 !== "6d9dcb739e10bd4a82a1507deadae451fded7fec2ced50c54520d115b6d766f1" ||
    finalReferencePixels.width !== 192 || finalReferencePixels.height !== 328 ||
    finalReference.acceptance !== "candidate" || finalReference.historical45Scope !== "changed") {
    throw new Error("Final Blender 5.2 reference evidence is not exact")
  }
  const finalStorybook = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.storybook,
    "final candidate Storybook evidence",
  )
  const finalCaptures = arrayValue(finalStorybook.captures, "final Storybook captures")
    .map((value) => objectRecord(value, "final Storybook capture"))
  const finalCanvas = objectRecord(finalStorybook.canvas, "final Storybook canvas")
  if (finalStorybook.activeRevision !== "1a3ad15e74d2400c585c626a" ||
    finalStorybook.graphDigest !== "88fc2fa7ad3be10b5f16de28ab4edbaddcf519efc23113ef7e9c8557fd2ae613" ||
    finalStorybook.ready !== true || finalStorybook.presented !== true ||
    arrayValue(finalStorybook.diagnostics, "final Storybook diagnostics").length !== 0 ||
    arrayValue(finalStorybook.consoleErrors, "final Storybook console errors").length !== 0 ||
    finalCanvas.width !== 3840 || finalCanvas.height !== 2176 || finalCanvas.hidden !== false ||
    finalCanvas.nonBlack !== true ||
    finalCaptures.length !== 2 ||
    !finalCaptures.some(({sha256}) =>
      sha256 === "643cebce34e66814e7ae50d649bf487bbd8705db00ca77d98e37c073d55dda2e") ||
    !finalCaptures.some(({sha256}) =>
      sha256 === "4b79ba7b8982d7e856f496960140559b72973271d61095506237fa4ab0143e7b")) {
    throw new Error("Final Storybook evidence does not match the exact candidate captures")
  }
  const finalVisual = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.visualAcceptance,
    "final visual acceptance",
  )
  const finalPlatformGap = objectRecord(finalVisual.platformGap, "final visual platform gap")
  if (finalVisual.status !== "candidate-platform-gap" ||
    finalVisual.ownerVerdict !== "pending-zavx0z" ||
    finalPlatformGap.expected !== "native select disclosure paints a downward chevron" ||
    finalPlatformGap.actual !== "Renderer emits U+25BE but the Engine font paints a damaged vertical glyph" ||
    finalPlatformGap.owner !== "@zavx0z/renderer and @engine/core font coverage" ||
    finalPlatformGap.consumerWorkaroundAdded !== false) {
    throw new Error("Final visual acceptance must fail closed on the platform gap and owner verdict")
  }

  const decisionGates = objectRecord(
    data.nodeR5OwnerDecisionsCheckpoint.effectiveGates,
    "owner decision Node gates",
  )
  const compatibilityGates = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.effectiveGates,
    "Blender compatibility Node gates",
  )
  const gates = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.effectiveGates,
    "final effective Node gates",
  )
  for (const id of ["R1", "R2", "R3", "R4"]) {
    if (decisionGates[id] !== "verified") {
      throw new Error(`Node ${id} must remain verified at the owner decision checkpoint`)
    }
    if (compatibilityGates[id] !== "verified" || gates[id] !== "verified") {
      throw new Error(`Node ${id} must be verified at every current checkpoint`)
    }
  }
  if (decisionGates.R5 !== "owner-decisions-pending" ||
    compatibilityGates.R5 !== "owner-decisions-pending" ||
    gates.R5 !== "platform-gap-and-owner-verdict") {
    throw new Error("Node R5 must advance only to the recorded platform-gap candidate state")
  }
  if (decisionGates.R6 !== "blocked" || compatibilityGates.R6 !== "blocked" ||
    gates.R6 !== "blocked") {
    throw new Error("Node R6 must remain blocked")
  }
}

function validateNodeCutoverAuthorization(value: unknown): void {
  const authorization = objectRecord(value, "Node R6 authorization")
  const fields = [
    "acceptedRevision",
    "remoteRef",
    "r5Accepted",
    "sourceFrozenReadOnly",
    "historyImportAuthorized",
    "ownershipSwitchAuthorized",
    "pushAuthorized",
  ]
  assertExactStringSet("Node R6 authorization fields", Object.keys(authorization), fields)

  const acceptedRevision = authorization.acceptedRevision
  const remoteRef = authorization.remoteRef
  if (acceptedRevision !== null &&
    (typeof acceptedRevision !== "string" || !/^[0-9a-f]{40}$/u.test(acceptedRevision))) {
    throw new Error("Node R6 accepted revision must be null or a full commit hash")
  }
  if (remoteRef !== null &&
    (typeof remoteRef !== "string" || !/^refs\/(heads|tags)\/[A-Za-z0-9._/-]+$/u.test(remoteRef))) {
    throw new Error("Node R6 remote ref must be null or an explicit heads/tags ref")
  }
  if ((acceptedRevision === null) !== (remoteRef === null)) {
    throw new Error("Node R6 accepted revision and remote ref must be selected together")
  }

  for (const field of fields.slice(2)) {
    if (typeof authorization[field] !== "boolean") {
      throw new Error(`Node R6 ${field} must be boolean`)
    }
  }
  if (authorization.historyImportAuthorized === true &&
    (authorization.r5Accepted !== true || authorization.sourceFrozenReadOnly !== true)) {
    throw new Error("Node history import requires accepted R5 and a read-only source freeze")
  }
  if (authorization.ownershipSwitchAuthorized === true &&
    authorization.historyImportAuthorized !== true) {
    throw new Error("Node ownership switch requires an authorized history import")
  }
}

function validateFollowUpSnapshot(
  snapshot: Readonly<Record<string, unknown>>,
  expectedPath: string,
  label: string,
): void {
  const followUps = arrayValue(snapshot.followUpSnapshots, `${label} follow-up snapshots`)
    .map((value) => objectRecord(value, `${label} follow-up snapshot`))
  if (!followUps.some(({path}) => path === expectedPath)) {
    throw new Error(`${label} does not preserve the Node cutover provenance link`)
  }
}

function validateUniqueCapabilityIds(capabilities: Readonly<Record<string, unknown>>): void {
  if (capabilities.schemaVersion !== 1) throw new Error("Unsupported capability matrix schema")
  const ids = arrayValue(capabilities.entries, "capability entries")
    .map((value) => objectRecord(value, "capability entry").id)
  assertExactStringSet("capability ids", ids, ids)
}

function repositoryIds(snapshot: Readonly<Record<string, unknown>>): ReadonlySet<string> {
  return new Set(arrayValue(snapshot.repositories, "source repositories").map((value) => {
    const id = objectRecord(value, "source repository").id
    if (typeof id !== "string") throw new Error("Invalid source repository id")
    return id
  }))
}

function validateNoLegacyDependency(record: PackageManifestRecord, legacyPackage: string): void {
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
    const dependencies = objectRecordOrEmpty(record.manifest[field])
    if (legacyPackage in dependencies) {
      throw new Error(`${record.name} has a production dependency on ${legacyPackage}`)
    }
  }
}

function manifestDependencyEdges(
  manifest: Readonly<Record<string, unknown>>,
  known: ReadonlySet<string>,
): ReadonlyArray<Readonly<{to: string; kind: DependencyKind}>> {
  const edges: Array<Readonly<{to: string; kind: DependencyKind}>> = []
  for (const [field, kind] of Object.entries(dependencyFields) as Array<
    [keyof typeof dependencyFields, DependencyKind]
  >) {
    for (const name of Object.keys(objectRecordOrEmpty(manifest[field]))) {
      if (known.has(name)) edges.push(Object.freeze({to: name, kind}))
    }
  }
  return edges
}

function declaredDependencies(manifest: Readonly<Record<string, unknown>>): ReadonlySet<string> {
  const dependencies = new Set<string>()
  for (const field of Object.keys(dependencyFields) as Array<keyof typeof dependencyFields>) {
    for (const name of Object.keys(objectRecordOrEmpty(manifest[field]))) dependencies.add(name)
  }
  return dependencies
}

function publicExportKeys(manifest: Readonly<Record<string, unknown>>): ReadonlySet<string> {
  const exports = manifest.exports
  if (typeof exports === "string" || Array.isArray(exports)) return new Set(["."])
  if (exports === null || typeof exports !== "object") return new Set(["."])
  const keys = Object.keys(exports)
  if (keys.every((key) => !key.startsWith("."))) return new Set(["."])
  return new Set(keys)
}

async function discoverSourceFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, {withFileTypes: true})) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
      const path = join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
      } else if (entry.isFile() && sourceExtensions.some((extension) => path.endsWith(extension))) {
        files.push(path)
      }
    }
  }
  await visit(directory)
  files.sort()
  return files
}

export function extractModuleSpecifiers(source: string): string[] {
  const found: string[] = []
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(source)) !== null) {
      if (match[1] !== undefined) found.push(match[1])
    }
  }
  return found
}

function packageNameFromSpecifier(specifier: string): string | null {
  if (specifier.startsWith("node:") || specifier.startsWith("bun:")) return null
  const parts = specifier.split("/")
  if (specifier.startsWith("@")) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null
  return parts[0]?.length ? parts[0] : null
}

function isWithin(parent: string, candidate: string): boolean {
  const path = relative(parent, candidate)
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
}

function assertExactStringSet(label: string, actual: readonly unknown[], expected: readonly unknown[]): void {
  if (actual.some((value) => typeof value !== "string") || expected.some((value) => typeof value !== "string")) {
    throw new Error(`${label} contains a non-string value`)
  }
  const actualStrings = actual as readonly string[]
  const expectedStrings = expected as readonly string[]
  if (new Set(actualStrings).size !== actualStrings.length) {
    throw new Error(`${label} contains duplicates`)
  }
  const left = [...actualStrings].sort()
  const right = [...expectedStrings].sort()
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch: ${left.join(", ")} != ${right.join(", ")}`)
  }
}

function arrayValue(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function objectRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Readonly<Record<string, unknown>>
}

function objectRecordOrEmpty(value: unknown): Readonly<Record<string, unknown>> {
  if (value === undefined) return Object.freeze({})
  return objectRecord(value, "manifest field")
}

async function readJson(path: string): Promise<Readonly<Record<string, unknown>>> {
  if (!await Bun.file(path).exists()) throw new Error(`Missing foundation data: ${path}`)
  const value: unknown = await Bun.file(path).json()
  return objectRecord(value, path)
}
