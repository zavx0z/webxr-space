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
  nodeR5VisualClosureCheckpoint: "evidence/node-r5-visual-closure-checkpoint.json",
  nodeR5SocketAlignmentCheckpoint: "evidence/node-r5-socket-alignment-checkpoint.json",
  nodeR5ComponentDefaultsCheckpoint: "evidence/node-r5-component-defaults-checkpoint.json",
  nodeR5CheckboxPathCheckpoint: "evidence/node-r5-checkbox-path-checkpoint.json",
  nodeR5CollapseIconCheckpoint: "evidence/node-r5-collapse-icon-checkpoint.json",
  nodeR5SocketHoverCheckpoint: "evidence/node-r5-socket-hover-checkpoint.json",
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
  nodeR5VisualClosureCheckpoint: Readonly<Record<string, unknown>>
  nodeR5SocketAlignmentCheckpoint: Readonly<Record<string, unknown>>
  nodeR5ComponentDefaultsCheckpoint: Readonly<Record<string, unknown>>
  nodeR5CheckboxPathCheckpoint: Readonly<Record<string, unknown>>
  nodeR5CollapseIconCheckpoint: Readonly<Record<string, unknown>>
  nodeR5SocketHoverCheckpoint: Readonly<Record<string, unknown>>
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
    nodeR5VisualClosureCheckpoint: byPath.get(
      dataFiles.nodeR5VisualClosureCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5SocketAlignmentCheckpoint: byPath.get(
      dataFiles.nodeR5SocketAlignmentCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5ComponentDefaultsCheckpoint: byPath.get(
      dataFiles.nodeR5ComponentDefaultsCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5CheckboxPathCheckpoint: byPath.get(
      dataFiles.nodeR5CheckboxPathCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5CollapseIconCheckpoint: byPath.get(
      dataFiles.nodeR5CollapseIconCheckpoint,
    ) as Readonly<Record<string, unknown>>,
    nodeR5SocketHoverCheckpoint: byPath.get(
      dataFiles.nodeR5SocketHoverCheckpoint,
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
    data.nodeR5FinalCandidateCheckpoint.schemaVersion !== 1 ||
    data.nodeR5VisualClosureCheckpoint.schemaVersion !== 1 ||
    data.nodeR5SocketAlignmentCheckpoint.schemaVersion !== 1 ||
    data.nodeR5ComponentDefaultsCheckpoint.schemaVersion !== 1 ||
    data.nodeR5CheckboxPathCheckpoint.schemaVersion !== 1 ||
    data.nodeR5CollapseIconCheckpoint.schemaVersion !== 1 ||
    data.nodeR5SocketHoverCheckpoint.schemaVersion !== 1) {
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
  const finalCandidateCheckpointPath = "evidence/node-r5-final-candidate-checkpoint.json"
  const visualClosureCheckpointPath = "evidence/node-r5-visual-closure-checkpoint.json"
  const socketAlignmentCheckpointPath = "evidence/node-r5-socket-alignment-checkpoint.json"
  const componentDefaultsCheckpointPath = "evidence/node-r5-component-defaults-checkpoint.json"
  const checkboxCheckpointPath = "evidence/node-r5-checkbox-path-checkpoint.json"
  const collapseIconCheckpointPath = "evidence/node-r5-collapse-icon-checkpoint.json"
  const latestCheckpointPath = "evidence/node-r5-socket-hover-checkpoint.json"
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
  const finalCandidateRepositories = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.repositories,
    "final Node R5 candidate checkpoint repositories",
  )
  const finalCandidateNode = objectRecord(finalCandidateRepositories.node, "final candidate Node repository")
  const finalCandidateUi = objectRecord(finalCandidateRepositories.ui, "final candidate UI repository")
  const finalCandidateRenderer = objectRecord(
    finalCandidateRepositories.renderer,
    "final candidate Renderer repository",
  )
  const visualClosureRepositories = objectRecord(
    data.nodeR5VisualClosureCheckpoint.repositories,
    "Node R5 visual closure checkpoint repositories",
  )
  const visualClosureNode = objectRecord(visualClosureRepositories.node, "visual closure Node repository")
  const visualClosureUi = objectRecord(visualClosureRepositories.ui, "visual closure UI repository")
  const visualClosureRenderer = objectRecord(
    visualClosureRepositories.renderer,
    "visual closure Renderer repository",
  )
  const latestRepositories = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.repositories,
    "latest Node R5 Socket alignment checkpoint repositories",
  )
  const latestNode = objectRecord(latestRepositories.node, "latest Node repository")
  const latestUi = objectRecord(latestRepositories.ui, "latest UI repository")
  const latestRenderer = objectRecord(latestRepositories.renderer, "latest Renderer repository")
  const currentRepositories = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.repositories,
    "current Node R5 component defaults checkpoint repositories",
  )
  const currentNode = objectRecord(currentRepositories.node, "current Node repository")
  const currentUi = objectRecord(currentRepositories.ui, "current UI repository")
  const currentRenderer = objectRecord(currentRepositories.renderer, "current Renderer repository")
  const checkboxRepositories = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.repositories,
    "latest Node R5 Checkbox Path checkpoint repositories",
  )
  const checkboxNode = objectRecord(checkboxRepositories.node, "latest Checkbox Node repository")
  const checkboxUi = objectRecord(checkboxRepositories.ui, "latest Checkbox UI repository")
  const checkboxRenderer = objectRecord(checkboxRepositories.renderer, "latest Checkbox Renderer repository")
  const collapseRepositories = objectRecord(
    data.nodeR5CollapseIconCheckpoint.repositories,
    "Node R5 collapse icon checkpoint repositories",
  )
  const collapseNode = objectRecord(collapseRepositories.node, "collapse icon Node repository")
  const collapseUi = objectRecord(collapseRepositories.ui, "collapse icon UI repository")
  const collapseRenderer = objectRecord(collapseRepositories.renderer, "collapse icon Renderer repository")
  const hoverRepositories = objectRecord(
    data.nodeR5SocketHoverCheckpoint.repositories,
    "latest Node R5 Socket hover checkpoint repositories",
  )
  const hoverNode = objectRecord(hoverRepositories.node, "latest Socket hover Node repository")
  const hoverUi = objectRecord(hoverRepositories.ui, "latest Socket hover UI repository")
  const hoverRenderer = objectRecord(hoverRepositories.renderer, "latest Socket hover Renderer repository")
  const hoverTemplate = objectRecord(hoverRepositories.template, "latest Socket hover Template repository")
  if (data.nodeCutover.observedHead !== hoverNode.head ||
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
    data.nodeCutover.finalCandidateEvidenceCommit !== finalCandidateNode.head ||
    data.nodeCutover.visualClosureEvidenceCommit !== visualClosureNode.head ||
    data.nodeCutover.socketAlignmentImplementationCommit !== latestNode.parent ||
    data.nodeCutover.socketAlignmentEvidenceCommit !== latestNode.head ||
    data.nodeCutover.componentDefaultsNodeCommit !== currentNode.head ||
    data.nodeCutover.componentDefaultsUiCommit !== currentUi.head ||
    data.nodeCutover.themeRadiusRendererImplementationCommit !== currentRenderer.parent ||
    data.nodeCutover.themeRadiusRendererEvidenceCommit !== currentRenderer.head ||
    data.nodeCutover.checkboxPathRendererImplementationCommit !== checkboxRenderer.parent ||
    data.nodeCutover.checkboxPathRendererEvidenceCommit !== checkboxRenderer.head ||
    data.nodeCutover.checkboxPathNodeEvidenceCommit !== checkboxNode.head ||
    data.nodeCutover.collapseIconNodeCommit !== collapseNode.head ||
    data.nodeCutover.socketHoverTemplateCapabilityCommit !== hoverTemplate.head ||
    data.nodeCutover.socketHoverNodeCommit !== hoverNode.head ||
    data.nodeCutover.hiddenTransformRendererCommit !== transformClosureRenderer.parent ||
    data.nodeCutover.hiddenTransformEvidenceCommit !== transformClosureRenderer.head ||
    data.nodeCutover.bulkBackendCleanupCommit !== denseRenderer.parent ||
    data.nodeCutover.bulkBackendCleanupEvidenceCommit !== denseRenderer.head ||
    data.nodeCutover.componentCutoverEvidenceCheckpoint !== componentCheckpointPath ||
    data.nodeCutover.blenderCompatibilityEvidenceCheckpoint !== compatibilityCheckpointPath ||
    data.nodeCutover.previousEvidenceCheckpoint !== collapseIconCheckpointPath ||
    data.nodeCutover.evidenceCheckpoint !== latestCheckpointPath) {
    throw new Error("Node cutover manifest does not match its evidence checkpoint")
  }
  const nodeGroup = data.ownership.groups.find(({id}) => id === "node")
  const nodeOwner = nodeGroup?.owners.find(({id}) => id === "source:node")
  if (nodeOwner === undefined || nodeOwner.revision !== hoverNode.head ||
    nodeOwner.writable !== true) {
    throw new Error("Node ownership ledger does not match the current canonical source checkpoint")
  }
  const rendererGroup = data.ownership.groups.find(({id}) => id === "renderer")
  const rendererOwner = rendererGroup?.owners.find(({id}) => id === "source:renderer")
  if (rendererOwner === undefined || rendererOwner.revision !== hoverRenderer.head ||
    rendererOwner.writable !== true) {
    throw new Error("Renderer ownership ledger does not match the latest checkpoint")
  }
  const uiGroup = data.ownership.groups.find(({id}) => id === "ui")
  const uiOwner = uiGroup?.owners.find(({id}) => id === "source:ui")
  if (uiOwner === undefined || uiOwner.revision !== hoverUi.head || uiOwner.writable !== true) {
    throw new Error("UI ownership ledger does not match the latest checkpoint")
  }
  const templateGroup = data.ownership.groups.find(({id}) => id === "template")
  const templateOwner = templateGroup?.owners.find(({id}) => id === "source:template")
  if (templateOwner === undefined || templateOwner.revision !== hoverTemplate.head ||
    templateOwner.writable !== true) {
    throw new Error("Template ownership ledger does not match the latest checkpoint")
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
  const visualClosureNodeHistory = arrayValue(
    data.nodeR5VisualClosureCheckpoint.nodePackageHistory,
    "visual closure Node package history",
  ).map((value) => objectRecord(value, "visual closure Node history entry"))
  assertExactStringSet(
    "visual closure Node history coverage",
    visualClosureNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of visualClosureNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Visual closure Node history mismatch: ${String(entry.package)}`)
    }
  }
  const visualClosureUiHistory = arrayValue(
    data.nodeR5VisualClosureCheckpoint.uiPackageHistory,
    "visual closure UI package history",
  ).map((value) => objectRecord(value, "visual closure UI history entry"))
  assertExactStringSet(
    "visual closure UI history coverage",
    visualClosureUiHistory.map(({package: packageName}) => packageName),
    uiInventory.map(({packageName}) => packageName),
  )
  for (const entry of visualClosureUiHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "ui") {
      throw new Error(`Visual closure UI history mismatch: ${String(entry.package)}`)
    }
  }
  const socketAlignmentNodeHistory = arrayValue(
    data.nodeR5SocketAlignmentCheckpoint.nodePackageHistory,
    "Socket alignment Node package history",
  ).map((value) => objectRecord(value, "Socket alignment Node history entry"))
  assertExactStringSet(
    "Socket alignment Node history coverage",
    socketAlignmentNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of socketAlignmentNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Socket alignment Node history mismatch: ${String(entry.package)}`)
    }
  }
  const socketAlignmentUiHistory = arrayValue(
    data.nodeR5SocketAlignmentCheckpoint.uiPackageHistory,
    "Socket alignment UI package history",
  ).map((value) => objectRecord(value, "Socket alignment UI history entry"))
  assertExactStringSet(
    "Socket alignment UI history coverage",
    socketAlignmentUiHistory.map(({package: packageName}) => packageName),
    uiInventory.map(({packageName}) => packageName),
  )
  for (const entry of socketAlignmentUiHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "ui") {
      throw new Error(`Socket alignment UI history mismatch: ${String(entry.package)}`)
    }
  }
  const componentDefaultsNodeHistory = arrayValue(
    data.nodeR5ComponentDefaultsCheckpoint.nodePackageHistory,
    "component defaults Node package history",
  ).map((value) => objectRecord(value, "component defaults Node history entry"))
  assertExactStringSet(
    "component defaults Node history coverage",
    componentDefaultsNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of componentDefaultsNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Component defaults Node history mismatch: ${String(entry.package)}`)
    }
  }
  const componentDefaultsUiHistory = arrayValue(
    data.nodeR5ComponentDefaultsCheckpoint.uiPackageHistory,
    "component defaults UI package history",
  ).map((value) => objectRecord(value, "component defaults UI history entry"))
  assertExactStringSet(
    "component defaults UI history coverage",
    componentDefaultsUiHistory.map(({package: packageName}) => packageName),
    uiInventory.map(({packageName}) => packageName),
  )
  for (const entry of componentDefaultsUiHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "ui") {
      throw new Error(`Component defaults UI history mismatch: ${String(entry.package)}`)
    }
  }
  const checkboxNodeHistory = arrayValue(
    data.nodeR5CheckboxPathCheckpoint.nodePackageHistory,
    "Checkbox Path Node package history",
  ).map((value) => objectRecord(value, "Checkbox Path Node history entry"))
  assertExactStringSet(
    "Checkbox Path Node history coverage",
    checkboxNodeHistory.map(({package: packageName}) => packageName),
    nodeInventory.map(({packageName}) => packageName),
  )
  for (const entry of checkboxNodeHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
      throw new Error(`Checkbox Path Node history mismatch: ${String(entry.package)}`)
    }
  }
  const checkboxUiHistory = arrayValue(
    data.nodeR5CheckboxPathCheckpoint.uiPackageHistory,
    "Checkbox Path UI package history",
  ).map((value) => objectRecord(value, "Checkbox Path UI history entry"))
  assertExactStringSet(
    "Checkbox Path UI history coverage",
    checkboxUiHistory.map(({package: packageName}) => packageName),
    uiInventory.map(({packageName}) => packageName),
  )
  for (const entry of checkboxUiHistory) {
    const plan = importsByPackage.get(entry.package)
    if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "ui") {
      throw new Error(`Checkbox Path UI history mismatch: ${String(entry.package)}`)
    }
  }
  for (const [label, checkpoint] of [
    ["Collapse icon", data.nodeR5CollapseIconCheckpoint],
    ["Socket hover", data.nodeR5SocketHoverCheckpoint],
  ] as const) {
    const nodeHistory = arrayValue(checkpoint.nodePackageHistory, `${label} Node package history`)
      .map((value) => objectRecord(value, `${label} Node history entry`))
    assertExactStringSet(
      `${label} Node history coverage`,
      nodeHistory.map(({package: packageName}) => packageName),
      nodeInventory.map(({packageName}) => packageName),
    )
    for (const entry of nodeHistory) {
      const plan = importsByPackage.get(entry.package)
      if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "node") {
        throw new Error(`${label} Node history mismatch: ${String(entry.package)}`)
      }
    }
    const uiHistory = arrayValue(checkpoint.uiPackageHistory, `${label} UI package history`)
      .map((value) => objectRecord(value, `${label} UI history entry`))
    assertExactStringSet(
      `${label} UI history coverage`,
      uiHistory.map(({package: packageName}) => packageName),
      uiInventory.map(({packageName}) => packageName),
    )
    for (const entry of uiHistory) {
      const plan = importsByPackage.get(entry.package)
      if (plan?.sourcePrefix !== entry.prefix || entry.repository !== "ui") {
        throw new Error(`${label} UI history mismatch: ${String(entry.package)}`)
      }
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
  if (finalCandidateNode.head !== "996619791e9abfc32e5a5139f9f3b1e4bc20e716" ||
    finalCandidateNode.parent !== "a72e0e685c8d830d591555aecf164a7d2214d22c" ||
    finalCandidateNode.status !== "clean" ||
    finalCandidateNode.headContainedByOriginMain !== false ||
    finalCandidateUi.head !== "5c351459555ec0980893a1da1c1ee8e7f99de2ed" ||
    finalCandidateUi.status !== "clean" ||
    finalCandidateUi.headContainedByOriginMain !== false ||
    finalCandidateRenderer.head !== "99ce7846e6086ba4c3adebad23acbb6faafa277f" ||
    finalCandidateRenderer.status !== "clean" ||
    finalCandidateRenderer.headContainedByOriginMain !== false) {
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

  const visualClosureProvenance = objectRecord(
    data.nodeR5VisualClosureCheckpoint.provenance,
    "visual closure provenance",
  )
  if (visualClosureProvenance.previousCheckpoint !== finalCandidateCheckpointPath ||
    visualClosureProvenance.preservesPreviousSnapshots !== true ||
    visualClosureProvenance.productionRuntimeChanged !== false ||
    visualClosureProvenance.externalSourceProductionChanged !== true) {
    throw new Error("Visual closure checkpoint must append to the final candidate checkpoint")
  }
  if (visualClosureNode.head !== "9855abd9683affb8759647ebd27c342ab8b4dda4" ||
    visualClosureNode.parent !== finalCandidateNode.head || visualClosureNode.status !== "clean" ||
    visualClosureNode.headContainedByOriginMain !== false ||
    visualClosureUi.head !== "1ddae57f1f525ecd2363bec1a5bb79db71591cfd" ||
    visualClosureUi.parent !== finalCandidateUi.head || visualClosureUi.status !== "clean" ||
    visualClosureUi.headContainedByOriginMain !== false ||
    visualClosureRenderer.head !== finalCandidateRenderer.head ||
    visualClosureRenderer.status !== "clean" ||
    visualClosureRenderer.headContainedByOriginMain !== false) {
    throw new Error("Visual closure repository revisions do not match the observed clean sources")
  }
  const correctedClassification = objectRecord(
    data.nodeR5VisualClosureCheckpoint.correctedClassification,
    "corrected SelectField classification",
  )
  if (correctedClassification.previous !== "Renderer/Engine-font platform gap" ||
    correctedClassification.current !== "UI-owned SVG presentation restored" ||
    correctedClassification.currentOwner !== "@ui/components SelectField" ||
    correctedClassification.svgAsset !== "chevronDownIcon" ||
    correctedClassification.nativeInteractionOwner !== "select" ||
    correctedClassification.platformCodeChanged !== false ||
    correctedClassification.appearanceDependencyAdded !== false) {
    throw new Error("SelectField correction must restore the historical UI-owned SVG contract")
  }
  const closureTechnical = objectRecord(
    data.nodeR5VisualClosureCheckpoint.technicalR5,
    "visual closure technical R5",
  )
  const closureFunctional = objectRecord(closureTechnical.functional, "visual closure functional acceptance")
  const closureUiFunctional = objectRecord(
    closureTechnical.uiFunctional,
    "visual closure UI functional acceptance",
  )
  const closureBundle = objectRecord(closureTechnical.bundle, "visual closure bundle acceptance")
  const closureExactBundle = objectRecord(
    closureBundle.exactNodeEditor,
    "visual closure exact NodeEditor bundle",
  )
  const closureBundleCeiling = objectRecord(closureBundle.ceiling, "visual closure bundle ceiling")
  const closureUiBundle = objectRecord(closureTechnical.uiBundle, "visual closure UI bundle acceptance")
  const closureExactUiBundle = objectRecord(
    closureUiBundle.exactComponents,
    "visual closure exact UI bundle",
  )
  const closureUiBundleCeiling = objectRecord(closureUiBundle.ceiling, "visual closure UI ceiling")
  if (closureTechnical.status !== "verified" || closureFunctional.pass !== 220 ||
    closureFunctional.fail !== 0 || closureFunctional.todo !== 0 ||
    closureUiFunctional.packagePass !== 78 || closureUiFunctional.storybookPass !== 29 ||
    closureUiFunctional.fail !== 0 || closureBundle.contract !== "nodes-component-ui-bundle/2" ||
    closureExactBundle.bytes !== 279243 || closureExactBundle.gzipBytes !== 70384 ||
    closureExactBundle.sha256 !== "070cc2b374fc4bdc18e788ad4c14d8afd5d9d4fbaf5d81589ae3983f5460936c" ||
    closureBundleCeiling.bytes !== 285000 || closureBundleCeiling.gzipBytes !== 72000 ||
    closureBundle.pass !== true || closureExactUiBundle.bytes !== 131447 ||
    closureExactUiBundle.gzipBytes !== 31697 ||
    closureExactUiBundle.sha256 !== "7b047839751ed1363202c1a3b1e8b11f986071f65a3f86a06420a3058e01f456" ||
    closureUiBundleCeiling.bytes !== 131500 || closureUiBundleCeiling.gzipBytes !== 31750 ||
    closureUiBundle.pass !== true) {
    throw new Error("Visual closure technical evidence does not match executable acceptance")
  }
  const closureReference = objectRecord(
    data.nodeR5VisualClosureCheckpoint.blender52Reference,
    "visual closure Blender 5.2 reference",
  )
  if (closureReference.sha256 !== finalReference.sha256 ||
    closureReference.acceptance !== "candidate" || closureReference.historical45Scope !== "changed") {
    throw new Error("Visual closure must preserve the exact Blender 5.2 reference")
  }
  const closureStorybook = objectRecord(
    data.nodeR5VisualClosureCheckpoint.storybook,
    "visual closure Storybook evidence",
  )
  const closureCaptures = arrayValue(closureStorybook.captures, "visual closure Storybook captures")
    .map((value) => objectRecord(value, "visual closure Storybook capture"))
  const closureCanvas = objectRecord(closureStorybook.canvas, "visual closure Storybook canvas")
  if (closureStorybook.activeRevision !== "f48550926ffeec12eef18bc1" ||
    closureStorybook.graphDigest !== "88fc2fa7ad3be10b5f16de28ab4edbaddcf519efc23113ef7e9c8557fd2ae613" ||
    closureStorybook.ready !== true || closureStorybook.presented !== true ||
    arrayValue(closureStorybook.diagnostics, "visual closure diagnostics").length !== 0 ||
    arrayValue(closureStorybook.consoleErrors, "visual closure console errors").length !== 0 ||
    closureCanvas.width !== 3840 || closureCanvas.height !== 2176 ||
    closureCanvas.hidden !== false || closureCanvas.nonBlack !== true || closureCaptures.length !== 3 ||
    !closureCaptures.some(({sha256}) =>
      sha256 === "b7fcd446536141646f2275426b7094120dbd4876a9b9b8f022f64592a423aa2d") ||
    !closureCaptures.some(({sha256}) =>
      sha256 === "e5a5f8fde336c2624d0e912da32d23c1848ce8bfb481183057b89d5abefe3eef") ||
    !closureCaptures.some(({sha256}) =>
      sha256 === "4b79ba7b8982d7e856f496960140559b72973271d61095506237fa4ab0143e7b")) {
    throw new Error("Visual closure Storybook evidence does not match the SVG-restored captures")
  }
  const closureVisual = objectRecord(
    data.nodeR5VisualClosureCheckpoint.visualAcceptance,
    "visual closure acceptance",
  )
  const restoredIndicator = objectRecord(closureVisual.restoredIndicator, "restored SelectField indicator")
  if (closureVisual.status !== "candidate-owner-verdict" ||
    closureVisual.ownerVerdict !== "pending-zavx0z" ||
    restoredIndicator.owner !== "@ui/components SelectField" ||
    restoredIndicator.source !== "chevronDownIcon" ||
    restoredIndicator.closeComparisonCaptureSha256 !==
      "e5a5f8fde336c2624d0e912da32d23c1848ce8bfb481183057b89d5abefe3eef" ||
    restoredIndicator.platformGap !== false) {
    throw new Error("Visual closure must leave only the explicit owner verdict pending")
  }

  const socketAlignmentProvenance = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.provenance,
    "Socket alignment provenance",
  )
  if (socketAlignmentProvenance.previousCheckpoint !== visualClosureCheckpointPath ||
    socketAlignmentProvenance.preservesPreviousSnapshots !== true ||
    socketAlignmentProvenance.productionRuntimeChanged !== false ||
    socketAlignmentProvenance.externalSourceProductionChanged !== true) {
    throw new Error("Socket alignment checkpoint must append to the visual closure checkpoint")
  }
  if (latestNode.head !== "9ddded88425f69e6052687e7dccb4a02fb3016a5" ||
    latestNode.parent !== "ed7b6a99f6b6ae7b35811307eaeb2352f07b14b9" ||
    latestNode.status !== "clean" || latestNode.headContainedByOriginMain !== false ||
    latestUi.head !== visualClosureUi.head || latestUi.status !== "clean" ||
    latestUi.headContainedByOriginMain !== false || latestRenderer.head !== visualClosureRenderer.head ||
    latestRenderer.status !== "clean" || latestRenderer.headContainedByOriginMain !== false) {
    throw new Error("Socket alignment repository revisions do not match the observed clean sources")
  }
  const previousCandidate = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.previousCandidate,
    "rejected visual candidate",
  )
  if (previousCandidate.checkpoint !== visualClosureCheckpointPath ||
    previousCandidate.storybookRevision !== "f48550926ffeec12eef18bc1" ||
    previousCandidate.closeCaptureSha256 !==
      "e5a5f8fde336c2624d0e912da32d23c1848ce8bfb481183057b89d5abefe3eef" ||
    previousCandidate.ownerVerdict !== "rejected-zavx0z" ||
    previousCandidate.finding !==
      "all six input Socket glyph centers were 7px left of the Node contour") {
    throw new Error("Socket alignment checkpoint must preserve the rejected candidate evidence")
  }
  const socketAlignment = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.socketAlignment,
    "Socket alignment evidence",
  )
  if (socketAlignment.owner !== "@nodes/ui Socket endpoint presentation" ||
    socketAlignment.implementationCommit !== "ed7b6a99f6b6ae7b35811307eaeb2352f07b14b9" ||
    socketAlignment.evidenceCommit !== latestNode.head || socketAlignment.previousLeftOffsetPx !== -13 ||
    socketAlignment.currentLeftOffsetPx !== -6 || socketAlignment.inputSocketsChecked !== 6 ||
    socketAlignment.outputSocketsChecked !== 2 || socketAlignment.maximumContourDeltaPx !== 1 ||
    socketAlignment.platformCodeChanged !== false || socketAlignment.layoutPolicyChanged !== false ||
    socketAlignment.status !== "verified-by-renderer-boxes") {
    throw new Error("Socket alignment evidence does not match the Node-owned correction")
  }
  const alignmentTechnical = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.technicalR5,
    "Socket alignment technical R5",
  )
  const alignmentFunctional = objectRecord(
    alignmentTechnical.functional,
    "Socket alignment functional acceptance",
  )
  const alignmentBundle = objectRecord(alignmentTechnical.bundle, "Socket alignment bundle")
  const alignmentExactBundle = objectRecord(
    alignmentBundle.exactNodeEditor,
    "Socket alignment exact NodeEditor bundle",
  )
  const alignmentBundleCeiling = objectRecord(alignmentBundle.ceiling, "Socket alignment bundle ceiling")
  if (alignmentTechnical.status !== "verified" || alignmentFunctional.pass !== 220 ||
    alignmentFunctional.fail !== 0 || alignmentFunctional.todo !== 0 ||
    alignmentBundle.contract !== "nodes-component-ui-bundle/2" ||
    alignmentExactBundle.bytes !== 279242 || alignmentExactBundle.gzipBytes !== 70390 ||
    alignmentExactBundle.sha256 !==
      "eaa9e7b57eaecda97c4003649dc9f6eabeb0b77ee0bf04211e2c7ed45ba72bc8" ||
    alignmentBundleCeiling.bytes !== 285000 || alignmentBundleCeiling.gzipBytes !== 72000 ||
    alignmentBundle.pass !== true ||
    alignmentTechnical.inheritedPerformanceEvidence !== visualClosureCheckpointPath) {
    throw new Error("Socket alignment technical evidence does not match executable acceptance")
  }
  const alignmentStorybook = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.storybook,
    "Socket alignment Storybook evidence",
  )
  const alignmentCaptures = arrayValue(
    alignmentStorybook.captures,
    "Socket alignment Storybook captures",
  ).map((value) => objectRecord(value, "Socket alignment Storybook capture"))
  const alignmentCanvas = objectRecord(alignmentStorybook.canvas, "Socket alignment Storybook canvas")
  if (alignmentStorybook.activeRevision !== "8f9c410f7bb9dc5170a2b353" ||
    alignmentStorybook.graphDigest !== "88fc2fa7ad3be10b5f16de28ab4edbaddcf519efc23113ef7e9c8557fd2ae613" ||
    alignmentStorybook.ready !== true || alignmentStorybook.presented !== true ||
    arrayValue(alignmentStorybook.diagnostics, "Socket alignment diagnostics").length !== 0 ||
    arrayValue(alignmentStorybook.consoleErrors, "Socket alignment console errors").length !== 0 ||
    alignmentCanvas.width !== 3840 || alignmentCanvas.height !== 2176 ||
    alignmentCanvas.hidden !== false || alignmentCanvas.nonBlack !== true ||
    alignmentCaptures.length !== 3 ||
    !alignmentCaptures.some(({sha256}) =>
      sha256 === "5ebac749997bcd3f41804db29d37d88922c69eefba5fc20f1e81b5e6c57094d7") ||
    !alignmentCaptures.some(({sha256}) =>
      sha256 === "a89bf335858d6862d79f67fc656d2f3784563e377812afb0e6a1af3889e08e41") ||
    !alignmentCaptures.some(({sha256}) =>
      sha256 === "1ea0ac7147abd2c8c839e61f067535c125840e78c07678ee0920770d71fd15f0")) {
    throw new Error("Socket alignment Storybook evidence does not match the corrected captures")
  }
  const alignmentVisual = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.visualAcceptance,
    "Socket alignment visual acceptance",
  )
  if (alignmentVisual.status !== "candidate-owner-verdict" ||
    alignmentVisual.previousOwnerVerdict !== "rejected-zavx0z" ||
    alignmentVisual.ownerVerdict !== "pending-zavx0z") {
    throw new Error("Corrected Socket visual acceptance must await a new owner verdict")
  }

  const componentDefaultsProvenance = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.provenance,
    "component defaults provenance",
  )
  if (componentDefaultsProvenance.previousCheckpoint !== socketAlignmentCheckpointPath ||
    componentDefaultsProvenance.preservesPreviousSnapshots !== true ||
    componentDefaultsProvenance.productionRuntimeChanged !== false ||
    componentDefaultsProvenance.externalSourceProductionChanged !== true) {
    throw new Error("Component defaults checkpoint must append to the Socket alignment checkpoint")
  }
  if (currentNode.head !== "1e2450aaceb5d5dbf34239eb7e1252595e053efd" ||
    currentNode.parent !== latestNode.head || currentNode.status !== "clean" ||
    currentNode.headContainedByOriginMain !== false ||
    currentUi.head !== "90c77080c27d92fea5ee803e8ff1e49d65885ae1" ||
    currentUi.parent !== latestUi.head || currentUi.status !== "clean" ||
    currentUi.headContainedByOriginMain !== false ||
    currentRenderer.head !== "3803739d0dded9c05c5f9e32acd163b6f81f6e6c" ||
    currentRenderer.parent !== "8d14e99949ba38196c073bc24bbe83eab6272996" ||
    currentRenderer.status !== "clean" || currentRenderer.headContainedByOriginMain !== false) {
    throw new Error("Component defaults repository revisions do not match the observed clean sources")
  }
  const rejectedCandidates = arrayValue(
    data.nodeR5ComponentDefaultsCheckpoint.rejectedCandidates,
    "rejected visual candidates",
  ).map((value) => objectRecord(value, "rejected visual candidate"))
  const firstRejectedCandidate = rejectedCandidates[0]
  const secondRejectedCandidate = rejectedCandidates[1]
  if (rejectedCandidates.length !== 2 ||
    firstRejectedCandidate?.checkpoint !== visualClosureCheckpointPath ||
    firstRejectedCandidate.ownerVerdict !== "rejected-zavx0z" ||
    firstRejectedCandidate.finding !==
      "all six input Socket glyph centers were 7px left of the Node contour" ||
    secondRejectedCandidate?.checkpoint !== socketAlignmentCheckpointPath ||
    secondRejectedCandidate.ownerVerdict !== "rejected-zavx0z" ||
    JSON.stringify(arrayValue(secondRejectedCandidate.findings, "second rejected findings")) !== JSON.stringify([
      "NumberField, CheckboxField and SelectField did not arrive as their standard UI defaults",
      "theme-owned border radii were not executed by Renderer var shorthand",
      "Socket intrinsic contour remained the wrong size",
    ])) {
    throw new Error("Component defaults checkpoint must preserve both explicit rejected verdicts")
  }
  const componentCorrections = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.corrections,
    "component defaults corrections",
  )
  const rendererCorrection = objectRecord(componentCorrections.renderer, "Renderer radius correction")
  const uiCorrection = objectRecord(componentCorrections.ui, "UI default correction")
  const nodeCorrection = objectRecord(componentCorrections.node, "Node composition correction")
  const correctedGeometry = objectRecord(nodeCorrection.geometry, "corrected Node geometry")
  const correctedNodeGeometry = objectRecord(correctedGeometry.node, "corrected Node contour")
  const correctedFieldGeometry = objectRecord(correctedGeometry.field, "corrected Field contour")
  const correctedCheckboxGeometry = objectRecord(correctedGeometry.checkbox, "corrected Checkbox contour")
  const correctedSocketGeometry = objectRecord(correctedGeometry.socket, "corrected Socket contour")
  if (rendererCorrection.owner !== "@zavx0z/renderer" ||
    rendererCorrection.implementationCommit !== currentRenderer.parent ||
    rendererCorrection.evidenceCommit !== currentRenderer.head ||
    uiCorrection.owner !== "@ui/components" || uiCorrection.commit !== currentUi.head ||
    arrayValue(uiCorrection.defaults, "corrected UI defaults").length !== 4 ||
    nodeCorrection.owner !== "@nodes/ui" || nodeCorrection.commit !== currentNode.head ||
    nodeCorrection.removesFieldVisualOverrides !== true ||
    correctedNodeGeometry.width !== 160 || correctedNodeGeometry.height !== 294 ||
    correctedGeometry.headerHeight !== 22 || correctedFieldGeometry.x !== 29 ||
    correctedFieldGeometry.width !== 137 || correctedFieldGeometry.height !== 22 ||
    correctedCheckboxGeometry.x !== 29 || correctedCheckboxGeometry.y !== 135 ||
    correctedCheckboxGeometry.width !== 16 || correctedCheckboxGeometry.height !== 16 ||
    correctedSocketGeometry.width !== 12 || correctedSocketGeometry.height !== 12 ||
    correctedSocketGeometry.maximumPortCenterDeltaPx !== 1 ||
    JSON.stringify(arrayValue(correctedGeometry.numberFieldY, "corrected number row positions")) !==
      "[183,208,233,258,283]") {
    throw new Error("Component defaults correction does not match exact owner geometry")
  }
  const componentTechnical = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.technicalR5,
    "component defaults technical R5",
  )
  const componentFunctional = objectRecord(componentTechnical.functional, "component defaults functional acceptance")
  const componentUiFunctional = objectRecord(
    componentTechnical.uiFunctional,
    "component defaults UI functional acceptance",
  )
  const componentBundle = objectRecord(componentTechnical.bundle, "component defaults Node bundle")
  const componentExactBundle = objectRecord(componentBundle.exactNodeEditor, "component defaults exact Node bundle")
  const componentBundleCeiling = objectRecord(componentBundle.ceiling, "component defaults Node bundle ceiling")
  const componentUiBundle = objectRecord(componentTechnical.uiBundle, "component defaults UI bundle")
  const componentExactUiBundle = objectRecord(
    componentUiBundle.exactComponents,
    "component defaults exact UI bundle",
  )
  const componentUiBundleCeiling = objectRecord(componentUiBundle.ceiling, "component defaults UI bundle ceiling")
  const componentRendererFunctional = objectRecord(
    componentTechnical.rendererFunctional,
    "component defaults Renderer functional acceptance",
  )
  if (componentTechnical.status !== "verified" || componentFunctional.pass !== 221 ||
    componentFunctional.fail !== 0 || componentFunctional.todo !== 0 ||
    componentUiFunctional.packagePass !== 78 || componentUiFunctional.storybookPass !== 29 ||
    componentUiFunctional.fail !== 0 || componentBundle.contract !== "nodes-component-ui-bundle/2" ||
    componentExactBundle.bytes !== 278439 || componentExactBundle.gzipBytes !== 70370 ||
    componentExactBundle.sha256 !== "cf096e4b4ea7a5e1344024cdfe0d0071ef6f43b96addf405553ed685f7a18df2" ||
    componentBundleCeiling.bytes !== 285000 || componentBundleCeiling.gzipBytes !== 72000 ||
    componentBundle.pass !== true || componentExactUiBundle.bytes !== 131190 ||
    componentExactUiBundle.gzipBytes !== 31700 ||
    componentExactUiBundle.sha256 !== "ff843b27f3777d991df3fee5c0f30cc0d57555008c1ce234f6ea756e3b80a01f" ||
    componentUiBundleCeiling.bytes !== 131500 || componentUiBundleCeiling.gzipBytes !== 31750 ||
    componentUiBundle.pass !== true || componentRendererFunctional.corePass !== 187 ||
    componentRendererFunctional.storybookPass !== 23 || componentRendererFunctional.fail !== 0 ||
    componentTechnical.inheritedPerformanceEvidence !== socketAlignmentCheckpointPath) {
    throw new Error("Component defaults technical evidence does not match executable acceptance")
  }
  const componentStorybook = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.storybook,
    "component defaults Storybook evidence",
  )
  const componentCapture = objectRecord(componentStorybook.capture, "component defaults Storybook capture")
  if (componentStorybook.activeRevision !== "c1580e4950592557984ecdf4" ||
    componentStorybook.graphDigest !== "828891004c1a2feaf9f8f5f88bb1a2693f7642efbf62b9241b24f2e0919dafb8" ||
    componentStorybook.ready !== true || componentStorybook.presented !== true ||
    arrayValue(componentStorybook.diagnostics, "component defaults diagnostics").length !== 0 ||
    arrayValue(componentStorybook.consoleErrors, "component defaults console errors").length !== 0 ||
    componentCapture.id !== "capture_R32gYTk6Zi-eyT22Z46-ts7X" ||
    componentCapture.width !== 2268 || componentCapture.height !== 704 ||
    componentCapture.bytes !== 123590 ||
    componentCapture.sha256 !== "4145b85515e5542877c8f821e39ba627d199fda12e6f7a5c92d62d8c77675e25") {
    throw new Error("Component defaults Storybook evidence does not match the exact candidate capture")
  }
  const componentVisual = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.visualAcceptance,
    "component defaults visual acceptance",
  )
  if (componentVisual.status !== "candidate-owner-verdict" ||
    JSON.stringify(arrayValue(componentVisual.previousOwnerVerdicts, "previous owner verdicts")) !==
      '["rejected-zavx0z","rejected-zavx0z"]' ||
    componentVisual.mechanicalGeometryVerified !== true ||
    componentVisual.ownerVerdict !== "pending-zavx0z" || componentVisual.parityClaimed !== false) {
    throw new Error("Component defaults candidate must remain pending without a parity claim")
  }
  const componentM0Validation = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.m0Validation,
    "component defaults M0 validation",
  )
  const componentFoundationValidation = objectRecord(
    componentM0Validation.foundation,
    "component defaults foundation validation",
  )
  const componentSourceValidation = objectRecord(
    componentM0Validation.sourceEvidence,
    "component defaults source evidence validation",
  )
  if (componentFoundationValidation.command !== "bun run check" ||
    componentFoundationValidation.pass !== true || componentFoundationValidation.tests !== 13 ||
    componentSourceValidation.command !== "bun run evidence:check" ||
    componentSourceValidation.pass !== false ||
    componentSourceValidation.blocker !==
      "/Users/zavx0z/repozitarium/template/support.json has pre-existing M status" ||
    componentSourceValidation.templateModifiedByThisSlice !== false ||
    componentSourceValidation.validatorWeakened !== false) {
    throw new Error("Component defaults M0 validation must preserve the external Template WIP blocker")
  }

  const checkboxProvenance = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.provenance,
    "Checkbox Path provenance",
  )
  if (checkboxProvenance.previousCheckpoint !== componentDefaultsCheckpointPath ||
    checkboxProvenance.preservesPreviousSnapshots !== true ||
    checkboxProvenance.productionRuntimeChanged !== false ||
    checkboxProvenance.externalSourceProductionChanged !== true) {
    throw new Error("Checkbox Path checkpoint must append to the component defaults checkpoint")
  }
  if (checkboxNode.head !== "b544860e95aea7d57b3d0f0a29d1a8274a5c51b0" ||
    checkboxNode.parent !== currentNode.head || checkboxNode.status !== "clean" ||
    checkboxNode.headContainedByOriginMain !== false || checkboxUi.head !== currentUi.head ||
    checkboxUi.status !== "clean" || checkboxUi.headContainedByOriginMain !== false ||
    checkboxRenderer.head !== "b6c4845cfacd3c5afc4d6b82d939e95e2bc52a59" ||
    checkboxRenderer.parent !== "5e21783b688339fb892cb288a4bd030605191c68" ||
    checkboxRenderer.status !== "clean" || checkboxRenderer.headContainedByOriginMain !== false) {
    throw new Error("Checkbox Path repository revisions do not match the observed clean sources")
  }
  const checkboxDefect = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.reportedDefect,
    "reported Checkbox defect",
  )
  if (checkboxDefect.ownerVerdict !== "rejected-checkbox-zavx0z" ||
    checkboxDefect.finding !== "checked Checkbox glyph is visibly crooked and too thin" ||
    checkboxDefect.affectedCheckpoint !== componentDefaultsCheckpointPath ||
    checkboxDefect.actualOwner !== "@zavx0z/renderer form-control projection") {
    throw new Error("Checkbox Path checkpoint must preserve the reported visual defect")
  }
  const checkboxCorrection = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.correction,
    "Checkbox Path correction",
  )
  if (checkboxCorrection.implementationCommit !== checkboxRenderer.parent ||
    checkboxCorrection.capabilityCommit !== checkboxRenderer.head ||
    checkboxCorrection.nodeEvidenceCommit !== checkboxNode.head ||
    checkboxCorrection.previousPaint !== "Engine-font text glyph U+2713" ||
    checkboxCorrection.currentPaint !== "retained two-segment Path with 2px stroke" ||
    checkboxCorrection.uiWorkaroundAdded !== false || checkboxCorrection.nodeWorkaroundAdded !== false ||
    checkboxCorrection.capability !== "renderer.features.form-control-projection") {
    throw new Error("Checkbox correction must remain generic and font-independent")
  }
  const checkboxPixels = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.pixelEvidence,
    "Checkbox pixel evidence",
  )
  if (JSON.stringify(arrayValue(checkboxPixels.normalizedReferenceWhiteBox, "reference Checkbox bbox")) !==
      "[6,7,23,21]" ||
    JSON.stringify(arrayValue(checkboxPixels.normalizedLiveWhiteBox, "live Checkbox bbox")) !==
      "[6,7,23,21]" || checkboxPixels.status !== "exact-normalized-bounds") {
    throw new Error("Checkbox Path pixel evidence must match the exact normalized reference bounds")
  }
  const checkboxTechnical = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.technicalR5,
    "Checkbox Path technical R5",
  )
  const checkboxRendererFunctional = objectRecord(
    checkboxTechnical.rendererFunctional,
    "Checkbox Renderer functional acceptance",
  )
  const checkboxUiFunctional = objectRecord(
    checkboxTechnical.uiFunctional,
    "Checkbox UI functional acceptance",
  )
  const checkboxNodeFunctional = objectRecord(
    checkboxTechnical.nodeFunctional,
    "Checkbox Node functional acceptance",
  )
  const checkboxCapabilities = objectRecord(
    checkboxTechnical.capabilities,
    "Checkbox capability acceptance",
  )
  if (checkboxTechnical.status !== "verified" || checkboxRendererFunctional.corePass !== 187 ||
    checkboxRendererFunctional.storybookPass !== 23 || checkboxRendererFunctional.fail !== 0 ||
    checkboxUiFunctional.packagePass !== 78 || checkboxUiFunctional.storybookPass !== 29 ||
    checkboxUiFunctional.fail !== 0 || checkboxNodeFunctional.pass !== 221 ||
    checkboxNodeFunctional.fail !== 0 || checkboxNodeFunctional.todo !== 0 ||
    checkboxCapabilities.typecheck !== true || checkboxCapabilities.pass !== 92 ||
    checkboxCapabilities.fail !== 1 ||
    checkboxCapabilities.onlyFailure !==
      "deterministic regeneration observes pre-existing Template support/inventory WIP" ||
    checkboxCapabilities.templateModifiedByThisSlice !== false ||
    checkboxCapabilities.validatorWeakened !== false ||
    checkboxTechnical.inheritedBundleAndPerformanceEvidence !== componentDefaultsCheckpointPath) {
    throw new Error("Checkbox Path technical evidence does not match executable acceptance")
  }
  const checkboxStorybook = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.storybook,
    "Checkbox Storybook evidence",
  )
  const checkboxUiStory = objectRecord(checkboxStorybook.ui, "Checkbox UI Storybook evidence")
  const checkboxUiCapture = objectRecord(checkboxUiStory.capture, "Checkbox UI capture")
  const checkboxNodeStory = objectRecord(checkboxStorybook.node, "Checkbox Node Storybook evidence")
  const checkboxNodeCapture = objectRecord(checkboxNodeStory.capture, "Checkbox Node capture")
  if (checkboxUiStory.activeRevision !== "83b43d78463c9683585e1e17" ||
    checkboxUiStory.ready !== true || checkboxUiStory.presented !== true ||
    arrayValue(checkboxUiStory.diagnostics, "Checkbox UI diagnostics").length !== 0 ||
    arrayValue(checkboxUiStory.consoleErrors, "Checkbox UI console errors").length !== 0 ||
    checkboxUiCapture.id !== "capture_zFwenJ4iUg67B4Y3zKPWBwgs" ||
    checkboxUiCapture.sha256 !== "43d4a93f3853ab06983f9f3f8161835660e5849a647312aa18ac6946676eb322" ||
    checkboxNodeStory.activeRevision !== "d3e020d985008a2e3fa9bce0" ||
    checkboxNodeStory.ready !== true || checkboxNodeStory.presented !== true ||
    arrayValue(checkboxNodeStory.diagnostics, "Checkbox Node diagnostics").length !== 0 ||
    arrayValue(checkboxNodeStory.consoleErrors, "Checkbox Node console errors").length !== 0 ||
    checkboxNodeCapture.id !== "capture__0RkSaSlB4dFPpYPF6V0BIjS" ||
    checkboxNodeCapture.sha256 !== "4eff14782c9b15c717d79340429a9832af491bef8e29c08647da91095d9c24db") {
    throw new Error("Checkbox Storybook evidence does not match the corrected captures")
  }
  const checkboxVisual = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.visualAcceptance,
    "Checkbox visual acceptance",
  )
  if (checkboxVisual.status !== "candidate-owner-verdict" || checkboxVisual.checkboxDefectClosed !== true ||
    checkboxVisual.mechanicalGeometryVerified !== true ||
    checkboxVisual.ownerVerdict !== "pending-zavx0z" || checkboxVisual.parityClaimed !== false) {
    throw new Error("Checkbox correction must remain candidate-only until the owner verdict")
  }

  const collapseProvenance = objectRecord(
    data.nodeR5CollapseIconCheckpoint.provenance,
    "collapse icon provenance",
  )
  if (collapseProvenance.previousCheckpoint !== checkboxCheckpointPath ||
    collapseProvenance.preservesPreviousSnapshots !== true ||
    collapseProvenance.productionRuntimeChanged !== false ||
    collapseProvenance.externalSourceProductionChanged !== true ||
    collapseNode.head !== "ceef5c66259b2a14ae3006aea08644dba7f79876" ||
    collapseNode.parent !== checkboxNode.head || collapseNode.status !== "clean" ||
    collapseUi.head !== checkboxUi.head || collapseUi.status !== "clean" ||
    collapseRenderer.head !== checkboxRenderer.head || collapseRenderer.status !== "clean") {
    throw new Error("Collapse icon checkpoint must append cleanly to the Checkbox checkpoint")
  }
  const collapseCorrection = objectRecord(
    data.nodeR5CollapseIconCheckpoint.correction,
    "collapse icon correction",
  )
  if (collapseCorrection.commit !== collapseNode.head ||
    collapseCorrection.interactionOwner !== "native collapse button" ||
    collapseCorrection.presentationOwner !== "stable img" ||
    collapseCorrection.expandedSource !== "@ui/components/icons chevronDownIcon" ||
    collapseCorrection.collapsedSource !== "@ui/components/icons chevronRightIcon" ||
    collapseCorrection.imageIdentityRetained !== true || collapseCorrection.textGlyphRemoved !== true ||
    collapseCorrection.iconSize !== 14) {
    throw new Error("Collapse icon correction must retain one native button and UI-owned image")
  }
  const collapsePixels = objectRecord(
    data.nodeR5CollapseIconCheckpoint.pixelEvidence,
    "collapse icon pixel evidence",
  )
  if (JSON.stringify(arrayValue(collapsePixels.referenceSize, "collapse reference size")) !== "[14,8]" ||
    JSON.stringify(arrayValue(collapsePixels.liveSize, "collapse live size")) !== "[14,8]" ||
    collapsePixels.status !== "exact-size-and-vertical-range") {
    throw new Error("Collapse icon evidence must match the exact reference bounds")
  }
  const collapseTechnical = objectRecord(
    data.nodeR5CollapseIconCheckpoint.technicalR5,
    "collapse icon technical R5",
  )
  const collapseNodeFunctional = objectRecord(collapseTechnical.nodeFunctional, "collapse Node checks")
  const collapseBundle = objectRecord(collapseTechnical.bundle, "collapse bundle evidence")
  const collapseExactBundle = objectRecord(collapseBundle.exactNodeEditor, "collapse exact bundle")
  if (collapseTechnical.status !== "verified" || collapseNodeFunctional.pass !== 221 ||
    collapseNodeFunctional.fail !== 0 || collapseNodeFunctional.todo !== 0 ||
    collapseNodeFunctional.assertions !== 9527 || collapseExactBundle.bytes !== 278697 ||
    collapseExactBundle.gzipBytes !== 70398 || collapseBundle.pass !== true ||
    collapseTechnical.inheritedCrossOwnerEvidence !== checkboxCheckpointPath) {
    throw new Error("Collapse icon technical evidence does not match executable acceptance")
  }
  const collapseStory = objectRecord(data.nodeR5CollapseIconCheckpoint.storybook, "collapse Storybook")
  const collapseCapture = objectRecord(collapseStory.capture, "collapse Storybook capture")
  if (collapseStory.activeRevision !== "da02f4fc916315be9f229c2a" ||
    collapseStory.ready !== true || collapseStory.presented !== true ||
    arrayValue(collapseStory.diagnostics, "collapse diagnostics").length !== 0 ||
    arrayValue(collapseStory.consoleErrors, "collapse console errors").length !== 0 ||
    collapseCapture.id !== "capture_CS-ZXxAZA48BcsELO4F4ILJ9" ||
    collapseCapture.sha256 !== "84e176e4a449365475ffd10616c346f957f3b281f6f483aab1216c1e53e513c4") {
    throw new Error("Collapse Storybook evidence does not match the exact capture")
  }

  const hoverProvenance = objectRecord(
    data.nodeR5SocketHoverCheckpoint.provenance,
    "Socket hover provenance",
  )
  if (hoverProvenance.previousCheckpoint !== collapseIconCheckpointPath ||
    hoverProvenance.preservesPreviousSnapshots !== true ||
    hoverProvenance.productionRuntimeChanged !== false ||
    hoverProvenance.externalSourceProductionChanged !== true ||
    hoverNode.head !== "68e2425e62b956e3fc187ca7abd811a468db8bad" ||
    hoverNode.parent !== collapseNode.head || hoverNode.status !== "clean" ||
    hoverUi.head !== collapseUi.head || hoverUi.status !== "clean" ||
    hoverRenderer.head !== collapseRenderer.head || hoverRenderer.status !== "clean" ||
    hoverTemplate.head !== "6db9e772e37cdc47e6dba58d153016057cc93558" ||
    hoverTemplate.parent !== "ef543f55aea710d91ec473fe52f32900fbbb655b" ||
    hoverTemplate.status !== "dirty-pre-existing-generated-wip" ||
    JSON.stringify(arrayValue(hoverTemplate.statusPaths, "Template WIP paths")) !== '["support.json"]') {
    throw new Error("Socket hover checkpoint must preserve exact Node and Template owners")
  }
  const hoverDefect = objectRecord(data.nodeR5SocketHoverCheckpoint.reportedDefect, "Socket hover defect")
  if (hoverDefect.ownerVerdict !== "rejected-full-row-hover-zavx0z" ||
    hoverDefect.finding !==
      "hovering a Parameter Socket lights the full row instead of only the endpoint glyph" ||
    hoverDefect.affectedCheckpoint !== collapseIconCheckpointPath) {
    throw new Error("Socket hover checkpoint must preserve the user-reported defect")
  }
  const hoverCorrection = objectRecord(data.nodeR5SocketHoverCheckpoint.correction, "Socket hover correction")
  if (hoverCorrection.templateCapabilityCommit !== hoverTemplate.head ||
    hoverCorrection.nodeCommit !== hoverNode.head ||
    hoverCorrection.selectorProfile !== "one optional descendant static attribute compound" ||
    hoverCorrection.hoverSelector !== "&:hover [data-socket-glyph]" ||
    hoverCorrection.focusSelector !== "&:focus [data-socket-glyph]" ||
    hoverCorrection.singleButtonHitOwner !== true || hoverCorrection.fullRowShadowRemoved !== true ||
    hoverCorrection.dotShapeShadowPreserved !== true ||
    hoverCorrection.javascriptHoverStateAdded !== false ||
    hoverCorrection.rendererWorkaroundAdded !== false) {
    throw new Error("Socket hover correction must remain CSS-owned and glyph-scoped")
  }
  const hoverTechnical = objectRecord(data.nodeR5SocketHoverCheckpoint.technicalR5, "Socket hover R5")
  const hoverTemplateChecks = objectRecord(hoverTechnical.template, "Socket hover Template checks")
  const hoverNodeChecks = objectRecord(hoverTechnical.nodeFunctional, "Socket hover Node checks")
  const hoverIntegration = objectRecord(hoverTechnical.hoverIntegration, "Socket hover integration")
  const hoverBundle = objectRecord(hoverTechnical.bundle, "Socket hover bundle")
  const hoverExactBundle = objectRecord(hoverBundle.exactNodeEditor, "Socket hover exact bundle")
  if (hoverTechnical.status !== "verified" || hoverTemplateChecks.typecheck !== true ||
    hoverTemplateChecks.fullPass !== 749 || hoverTemplateChecks.fullFail !== 0 ||
    hoverNodeChecks.pass !== 221 || hoverNodeChecks.fail !== 0 || hoverNodeChecks.todo !== 0 ||
    hoverNodeChecks.assertions !== 9530 || hoverIntegration.rowShadow !== false ||
    hoverIntegration.glyphShadowKind !== "rect" || hoverIntegration.glyphShadowColor !== "#9e9e9e" ||
    hoverExactBundle.bytes !== 279084 || hoverExactBundle.gzipBytes !== 70434 ||
    hoverExactBundle.sha256 !== "61272bd378c943afee0d273c32c76b26d847674e9658e6bd71b37165ccd02845" ||
    hoverBundle.pass !== true || hoverTechnical.inheritedPerformanceEvidence !== collapseIconCheckpointPath) {
    throw new Error("Socket hover technical evidence does not match executable acceptance")
  }
  const hoverStory = objectRecord(data.nodeR5SocketHoverCheckpoint.storybook, "Socket hover Storybook")
  const hoverSemantic = objectRecord(hoverStory.semanticHover, "Socket hover semantic evidence")
  const hoverRowCapture = objectRecord(hoverStory.rowCapture, "Socket hover row capture")
  const hoverComparisonCapture = objectRecord(hoverStory.comparisonCapture, "Socket hover comparison capture")
  if (hoverStory.activeRevision !== "408f5bc96201dd5885b74fdc" ||
    hoverStory.ready !== true || hoverStory.presented !== true ||
    arrayValue(hoverStory.diagnostics, "Socket hover diagnostics").length !== 0 ||
    arrayValue(hoverStory.consoleErrors, "Socket hover console errors").length !== 0 ||
    arrayValue(hoverSemantic.buttonDisplay, "Socket hover button display").length !== 0 ||
    JSON.stringify(arrayValue(hoverSemantic.glyphDisplay, "Socket hover glyph display")) !==
      '["shadow","background"]' ||
    hoverRowCapture.sha256 !== "3edac5eef8c5f389aaaacc57ea14c3c28c4d0d98b2f4ec78e6f9ba12517b85ab" ||
    hoverComparisonCapture.sha256 !==
      "0d8ebd3b7a442ae73d34bdbdfed72a5a153751dc1e40cf77e82c2e4c778ba27f") {
    throw new Error("Socket hover Storybook evidence does not match the semantic captures")
  }
  const hoverM0 = objectRecord(data.nodeR5SocketHoverCheckpoint.m0Validation, "Socket hover M0")
  const hoverFoundation = objectRecord(hoverM0.foundation, "Socket hover foundation checks")
  const hoverSource = objectRecord(hoverM0.sourceEvidence, "Socket hover source evidence")
  if (hoverFoundation.command !== "bun run check" || hoverFoundation.pass !== true ||
    hoverFoundation.tests !== 13 || hoverSource.command !== "bun run evidence:check" ||
    hoverSource.pass !== false || hoverSource.blocker !==
      "/Users/zavx0z/repozitarium/template/support.json has pre-existing M status" ||
    hoverSource.templateModifiedByThisSlice !== true || hoverSource.templateCommitRecorded !== true ||
    hoverSource.validatorWeakened !== false) {
    throw new Error("Socket hover M0 validation must record the exact Template WIP blocker")
  }
  const hoverVisual = objectRecord(data.nodeR5SocketHoverCheckpoint.visualAcceptance, "Socket hover visual")
  if (hoverVisual.status !== "candidate-owner-verdict" ||
    hoverVisual.socketHoverDefectClosed !== true || hoverVisual.mechanicalInteractionVerified !== true ||
    hoverVisual.ownerVerdict !== "pending-zavx0z" || hoverVisual.parityClaimed !== false) {
    throw new Error("Socket hover correction must remain candidate-only until the owner verdict")
  }

  const decisionGates = objectRecord(
    data.nodeR5OwnerDecisionsCheckpoint.effectiveGates,
    "owner decision Node gates",
  )
  const compatibilityGates = objectRecord(
    data.nodeR5BlenderCompatibilityCheckpoint.effectiveGates,
    "Blender compatibility Node gates",
  )
  const finalCandidateGates = objectRecord(
    data.nodeR5FinalCandidateCheckpoint.effectiveGates,
    "final candidate Node gates",
  )
  const visualClosureGates = objectRecord(
    data.nodeR5VisualClosureCheckpoint.effectiveGates,
    "visual closure effective Node gates",
  )
  const gates = objectRecord(
    data.nodeR5SocketAlignmentCheckpoint.effectiveGates,
    "Socket alignment effective Node gates",
  )
  const componentGates = objectRecord(
    data.nodeR5ComponentDefaultsCheckpoint.effectiveGates,
    "component defaults effective Node gates",
  )
  const checkboxGates = objectRecord(
    data.nodeR5CheckboxPathCheckpoint.effectiveGates,
    "Checkbox Path effective Node gates",
  )
  const collapseGates = objectRecord(
    data.nodeR5CollapseIconCheckpoint.effectiveGates,
    "collapse icon effective Node gates",
  )
  const hoverGates = objectRecord(
    data.nodeR5SocketHoverCheckpoint.effectiveGates,
    "Socket hover effective Node gates",
  )
  for (const id of ["R1", "R2", "R3", "R4"]) {
    if (decisionGates[id] !== "verified") {
      throw new Error(`Node ${id} must remain verified at the owner decision checkpoint`)
    }
    if (compatibilityGates[id] !== "verified" || finalCandidateGates[id] !== "verified" ||
      visualClosureGates[id] !== "verified" ||
      gates[id] !== "verified" || componentGates[id] !== "verified" ||
      checkboxGates[id] !== "verified" || collapseGates[id] !== "verified" ||
      hoverGates[id] !== "verified") {
      throw new Error(`Node ${id} must be verified at every current checkpoint`)
    }
  }
  if (decisionGates.R5 !== "owner-decisions-pending" ||
    compatibilityGates.R5 !== "owner-decisions-pending" ||
    finalCandidateGates.R5 !== "platform-gap-and-owner-verdict" ||
    visualClosureGates.R5 !== "owner-verdict-pending" ||
    gates.R5 !== "owner-verdict-pending" || componentGates.R5 !== "owner-verdict-pending" ||
    checkboxGates.R5 !== "owner-verdict-pending" || collapseGates.R5 !== "owner-verdict-pending" ||
    hoverGates.R5 !== "owner-verdict-pending") {
    throw new Error("Node R5 must preserve the correction chain and leave only the owner verdict pending")
  }
  if (decisionGates.R6 !== "blocked" || compatibilityGates.R6 !== "blocked" ||
    finalCandidateGates.R6 !== "blocked" || visualClosureGates.R6 !== "blocked" ||
    gates.R6 !== "blocked" || componentGates.R6 !== "blocked" || checkboxGates.R6 !== "blocked" ||
    collapseGates.R6 !== "blocked" || hoverGates.R6 !== "blocked") {
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
