import {join} from "node:path"
import {loadFoundationData} from "./model.ts"

export type NodeCutoverAuthorization = Readonly<{
  acceptedRevision: string | null
  remoteRef: string | null
  r5Accepted: boolean
  sourceFrozenReadOnly: boolean
  historyImportAuthorized: boolean
  ownershipSwitchAuthorized: boolean
  pushAuthorized: boolean
}>

export type NodeCutoverPackage = Readonly<{
  package: string
  sourcePrefix: string
  destination: string
  placeholderFiles: readonly string[]
  placeholderOnly: boolean
  splitCommand: readonly string[]
  addCommand: readonly string[]
}>

export type NodeCutoverPlan = Readonly<{
  contract: "visual-monorepo-node-cutover-plan/1"
  source: Readonly<{
    repository: "node"
    path: string
    observedRevision: string
    actualRevision: string
    clean: boolean
    origin: string
    originMain: string
    remoteBacked: boolean
  }>
  authorization: NodeCutoverAuthorization
  packages: readonly NodeCutoverPackage[]
  gates: Readonly<{
    sourceRevisionExact: boolean
    sourceClean: boolean
    remoteRefPresent: boolean
    remoteBacked: boolean
    r5Accepted: boolean
    sourceFrozenReadOnly: boolean
    historyImportAuthorized: boolean
    ownershipSwitchAuthorized: boolean
    destinationOwnerReadOnly: boolean
    destinationsPlaceholderOnly: boolean
    worktreeClean: boolean
  }>
  executable: boolean
  blockers: readonly string[]
  invariants: Readonly<{
    sourceMutationAllowed: false
    squash: false
    createsBranch: false
    createsWorktree: false
    executesCommands: false
    productionImportPerformed: false
    pushAuthorized: boolean
  }>
  orderedCommands: readonly Readonly<{
    purpose: string
    argv: readonly string[]
    expectedStdout?: string
  }>[]
}>

export type NodeCutoverPlanInput = Readonly<{
  sourcePath: string
  observedRevision: string
  actualRevision: string
  sourceClean: boolean
  origin: string
  originMain: string
  remoteBacked: boolean
  worktreeClean: boolean
  destinationOwnerReadOnly: boolean
  authorization: NodeCutoverAuthorization
  imports: readonly Readonly<{
    package: string
    sourcePrefix: string
    destination: string
    placeholderFiles: readonly string[]
  }>[]
}>

export function createNodeCutoverPlan(input: NodeCutoverPlanInput): NodeCutoverPlan {
  const acceptedRevision = input.authorization.acceptedRevision
  const remoteRef = input.authorization.remoteRef
  const packages = input.imports.map(entry => {
    const splitRef = `<split:${entry.package}>`
    return Object.freeze({
      ...entry,
      placeholderOnly: entry.placeholderFiles.length === 1 && entry.placeholderFiles[0] === "README.md",
      splitCommand: Object.freeze([
        "git",
        "subtree",
        "split",
        `--prefix=${entry.sourcePrefix}`,
        "refs/migration/node/source",
      ]),
      addCommand: Object.freeze([
        "git",
        "subtree",
        "add",
        `--prefix=${entry.destination}`,
        splitRef,
      ]),
    })
  })
  const gates = Object.freeze({
    sourceRevisionExact: acceptedRevision !== null &&
      acceptedRevision === input.observedRevision &&
      acceptedRevision === input.actualRevision,
    sourceClean: input.sourceClean,
    remoteRefPresent: remoteRef !== null,
    remoteBacked: input.remoteBacked && acceptedRevision !== null && remoteRef !== null,
    r5Accepted: input.authorization.r5Accepted,
    sourceFrozenReadOnly: input.authorization.sourceFrozenReadOnly,
    historyImportAuthorized: input.authorization.historyImportAuthorized,
    ownershipSwitchAuthorized: input.authorization.ownershipSwitchAuthorized,
    destinationOwnerReadOnly: input.destinationOwnerReadOnly,
    destinationsPlaceholderOnly: packages.every(entry => entry.placeholderOnly),
    worktreeClean: input.worktreeClean,
  })
  const blockers = Object.freeze(Object.entries(gates)
    .filter(([, value]) => !value)
    .map(([gate]) => gate))
  const orderedCommands = Object.freeze([
    Object.freeze({
      purpose: "fetch the explicitly accepted remote-backed Node revision",
      argv: Object.freeze([
        "git",
        "fetch",
        input.origin,
        `${remoteRef ?? "<accepted-remote-ref>"}:refs/migration/node/source`,
      ]),
    }),
    Object.freeze({
      purpose: "verify the fetched ref resolves to the accepted revision",
      argv: Object.freeze(["git", "rev-parse", "refs/migration/node/source^{commit}"]),
      expectedStdout: acceptedRevision ?? "<accepted-revision>",
    }),
    Object.freeze({
      purpose: "remove reserved placeholder files in the authorized cutover transaction",
      argv: Object.freeze(["git", "rm", ...packages.flatMap(entry =>
        entry.placeholderFiles.map(file => `${entry.destination}/${file}`))]),
    }),
    Object.freeze({
      purpose: "restore a clean worktree before subtree operations",
      argv: Object.freeze([
        "git",
        "commit",
        "-m",
        "chore: open Node package destinations",
      ]),
    }),
    ...packages.flatMap(entry => [
      Object.freeze({purpose: `derive unsquashed prefix history for ${entry.package}`, argv: entry.splitCommand}),
      Object.freeze({purpose: `add ${entry.package} under its reserved destination`, argv: entry.addCommand}),
    ]),
    Object.freeze({
      purpose: "run unchanged package and affected-consumer checks before ownership switch",
      argv: Object.freeze(["bun", "run", "packages:check:external"]),
    }),
  ])
  return Object.freeze({
    contract: "visual-monorepo-node-cutover-plan/1",
    source: Object.freeze({
      repository: "node",
      path: input.sourcePath,
      observedRevision: input.observedRevision,
      actualRevision: input.actualRevision,
      clean: input.sourceClean,
      origin: input.origin,
      originMain: input.originMain,
      remoteBacked: input.remoteBacked,
    }),
    authorization: input.authorization,
    packages: Object.freeze(packages),
    gates,
    executable: blockers.length === 0,
    blockers,
    invariants: Object.freeze({
      sourceMutationAllowed: false,
      squash: false,
      createsBranch: false,
      createsWorktree: false,
      executesCommands: false,
      productionImportPerformed: false,
      pushAuthorized: input.authorization.pushAuthorized,
    }),
    orderedCommands,
  })
}

export async function readNodeCutoverPlan(root = join(import.meta.dir, "../..")): Promise<NodeCutoverPlan> {
  const data = await loadFoundationData(root)
  const nodeCutover = data.nodeCutover as Readonly<Record<string, unknown>>
  const historyImport = data.historyImport as Readonly<Record<string, unknown>>
  const authorization = requireAuthorization(nodeCutover.r6Authorization)
  const sourcePath = requireString(nodeCutover.sourcePath, "Node source path")
  const observedRevision = requireString(nodeCutover.observedHead, "Node observed revision")
  const actualRevision = git(sourcePath, ["rev-parse", "HEAD"])
  const sourceStatus = git(sourcePath, ["status", "--porcelain=v1"])
  const origin = git(sourcePath, ["remote", "get-url", "origin"])
  const originMain = git(sourcePath, ["rev-parse", "origin/main"])
  const remoteBacked = authorization.acceptedRevision !== null &&
    gitExitCode(sourcePath, ["merge-base", "--is-ancestor", authorization.acceptedRevision, "origin/main"]) === 0
  const imports = requireArray(historyImport.imports, "history imports")
    .map(value => requireRecord(value, "history import"))
    .filter(entry => entry.sourceRepository === "node")
  const owner = data.ownership.groups.find(group => group.id === "node")
    ?.owners.find(value => value.id === "destination:node")
  return createNodeCutoverPlan({
    sourcePath,
    observedRevision,
    actualRevision,
    sourceClean: sourceStatus.length === 0,
    origin,
    originMain,
    remoteBacked,
    worktreeClean: git(root, ["status", "--porcelain=v1"]).length === 0,
    destinationOwnerReadOnly: owner?.writable === false && owner.state === "reserved-empty",
    authorization,
    imports: await Promise.all(imports.map(async entry => {
      const destination = requireString(entry.destination, "Node destination")
      return Object.freeze({
        package: requireString(entry.package, "Node package"),
        sourcePrefix: requireString(entry.sourcePrefix, "Node source prefix"),
        destination,
        placeholderFiles: Object.freeze(await filesBelow(join(root, destination))),
      })
    })),
  })
}

async function filesBelow(directory: string): Promise<string[]> {
  const values: string[] = []
  const glob = new Bun.Glob("**/*")
  for await (const value of glob.scan({cwd: directory, onlyFiles: true})) values.push(value)
  return values.sort()
}

function requireAuthorization(value: unknown): NodeCutoverAuthorization {
  const record = requireRecord(value, "Node R6 authorization")
  return Object.freeze({
    acceptedRevision: nullableString(record.acceptedRevision, "acceptedRevision"),
    remoteRef: nullableString(record.remoteRef, "remoteRef"),
    r5Accepted: requireBoolean(record.r5Accepted, "r5Accepted"),
    sourceFrozenReadOnly: requireBoolean(record.sourceFrozenReadOnly, "sourceFrozenReadOnly"),
    historyImportAuthorized: requireBoolean(record.historyImportAuthorized, "historyImportAuthorized"),
    ownershipSwitchAuthorized: requireBoolean(record.ownershipSwitchAuthorized, "ownershipSwitchAuthorized"),
    pushAuthorized: requireBoolean(record.pushAuthorized, "pushAuthorized"),
  })
}

function requireRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
  return value as Readonly<Record<string, unknown>>
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`)
  return value
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string`)
  return value
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null
  return requireString(value, label)
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be boolean`)
  return value
}

function git(path: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", ...args], {cwd: path, stdout: "pipe", stderr: "pipe"})
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().trim() || `git ${args.join(" ")} failed`)
  return result.stdout.toString().trimEnd()
}

function gitExitCode(path: string, args: readonly string[]): number {
  const result = Bun.spawnSync(["git", ...args], {cwd: path, stdout: "ignore", stderr: "pipe"})
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr.toString().trim() || `git ${args.join(" ")} failed`)
  }
  return result.exitCode
}

if (import.meta.main) console.log(JSON.stringify(await readNodeCutoverPlan(), null, 2))
