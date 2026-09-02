import {join} from "node:path"
import {loadFoundationData} from "./model.ts"

const root = join(import.meta.dir, "../..")
const data = await loadFoundationData(root)
const values = data.sourceSnapshot.repositories

if (!Array.isArray(values)) throw new Error("Source repositories must be an array")
const repositories = new Map<string, Readonly<Record<string, unknown>>>()

for (const value of values) {
  const record = objectRecord(value, "source repository")
  const id = stringValue(record.id, "source repository id")
  const path = stringValue(record.path, `source repository ${id} path`)
  if (repositories.has(id)) throw new Error(`Duplicate source repository: ${id}`)
  repositories.set(id, record)

  expectEqual(`${id} HEAD`, git(path, ["rev-parse", "HEAD"]), record.head)
  expectEqual(`${id} origin`, git(path, ["remote", "get-url", "origin"]), record.remote)
  expectEqual(`${id} origin/main`, git(path, ["rev-parse", "origin/main"]), record.originMain)
  const branch = gitOptional(path, ["symbolic-ref", "--short", "-q", "HEAD"])
  expectEqual(`${id} branch`, branch.length === 0 ? null : branch, record.branch)

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
  const repository = repositories.get(stringValue(entry.repository, `${packageName} repository`))
  if (repository === undefined) throw new Error(`Unknown history repository for ${packageName}`)
  const path = stringValue(repository.path, `${packageName} repository path`)
  const prefix = stringValue(entry.prefix, `${packageName} prefix`)
  const count = Number(git(path, ["rev-list", "--count", "HEAD", "--", prefix]))
  expectEqual(`${packageName} history count`, count, entry.commitCount)
  const first = git(path, ["log", "--reverse", "--format=%H", "--", prefix]).split("\n")[0]
  const last = git(path, ["log", "-1", "--format=%H", "--", prefix])
  expectEqual(`${packageName} first history commit`, first, entry.firstCommit)
  expectEqual(`${packageName} last history commit`, last, entry.lastCommit)
}

console.log(`source evidence: ${repositories.size} repositories, ${historyValues.length} package histories`)

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
