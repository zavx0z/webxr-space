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
const latestRepositories = objectRecord(
  data.nodeR5AppendCheckpoint.repositories,
  "latest append checkpoint repositories",
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
  validateCheckpointHistoryEntry(entry, nodeCheckpoint, "append Node")
}

const appendRendererHistory = data.nodeR5AppendCheckpoint.rendererPackageHistory
if (!Array.isArray(appendRendererHistory)) throw new Error("Append Renderer history must be an array")
for (const value of appendRendererHistory) {
  const entry = objectRecord(value, "append Renderer history entry")
  validateCheckpointHistoryEntry(entry, rendererCheckpoint, "append Renderer")
}

console.log(
  `source evidence: ${repositories.size} live repositories, ` +
  `${historyValues.length} historical package histories, ` +
  `${checkpointHistory.length} Node checkpoint histories, ` +
  `${rendererCheckpointHistory.length} Renderer checkpoint histories, ` +
  `${closureNodeHistory.length + closureRendererHistory.length} R4 closure histories, ` +
  `${appendNodeHistory.length + appendRendererHistory.length} append checkpoint histories`,
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
