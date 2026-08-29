import {join} from "node:path"
import {
  assertExternalStorybookWorkspace,
  assertGitlinks,
  assertWorkspaceLinks,
  gitlinkPaths,
} from "./workspace.ts"

const root = join(import.meta.dir, "..")

try {
  await assertExternalStorybookWorkspace(root)
  await assertGitlinks(root, {verifyRemote: true})
  await assertWorkspaceLinks(root, {verifyToolRemotes: true})
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

const budget = await Bun.file(join(root, "budgets/github.json")).json() as {
  schemaVersion?: unknown
  policy?: {artifactRetentionDays?: unknown; allowLargerRunners?: unknown}
}
if (budget.schemaVersion !== 1) fail("Unsupported GitHub budget schema")
if (budget.policy?.artifactRetentionDays !== 1) fail("GitHub artifact retention must be one day")
if (budget.policy?.allowLargerRunners !== false) fail("Larger GitHub-hosted runners must stay disabled")

console.log(
  `webxr-space: ${gitlinkPaths.length} gitlinks, optional external Storybook declarations, linked owners, and consumer identities`,
)

function fail(message: string): never {
  console.error(message.trim())
  process.exit(1)
}
