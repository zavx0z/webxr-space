import {join} from "node:path"
import {loadFoundationData} from "./model.ts"

const root = join(import.meta.dir, "../..")
const data = await loadFoundationData(root)
const values = data.sourceSnapshot.repositories

if (!Array.isArray(values)) throw new Error("Source repositories must be an array")
const historicalRepositories = new Map<string, Readonly<Record<string, unknown>>>()

for (const value of values) {
  const record = objectRecord(value, "source repository")
  const id = stringValue(record.id, "source repository id")
  if (historicalRepositories.has(id)) throw new Error(`Duplicate source repository: ${id}`)
  historicalRepositories.set(id, record)
}

const checkpointRepository = objectRecord(
  data.nodeCutoverSnapshot.repository,
  "Node cutover checkpoint repository",
)
const historicalNode = historicalRepositories.get("node")
if (historicalNode === undefined) throw new Error("Historical source snapshot has no Node repository")
const provenance = objectRecord(data.nodeCutoverSnapshot.provenance, "Node cutover provenance")
expectEqual("Node checkpoint previous HEAD", provenance.previousHead, historicalNode.head)

const repositories = new Map(historicalRepositories)
const previousRepositories = objectRecord(
  data.nodeR4R5Checkpoint.repositories,
  "R4/R5 checkpoint repositories",
)
const previousRendererCheckpoint = objectRecord(
  previousRepositories.renderer,
  "R4/R5 Renderer repository",
)
const closureRepositories = objectRecord(
  data.nodeR4ClosureR5Checkpoint.repositories,
  "R4 closure checkpoint repositories",
)
const closureNodeCheckpoint = objectRecord(closureRepositories.node, "R4 closure Node repository")
const closureRendererCheckpoint = objectRecord(
  closureRepositories.renderer,
  "R4 closure Renderer repository",
)
const appendRepositories = objectRecord(
  data.nodeR5AppendCheckpoint.repositories,
  "append checkpoint repositories",
)
const appendNodeCheckpoint = objectRecord(appendRepositories.node, "append Node repository")
const appendRendererCheckpoint = objectRecord(appendRepositories.renderer, "append Renderer repository")
const topologyCommitRepositories = objectRecord(
  data.nodeR5TopologyCommitCheckpoint.repositories,
  "topologyCommit checkpoint repositories",
)
const topologyCommitNodeCheckpoint = objectRecord(
  topologyCommitRepositories.node,
  "topologyCommit Node repository",
)
const topologyCommitRendererCheckpoint = objectRecord(
  topologyCommitRepositories.renderer,
  "topologyCommit Renderer repository",
)
const topologyClosureRepositories = objectRecord(
  data.nodeR5TopologyClosureCheckpoint.repositories,
  "topology closure checkpoint repositories",
)
const topologyClosureNodeCheckpoint = objectRecord(
  topologyClosureRepositories.node,
  "topology closure Node repository",
)
const topologyClosureRendererCheckpoint = objectRecord(
  topologyClosureRepositories.renderer,
  "topology closure Renderer repository",
)
const calibrationRepositories = objectRecord(
  data.nodeR5TransformCalibrationCheckpoint.repositories,
  "transform calibration checkpoint repositories",
)
const calibrationNodeCheckpoint = objectRecord(
  calibrationRepositories.node,
  "transform calibration Node repository",
)
const calibrationRendererCheckpoint = objectRecord(
  calibrationRepositories.renderer,
  "transform calibration Renderer repository",
)
const transformClosureRepositories = objectRecord(
  data.nodeR5TransformClosureCheckpoint.repositories,
  "transform closure checkpoint repositories",
)
const transformClosureNodeCheckpoint = objectRecord(
  transformClosureRepositories.node,
  "transform closure Node repository",
)
const transformClosureRendererCheckpoint = objectRecord(
  transformClosureRepositories.renderer,
  "transform closure Renderer repository",
)
const linkClosureRepositories = objectRecord(
  data.nodeR5LinkClosureCheckpoint.repositories,
  "Link closure checkpoint repositories",
)
const linkClosureNodeCheckpoint = objectRecord(
  linkClosureRepositories.node,
  "Link closure Node repository",
)
const linkClosureRendererCheckpoint = objectRecord(
  linkClosureRepositories.renderer,
  "Link closure Renderer repository",
)
const denseRepositories = objectRecord(
  data.nodeR5DenseLifecycleCheckpoint.repositories,
  "dense lifecycle checkpoint repositories",
)
const denseNodeCheckpoint = objectRecord(denseRepositories.node, "dense lifecycle Node repository")
const denseRendererCheckpoint = objectRecord(
  denseRepositories.renderer,
  "dense lifecycle Renderer repository",
)
const decisionRepositories = objectRecord(
  data.nodeR5OwnerDecisionsCheckpoint.repositories,
  "owner decision checkpoint repositories",
)
const decisionNodeCheckpoint = objectRecord(
  decisionRepositories.node,
  "owner decision Node repository",
)
const decisionRendererCheckpoint = objectRecord(
  decisionRepositories.renderer,
  "owner decision Renderer repository",
)
const latestRepositories = objectRecord(
  data.nodeR5BlenderCompatibilityCheckpoint.repositories,
  "latest Blender compatibility checkpoint repositories",
)
const nodeCheckpoint = objectRecord(latestRepositories.node, "latest Node repository")
const rendererCheckpoint = objectRecord(latestRepositories.renderer, "latest Renderer repository")
repositories.set("node", nodeCheckpoint)
repositories.set("renderer", rendererCheckpoint)

for (const [id, record] of repositories) {
  const path = stringValue(record.path, `source repository ${id} path`)
  if (record.status === "clean-before-foundation-edits") {
    git(path, ["cat-file", "-e", `${stringValue(record.head, `${id} historical HEAD`)}^{commit}`])
  } else if (record.liveHeadPolicy === "checkpoint-must-remain-ancestor") {
    const checkpoint = stringValue(record.head, `${id} checkpoint HEAD`)
    if (gitExitCode(path, ["merge-base", "--is-ancestor", checkpoint, "HEAD"]) !== 0) {
      throw new Error(`${id} checkpoint ${checkpoint} is no longer an ancestor of live HEAD`)
    }
    const branch = gitOptional(path, ["symbolic-ref", "--short", "-q", "HEAD"])
    expectEqual(`${id} branch`, branch.length === 0 ? null : branch, record.branch)
  } else {
    expectEqual(`${id} HEAD`, git(path, ["rev-parse", "HEAD"]), record.head)
    const branch = gitOptional(path, ["symbolic-ref", "--short", "-q", "HEAD"])
    expectEqual(`${id} branch`, branch.length === 0 ? null : branch, record.branch)
  }

  expectEqual(`${id} origin`, git(path, ["remote", "get-url", "origin"]), record.remote)
  expectEqual(`${id} origin/main`, git(path, ["rev-parse", "origin/main"]), record.originMain)
  if (record.status !== "clean-before-foundation-edits" &&
    record.liveHeadPolicy !== "checkpoint-must-remain-ancestor") {
    const counts = git(path, ["rev-list", "--left-right", "--count", "origin/main...HEAD"])
      .split(/\s+/u)
      .map(Number)
    expectEqual(`${id} behind`, counts[0], record.behind)
    expectEqual(`${id} ahead`, counts[1], record.ahead)
    if (typeof record.headContainedByOriginMain === "boolean") {
      const contained = gitExitCode(path, ["merge-base", "--is-ancestor", "HEAD", "origin/main"]) === 0
      expectEqual(`${id} remote containment`, contained, record.headContainedByOriginMain)
    }
  }

  if (record.status === "clean") {
    expectEqual(`${id} status`, git(path, ["status", "--porcelain=v1"]), "")
  } else if (record.status === "gitlinks-differ-from-index") {
    const paths = git(path, ["status", "--porcelain=v1"])
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(3))
      .sort()
    const expected = arrayValue(record.statusPaths, `${id} status paths`).map((item) =>
      stringValue(item, `${id} status path`)
    ).sort()
    expectEqual(`${id} status paths`, JSON.stringify(paths), JSON.stringify(expected))
  }

  const manifests = record.manifestSha256
  if (manifests !== undefined) {
    for (const [manifest, digest] of Object.entries(objectRecord(manifests, `${id} manifest hashes`))) {
      const bytes = await Bun.file(join(path, manifest)).arrayBuffer()
      const actual = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
      expectEqual(`${id} ${manifest} sha256`, actual, digest)
    }
  }
}

const pathResolution = objectRecord(data.sourceSnapshot.pathResolution, "path resolution")
for (const path of arrayValue(pathResolution.requestedSiblingPaths, "requested sibling paths")) {
  const exists = await Bun.file(join(stringValue(path, "requested sibling path"), "package.json")).exists()
  if (exists) throw new Error(`Previously missing sibling source path now exists: ${String(path)}`)
}

const historyValues = data.historySnapshot.entries
if (!Array.isArray(historyValues)) throw new Error("History entries must be an array")
for (const value of historyValues) {
  const entry = objectRecord(value, "history entry")
  const packageName = stringValue(entry.package, "history package")
  const repository = historicalRepositories.get(stringValue(entry.repository, `${packageName} repository`))
  if (repository === undefined) throw new Error(`Unknown history repository for ${packageName}`)
  const path = stringValue(repository.path, `${packageName} repository path`)
  const revision = stringValue(repository.head, `${packageName} historical revision`)
  const prefix = stringValue(entry.prefix, `${packageName} prefix`)
  const count = Number(git(path, ["rev-list", "--count", revision, "--", prefix]))
  expectEqual(`${packageName} history count`, count, entry.commitCount)
  const first = git(path, ["log", "--reverse", "--format=%H", revision, "--", prefix]).split("\n")[0]
  const last = git(path, ["log", "-1", "--format=%H", revision, "--", prefix])
  expectEqual(`${packageName} first history commit`, first, entry.firstCommit)
  expectEqual(`${packageName} last history commit`, last, entry.lastCommit)
}

const checkpointHistory = data.nodeCutoverSnapshot.packageHistory
if (!Array.isArray(checkpointHistory)) throw new Error("Node checkpoint history must be an array")
for (const value of checkpointHistory) {
  const entry = objectRecord(value, "Node checkpoint history entry")
  const packageName = stringValue(entry.package, "Node checkpoint package")
  const path = stringValue(checkpointRepository.path, `${packageName} checkpoint path`)
  const revision = stringValue(checkpointRepository.head, `${packageName} checkpoint revision`)
  const prefix = stringValue(entry.prefix, `${packageName} checkpoint prefix`)
  const count = Number(git(path, ["rev-list", "--count", revision, "--", prefix]))
  expectEqual(`${packageName} checkpoint history count`, count, entry.commitCount)
  const first = git(path, ["log", "--reverse", "--format=%H", revision, "--", prefix]).split("\n")[0]
  const last = git(path, ["log", "-1", "--format=%H", revision, "--", prefix])
  expectEqual(`${packageName} checkpoint first history commit`, first, entry.firstCommit)
  expectEqual(`${packageName} checkpoint last history commit`, last, entry.lastCommit)
}

const rendererCheckpointHistory = data.nodeR4R5Checkpoint.rendererPackageHistory
if (!Array.isArray(rendererCheckpointHistory)) {
  throw new Error("R4/R5 Renderer checkpoint history must be an array")
}
for (const value of rendererCheckpointHistory) {
  const entry = objectRecord(value, "R4/R5 Renderer history entry")
  const packageName = stringValue(entry.package, "R4/R5 Renderer package")
  const path = stringValue(previousRendererCheckpoint.path, `${packageName} checkpoint path`)
  const revision = stringValue(previousRendererCheckpoint.head, `${packageName} checkpoint revision`)
  const prefix = stringValue(entry.prefix, `${packageName} checkpoint prefix`)
  const count = Number(git(path, ["rev-list", "--count", revision, "--", prefix]))
  expectEqual(`${packageName} R4/R5 history count`, count, entry.commitCount)
  const first = git(path, ["log", "--reverse", "--format=%H", revision, "--", prefix]).split("\n")[0]
  const last = git(path, ["log", "-1", "--format=%H", revision, "--", prefix])
  expectEqual(`${packageName} R4/R5 first history commit`, first, entry.firstCommit)
  expectEqual(`${packageName} R4/R5 last history commit`, last, entry.lastCommit)
}

const closureNodeHistory = data.nodeR4ClosureR5Checkpoint.nodePackageHistory
if (!Array.isArray(closureNodeHistory)) throw new Error("R4 closure Node history must be an array")
for (const value of closureNodeHistory) {
  const entry = objectRecord(value, "R4 closure Node history entry")
  validateCheckpointHistoryEntry(entry, closureNodeCheckpoint, "R4 closure Node")
}

const closureRendererHistory = data.nodeR4ClosureR5Checkpoint.rendererPackageHistory
if (!Array.isArray(closureRendererHistory)) {
  throw new Error("R4 closure Renderer history must be an array")
}
for (const value of closureRendererHistory) {
  const entry = objectRecord(value, "R4 closure Renderer history entry")
  validateCheckpointHistoryEntry(entry, closureRendererCheckpoint, "R4 closure Renderer")
}

const appendNodeHistory = data.nodeR5AppendCheckpoint.nodePackageHistory
if (!Array.isArray(appendNodeHistory)) throw new Error("Append Node history must be an array")
for (const value of appendNodeHistory) {
  const entry = objectRecord(value, "append Node history entry")
  validateCheckpointHistoryEntry(entry, appendNodeCheckpoint, "append Node")
}

const appendRendererHistory = data.nodeR5AppendCheckpoint.rendererPackageHistory
if (!Array.isArray(appendRendererHistory)) throw new Error("Append Renderer history must be an array")
for (const value of appendRendererHistory) {
  const entry = objectRecord(value, "append Renderer history entry")
  validateCheckpointHistoryEntry(entry, appendRendererCheckpoint, "append Renderer")
}

const topologyNodeHistory = data.nodeR5TopologyCommitCheckpoint.nodePackageHistory
if (!Array.isArray(topologyNodeHistory)) throw new Error("TopologyCommit Node history must be an array")
for (const value of topologyNodeHistory) {
  const entry = objectRecord(value, "topologyCommit Node history entry")
  validateCheckpointHistoryEntry(entry, topologyCommitNodeCheckpoint, "topologyCommit Node")
}

const topologyRendererHistory = data.nodeR5TopologyCommitCheckpoint.rendererPackageHistory
if (!Array.isArray(topologyRendererHistory)) {
  throw new Error("TopologyCommit Renderer history must be an array")
}
for (const value of topologyRendererHistory) {
  const entry = objectRecord(value, "topologyCommit Renderer history entry")
  validateCheckpointHistoryEntry(entry, topologyCommitRendererCheckpoint, "topologyCommit Renderer")
}

const topologyClosureNodeHistory = data.nodeR5TopologyClosureCheckpoint.nodePackageHistory
if (!Array.isArray(topologyClosureNodeHistory)) {
  throw new Error("Topology closure Node history must be an array")
}
for (const value of topologyClosureNodeHistory) {
  const entry = objectRecord(value, "topology closure Node history entry")
  validateCheckpointHistoryEntry(entry, topologyClosureNodeCheckpoint, "topology closure Node")
}

const topologyClosureRendererHistory = data.nodeR5TopologyClosureCheckpoint.rendererPackageHistory
if (!Array.isArray(topologyClosureRendererHistory)) {
  throw new Error("Topology closure Renderer history must be an array")
}
for (const value of topologyClosureRendererHistory) {
  const entry = objectRecord(value, "topology closure Renderer history entry")
  validateCheckpointHistoryEntry(entry, topologyClosureRendererCheckpoint, "topology closure Renderer")
}

const calibrationNodeHistory = data.nodeR5TransformCalibrationCheckpoint.nodePackageHistory
if (!Array.isArray(calibrationNodeHistory)) {
  throw new Error("Transform calibration Node history must be an array")
}
for (const value of calibrationNodeHistory) {
  const entry = objectRecord(value, "transform calibration Node history entry")
  validateCheckpointHistoryEntry(entry, calibrationNodeCheckpoint, "transform calibration Node")
}

const calibrationRendererHistory = data.nodeR5TransformCalibrationCheckpoint.rendererPackageHistory
if (!Array.isArray(calibrationRendererHistory)) {
  throw new Error("Transform calibration Renderer history must be an array")
}
for (const value of calibrationRendererHistory) {
  const entry = objectRecord(value, "transform calibration Renderer history entry")
  validateCheckpointHistoryEntry(entry, calibrationRendererCheckpoint, "transform calibration Renderer")
}

const transformClosureNodeHistory = data.nodeR5TransformClosureCheckpoint.nodePackageHistory
if (!Array.isArray(transformClosureNodeHistory)) {
  throw new Error("Transform closure Node history must be an array")
}
for (const value of transformClosureNodeHistory) {
  const entry = objectRecord(value, "transform closure Node history entry")
  validateCheckpointHistoryEntry(entry, transformClosureNodeCheckpoint, "transform closure Node")
}

const transformClosureRendererHistory = data.nodeR5TransformClosureCheckpoint.rendererPackageHistory
if (!Array.isArray(transformClosureRendererHistory)) {
  throw new Error("Transform closure Renderer history must be an array")
}
for (const value of transformClosureRendererHistory) {
  const entry = objectRecord(value, "transform closure Renderer history entry")
  validateCheckpointHistoryEntry(entry, transformClosureRendererCheckpoint, "transform closure Renderer")
}

const linkClosureNodeHistory = data.nodeR5LinkClosureCheckpoint.nodePackageHistory
if (!Array.isArray(linkClosureNodeHistory)) throw new Error("Link closure Node history must be an array")
for (const value of linkClosureNodeHistory) {
  const entry = objectRecord(value, "Link closure Node history entry")
  validateCheckpointHistoryEntry(entry, linkClosureNodeCheckpoint, "Link closure Node")
}

const linkClosureRendererHistory = data.nodeR5LinkClosureCheckpoint.rendererPackageHistory
if (!Array.isArray(linkClosureRendererHistory)) {
  throw new Error("Link closure Renderer history must be an array")
}
for (const value of linkClosureRendererHistory) {
  const entry = objectRecord(value, "Link closure Renderer history entry")
  validateCheckpointHistoryEntry(entry, linkClosureRendererCheckpoint, "Link closure Renderer")
}

const denseNodeHistory = data.nodeR5DenseLifecycleCheckpoint.nodePackageHistory
if (!Array.isArray(denseNodeHistory)) throw new Error("Dense lifecycle Node history must be an array")
for (const value of denseNodeHistory) {
  const entry = objectRecord(value, "dense lifecycle Node history entry")
  validateCheckpointHistoryEntry(entry, denseNodeCheckpoint, "dense lifecycle Node")
}

const denseRendererHistory = data.nodeR5DenseLifecycleCheckpoint.rendererPackageHistory
if (!Array.isArray(denseRendererHistory)) {
  throw new Error("Dense lifecycle Renderer history must be an array")
}
for (const value of denseRendererHistory) {
  const entry = objectRecord(value, "dense lifecycle Renderer history entry")
  validateCheckpointHistoryEntry(entry, denseRendererCheckpoint, "dense lifecycle Renderer")
}

const decisionNodeHistory = data.nodeR5OwnerDecisionsCheckpoint.nodePackageHistory
if (!Array.isArray(decisionNodeHistory)) throw new Error("Owner decision Node history must be an array")
for (const value of decisionNodeHistory) {
  const entry = objectRecord(value, "owner decision Node history entry")
  validateCheckpointHistoryEntry(entry, decisionNodeCheckpoint, "owner decision Node")
}

const decisionRendererHistory = data.nodeR5OwnerDecisionsCheckpoint.rendererPackageHistory
if (!Array.isArray(decisionRendererHistory)) {
  throw new Error("Owner decision Renderer history must be an array")
}
for (const value of decisionRendererHistory) {
  const entry = objectRecord(value, "owner decision Renderer history entry")
  validateCheckpointHistoryEntry(entry, decisionRendererCheckpoint, "owner decision Renderer")
}

const compatibilityNodeHistory = data.nodeR5BlenderCompatibilityCheckpoint.nodePackageHistory
if (!Array.isArray(compatibilityNodeHistory)) {
  throw new Error("Blender compatibility Node history must be an array")
}
for (const value of compatibilityNodeHistory) {
  const entry = objectRecord(value, "Blender compatibility Node history entry")
  validateCheckpointHistoryEntry(entry, nodeCheckpoint, "Blender compatibility Node")
}

const compatibilityRendererHistory = data.nodeR5BlenderCompatibilityCheckpoint.rendererPackageHistory
if (!Array.isArray(compatibilityRendererHistory)) {
  throw new Error("Blender compatibility Renderer history must be an array")
}
for (const value of compatibilityRendererHistory) {
  const entry = objectRecord(value, "Blender compatibility Renderer history entry")
  validateCheckpointHistoryEntry(entry, rendererCheckpoint, "Blender compatibility Renderer")
}

console.log(
  `source evidence: ${repositories.size} live repositories, ` +
  `${historyValues.length} historical package histories, ` +
  `${checkpointHistory.length} Node checkpoint histories, ` +
  `${rendererCheckpointHistory.length} Renderer checkpoint histories, ` +
  `${closureNodeHistory.length + closureRendererHistory.length} R4 closure histories, ` +
  `${appendNodeHistory.length + appendRendererHistory.length} append checkpoint histories, ` +
  `${topologyNodeHistory.length + topologyRendererHistory.length} topologyCommit histories, ` +
  `${topologyClosureNodeHistory.length + topologyClosureRendererHistory.length} topology closure histories, ` +
  `${calibrationNodeHistory.length + calibrationRendererHistory.length} transform calibration histories, ` +
  `${transformClosureNodeHistory.length + transformClosureRendererHistory.length} transform closure histories, ` +
  `${linkClosureNodeHistory.length + linkClosureRendererHistory.length} Link closure histories, ` +
  `${denseNodeHistory.length + denseRendererHistory.length} dense lifecycle histories, ` +
  `${decisionNodeHistory.length + decisionRendererHistory.length} owner decision histories, ` +
  `${compatibilityNodeHistory.length + compatibilityRendererHistory.length} Blender compatibility histories`,
)

function validateCheckpointHistoryEntry(
  entry: Readonly<Record<string, unknown>>,
  repository: Readonly<Record<string, unknown>>,
  label: string,
): void {
  const packageName = stringValue(entry.package, `${label} package`)
  const path = stringValue(repository.path, `${packageName} ${label} path`)
  const revision = stringValue(repository.head, `${packageName} ${label} revision`)
  const prefix = stringValue(entry.prefix, `${packageName} ${label} prefix`)
  const count = Number(git(path, ["rev-list", "--count", revision, "--", prefix]))
  expectEqual(`${packageName} ${label} history count`, count, entry.commitCount)
  const first = git(path, ["log", "--reverse", "--format=%H", revision, "--", prefix]).split("\n")[0]
  const last = git(path, ["log", "-1", "--format=%H", revision, "--", prefix])
  expectEqual(`${packageName} ${label} first history commit`, first, entry.firstCommit)
  expectEqual(`${packageName} ${label} last history commit`, last, entry.lastCommit)
}

function git(path: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", ...args], {cwd: path, stdout: "pipe", stderr: "pipe"})
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim() || `git ${args.join(" ")} failed in ${path}`)
  }
  return result.stdout.toString().trimEnd()
}

function gitOptional(path: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", ...args], {cwd: path, stdout: "pipe", stderr: "pipe"})
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr.toString().trim() || `git ${args.join(" ")} failed in ${path}`)
  }
  return result.stdout.toString().trimEnd()
}

function gitExitCode(path: string, args: readonly string[]): number {
  const result = Bun.spawnSync(["git", ...args], {cwd: path, stdout: "ignore", stderr: "pipe"})
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr.toString().trim() || `git ${args.join(" ")} failed in ${path}`)
  }
  return result.exitCode
}

function expectEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label} drifted: ${String(actual)} != ${String(expected)}`)
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function objectRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Readonly<Record<string, unknown>>
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`)
  return value
}
