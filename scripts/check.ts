import {join} from "node:path"

const root = join(import.meta.dir, "..")
const expected = Object.freeze([
  "projects/engine",
  "projects/layout",
  "projects/ui",
  "projects/node",
  "projects/highlighter",
  "projects/storybook",
])

const status = Bun.spawnSync(["git", "submodule", "status", "--recursive"], {
  cwd: root,
  stdout: "pipe",
  stderr: "pipe",
})
if (status.exitCode !== 0) fail(status.stderr.toString())

const lines = status.stdout.toString().trim().split(/\r?\n/).filter(Boolean)
const paths = new Set<string>()
for (const line of lines) {
  const state = line[0]
  const parts = line.slice(1).trim().split(/\s+/)
  const path = parts[1]
  if (path === undefined) fail(`Invalid submodule status line: ${line}`)
  if (state === "-" || state === "+" || state === "U") {
    fail(`Submodule is not pinned to the superproject index: ${line}`)
  }
  paths.add(path)
}

for (const path of expected) {
  if (!paths.has(path)) fail(`Required submodule is missing or uninitialized: ${path}`)
  const childStatus = Bun.spawnSync(["git", "status", "--porcelain=v1"], {
    cwd: join(root, path),
    stdout: "pipe",
    stderr: "pipe",
  })
  if (childStatus.exitCode !== 0) fail(childStatus.stderr.toString())
  if (childStatus.stdout.toString().trim().length > 0) fail(`Dirty submodule: ${path}`)
}

const budget = await Bun.file(join(root, "budgets/github.json")).json() as {
  schemaVersion?: unknown
  policy?: {artifactRetentionDays?: unknown; allowLargerRunners?: unknown}
}
if (budget.schemaVersion !== 1) fail("Unsupported GitHub budget schema")
if (budget.policy?.artifactRetentionDays !== 1) fail("GitHub artifact retention must be one day")
if (budget.policy?.allowLargerRunners !== false) fail("Larger GitHub-hosted runners must stay disabled")

console.log(`webxr-space: ${expected.length} clean pinned submodules`)

function fail(message: string): never {
  console.error(message.trim())
  process.exit(1)
}
