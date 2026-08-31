import type {Dirent} from "node:fs"
import {lstat, readdir, realpath} from "node:fs/promises"
import {homedir} from "node:os"
import {dirname, isAbsolute, join, relative, resolve, sep} from "node:path"

export const gitlinkPaths = Object.freeze([
  "projects/engine",
  "projects/ui",
  "projects/node",
] as const)

export const workspaceConsumerPaths = Object.freeze([
  ".",
  ...gitlinkPaths,
] as const)

export const externalStorybookSchemaUrl =
  "https://raw.githubusercontent.com/zavx0z/storybook/main/schemas/manifest.schema.json" as const

export const externalStorybookProjectDeclarations = Object.freeze([
  Object.freeze({
    id: "engine",
    reference: "../projects/engine/.storybook/manifest.json",
    path: "projects/engine/.storybook/manifest.json",
  }),
  Object.freeze({
    id: "ui",
    reference: "../projects/ui/.storybook/manifest.json",
    path: "projects/ui/.storybook/manifest.json",
  }),
  Object.freeze({
    id: "nodes",
    reference: "../projects/node/.storybook/manifest.json",
    path: "projects/node/.storybook/manifest.json",
  }),
] as const)

export type WorkspaceLinkDefinition = Readonly<{
  name: string
  path: string
  revision?: string
}>

export type ConsumerManifestRecord = Readonly<{
  path: string
  directory: string
  manifest: Readonly<Record<string, unknown>>
}>

export const workspaceLinks: readonly WorkspaceLinkDefinition[] = Object.freeze([
  {name: "@engine/core", path: "projects/engine/packages/core"},
  {
    name: "@zavx0z/dom",
    path: "../renderer/packages/dom",
    revision: "888a9966fffd222df7abe039d01f83ed96dbfd23",
  },
  {name: "@zavx0z/renderer", path: "../renderer/packages/core"},
  {name: "@zavx0z/renderer-browser", path: "../renderer/packages/browser"},
  {name: "@zavx0z/renderer-webgpu", path: "../renderer/packages/webgpu"},
  {name: "@zavx0z/react", path: "../renderer/packages/react"},
  {name: "@zavx0z/dom-devtools", path: "../renderer/packages/devtools"},
  {
    name: "@zavx0z/highlighter",
    path: "../highlighter",
    revision: "8d6dbd66fc04ca1109450d18ee3fcffcf6e29606",
  },
  {name: "@ui/components", path: "projects/ui/packages/components"},
  {name: "@nodes/layout", path: "projects/node/packages/layout"},
  {name: "@zavx0z/template", path: "../template"},
])

export type GitlinkPathViews = Readonly<{
  configured: readonly string[]
  indexed: readonly string[]
  checkedOut: readonly string[]
}>

export type GitlinkRecord = Readonly<{
  path: string
  branch: string | undefined
  mode: string | undefined
  indexRevision: string | undefined
  worktreeRevision: string | undefined
  state: string | undefined
}>

type ResolvedWorkspaceLink = Readonly<{
  name: string
  path: string
  revision?: string
  directory: string
}>

const dependencyFields = Object.freeze([
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const)

export async function bootstrapWorkspace(superprojectRoot: string): Promise<void> {
  await assertExternalStorybookWorkspace(superprojectRoot)
  const links = await resolveWorkspaceLinks(superprojectRoot)
  assertToolRepositoryPins(links)
  for (const link of links) {
    run(["bun", "link", "--silent"], link.directory)
    console.log(`registered ${link.name} -> ${link.path}`)
  }
  for (const consumerPath of workspaceConsumerPaths) {
    const consumerRoot = resolve(superprojectRoot, consumerPath)
    run(["bun", "install", "--frozen-lockfile"], consumerRoot)
    console.log(`installed ${consumerPath}`)
  }
  await assertWorkspaceLinks(superprojectRoot)
}

export async function assertWorkspaceLinks(
  superprojectRoot: string,
  options: Readonly<{verifyToolRemotes?: boolean}> = {},
): Promise<void> {
  await assertExternalStorybookWorkspace(superprojectRoot)
  const links = await resolveWorkspaceLinks(superprojectRoot)
  assertToolRepositoryPins(links, options.verifyToolRemotes === true)
  const bunInstallRoot = process.env.BUN_INSTALL ?? join(homedir(), ".bun")
  const globalModules = join(bunInstallRoot, "install", "global", "node_modules")
  const owners = new Map(links.map((link) => [link.name, link]))
  const ownerRealpaths = new Map<string, string>()

  for (const link of links) {
    const expected = await realpath(link.directory)
    ownerRealpaths.set(link.name, expected)
    await assertRealpath(join(globalModules, ...link.name.split("/")), expected, `global ${link.name}`)
  }

  for (const consumerPath of workspaceConsumerPaths) {
    const consumerRoot = resolve(superprojectRoot, consumerPath)
    const manifests = await discoverConsumerManifests(superprojectRoot, consumerPath)
    for (const record of manifests) {
      const dependencies = collectOwnedLinkDependencies(record.manifest, record.path, owners)
      for (const name of dependencies) {
        const expected = ownerRealpaths.get(name)
        if (expected === undefined) throw new Error(`Workspace owner has no realpath: ${name}`)
        await assertNearestDependencyOwner(
          record.directory,
          consumerRoot,
          name,
          expected,
          record.path,
        )
      }
    }
  }
}

/**
 * Verifies the optional data-only Storybook composition without importing or
 * pinning the external tool. Renderer remains an independently linked sibling,
 * never a workspace declaration child.
 */
export async function assertExternalStorybookWorkspace(
  superprojectRoot: string,
): Promise<void> {
  const storybookRoot = join(superprojectRoot, ".storybook")
  const entries = (await readdir(storybookRoot, {withFileTypes: true}))
    .filter((entry) => entry.isFile())
    .map(({name}) => name)
    .sort()
  if (JSON.stringify(entries) !== JSON.stringify(["manifest.json"])) {
    throw new Error(`Superproject .storybook must contain only manifest.json: ${entries.join(", ")}`)
  }
  const manifestPath = join(storybookRoot, "manifest.json")
  const manifest = await Bun.file(manifestPath).json() as Record<string, unknown>
  assertExactObjectKeys("external Storybook workspace manifest", manifest, [
    "$schema",
    "schemaVersion",
    "kind",
    "id",
    "label",
    "projects",
    "readme",
  ])
  if (manifest.$schema !== externalStorybookSchemaUrl || manifest.schemaVersion !== 1 ||
    manifest.kind !== "workspace" || manifest.id !== "webxr-space" ||
    manifest.label !== "WebXR Space" || manifest.readme !== "../README.md") {
    throw new Error("Invalid external Storybook workspace declaration")
  }
  if (!Array.isArray(manifest.projects)) {
    throw new Error("External Storybook workspace projects must be an array")
  }
  const references = manifest.projects.map((value, index) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Invalid external Storybook project reference ${index}`)
    }
    const record = value as Record<string, unknown>
    assertExactObjectKeys(`external Storybook project reference ${index}`, record, ["declaration"])
    if (typeof record.declaration !== "string") {
      throw new Error(`Invalid external Storybook project declaration ${index}`)
    }
    return record.declaration
  })
  const expectedReferences = externalStorybookProjectDeclarations.map(({reference}) => reference)
  if (JSON.stringify(references) !== JSON.stringify(expectedReferences)) {
    throw new Error(`External Storybook workspace project order mismatch: ${references.join(", ")}`)
  }
  if (references.some((reference) => /renderer/iu.test(reference))) {
    throw new Error("Renderer must remain an independently attached Storybook root")
  }

  for (const declaration of externalStorybookProjectDeclarations) {
    const path = join(superprojectRoot, declaration.path)
    const child = await Bun.file(path).json() as Record<string, unknown>
    if (child.$schema !== externalStorybookSchemaUrl || child.schemaVersion !== 1 ||
      child.kind !== "project" || child.id !== declaration.id) {
      throw new Error(`Invalid external Storybook child declaration: ${declaration.path}`)
    }
  }

  for (const consumerPath of workspaceConsumerPaths) {
    for (const record of await discoverConsumerManifests(superprojectRoot, consumerPath)) {
      const name = record.manifest.name
      if (typeof name === "string" && /^@[^/]+\/storybook$/u.test(name)) {
        throw new Error(`Consumer private Storybook package remains: ${record.path}`)
      }
      for (const field of dependencyFields) {
        const dependencies = record.manifest[field]
        if (dependencies !== undefined && typeof dependencies === "object" && dependencies !== null &&
          !Array.isArray(dependencies) && "@zavx0z/storybook" in dependencies) {
          throw new Error(`Consumer Storybook dependency remains: ${record.path}`)
        }
      }
      const scripts = record.manifest.scripts
      if (scripts !== undefined && typeof scripts === "object" && scripts !== null &&
        !Array.isArray(scripts) && "storybook" in scripts) {
        throw new Error(`Consumer Storybook lifecycle remains: ${record.path}`)
      }
    }
  }
}

export async function assertGitlinks(
  superprojectRoot: string,
  options: Readonly<{verifyRemote?: boolean}> = {},
): Promise<void> {
  const records = collectGitlinkRecords(superprojectRoot)
  validateGitlinkRecords(records)

  for (const record of records) {
    const childRoot = join(superprojectRoot, record.path)
    const dirty = git(["status", "--porcelain=v1"], childRoot)
    if (dirty.length > 0) throw new Error(`Dirty submodule: ${record.path}`)
    if (options.verifyRemote === true) {
      assertRemoteContains(record.path, record.indexRevision!, childRoot)
    }
  }
}

export function validateGitlinkPathViews(views: GitlinkPathViews): void {
  assertExactPaths("configured submodules", views.configured, gitlinkPaths)
  assertExactPaths("indexed gitlinks", views.indexed, gitlinkPaths)
  assertExactPaths("checked out submodules", views.checkedOut, gitlinkPaths)
}

export function validateGitlinkRecords(records: readonly GitlinkRecord[]): void {
  assertExactPaths("configured submodules", records.map(({path}) => path), gitlinkPaths)

  for (const record of records) {
    if (record.branch !== "main") {
      throw new Error(`Submodule ${record.path} must declare branch main`)
    }
    if (record.mode !== "160000") {
      throw new Error(`Submodule ${record.path} is not an indexed gitlink`)
    }
    if (record.state !== " ") {
      throw new Error(`Submodule ${record.path} is not pinned to the indexed revision`)
    }
    if (record.indexRevision === undefined || record.worktreeRevision !== record.indexRevision) {
      throw new Error(`Submodule ${record.path} revision does not match its gitlink`)
    }
  }
}

async function resolveWorkspaceLinks(superprojectRoot: string): Promise<ResolvedWorkspaceLink[]> {
  const resolved: ResolvedWorkspaceLink[] = []
  for (const definition of workspaceLinks) {
    if (isAbsolute(definition.path)) {
      throw new Error(`Workspace link path must stay relative: ${definition.path}`)
    }
    const directory = resolve(superprojectRoot, definition.path)
    const manifestPath = join(directory, "package.json")
    if (!await Bun.file(manifestPath).exists()) {
      throw new Error(`Workspace link source is missing: ${definition.path}`)
    }
    const manifest = await Bun.file(manifestPath).json() as {name?: unknown}
    if (manifest.name !== definition.name) {
      throw new Error(`Expected ${definition.name} at ${definition.path}, found ${String(manifest.name)}`)
    }
    resolved.push(Object.freeze({...definition, directory}))
  }
  return resolved
}

export function collectOwnedLinkDependencies(
  manifest: unknown,
  consumerPath: string,
  owners: ReadonlyMap<string, WorkspaceLinkDefinition> = new Map(
    workspaceLinks.map((definition) => [definition.name, definition]),
  ),
): string[] {
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    throw new Error(`Invalid package manifest: ${consumerPath}`)
  }
  const record = manifest as Record<string, unknown>
  const found = new Set<string>()
  for (const field of dependencyFields) {
    const section = record[field]
    if (section === undefined) continue
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new Error(`Invalid ${field} in ${consumerPath}`)
    }
    for (const [name, specifier] of Object.entries(section)) {
      if (typeof specifier !== "string" || !specifier.startsWith("link:")) continue
      const owner = owners.get(name)
      if (owner === undefined) {
        throw new Error(`${consumerPath} declares unowned linked dependency ${name}`)
      }
      if (specifier !== `link:${name}`) {
        throw new Error(`${consumerPath} must link ${name} by its exact owner name`)
      }
      found.add(name)
    }
  }
  return [...found].sort()
}

export function workspacePatternsFromManifest(manifest: unknown, manifestPath: string): string[] {
  const record = packageManifestRecord(manifest, manifestPath)
  const workspaces = record.workspaces
  if (workspaces === undefined) return []
  if (!Array.isArray(workspaces) || workspaces.length === 0) {
    throw new Error(`Invalid workspaces in ${manifestPath}`)
  }
  const patterns: string[] = []
  for (const pattern of workspaces) {
    if (typeof pattern !== "string" || pattern.length === 0) {
      throw new Error(`Invalid workspace pattern in ${manifestPath}`)
    }
    if (pattern !== "packages/*") {
      throw new Error(`Unsupported workspace pattern ${pattern} in ${manifestPath}`)
    }
    patterns.push(pattern)
  }
  if (new Set(patterns).size !== patterns.length) {
    throw new Error(`Duplicate workspace pattern in ${manifestPath}`)
  }
  return patterns
}

export async function discoverConsumerManifests(
  superprojectRoot: string,
  consumerPath: string,
): Promise<ConsumerManifestRecord[]> {
  const consumerRoot = resolve(superprojectRoot, consumerPath)
  const rootManifestPath = join(consumerRoot, "package.json")
  const rootManifest = await readPackageManifest(rootManifestPath, consumerPath)
  const result: ConsumerManifestRecord[] = [Object.freeze({
    path: consumerPath,
    directory: consumerRoot,
    manifest: rootManifest,
  })]
  const patterns = workspacePatternsFromManifest(rootManifest, consumerPath)
  if (patterns.length === 0) return result

  const packagesRoot = join(consumerRoot, "packages")
  let entries: Dirent<string>[]
  try {
    entries = await readdir(packagesRoot, {withFileTypes: true})
  } catch {
    throw new Error(`Declared workspace directory is missing: ${consumerPath}/packages`)
  }
  const workspaceNames = new Set<string>()
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const directory = join(packagesRoot, entry.name)
    const manifestFile = join(directory, "package.json")
    if (!await Bun.file(manifestFile).exists()) continue
    const path = consumerPath === "."
      ? `packages/${entry.name}`
      : `${consumerPath}/packages/${entry.name}`
    const manifest = await readPackageManifest(manifestFile, path)
    const name = manifest.name as string
    if (workspaceNames.has(name)) throw new Error(`Duplicate workspace package name ${name}`)
    workspaceNames.add(name)
    result.push(Object.freeze({path, directory, manifest}))
  }
  if (result.length === 1) {
    throw new Error(`No workspace package manifests matched in ${consumerPath}`)
  }
  return result
}

export async function assertNearestDependencyOwner(
  manifestDirectory: string,
  consumerRoot: string,
  name: string,
  expected: string,
  manifestPath: string,
): Promise<void> {
  const resolvedManifestDirectory = resolve(manifestDirectory)
  const resolvedConsumerRoot = resolve(consumerRoot)
  const manifestRelative = relative(resolvedConsumerRoot, resolvedManifestDirectory)
  if (isOutsideRoot(manifestRelative)) {
    throw new Error(`Workspace manifest is outside its consumer root: ${manifestPath}`)
  }

  let directory = resolvedManifestDirectory
  while (true) {
    const candidate = join(directory, "node_modules", ...name.split("/"))
    if (await pathEntryExists(candidate)) {
      await assertRealpath(candidate, expected, `${manifestPath} ${name}`)
      return
    }
    if (directory === resolvedConsumerRoot) break
    const parent = dirname(directory)
    const parentRelative = relative(resolvedConsumerRoot, parent)
    if (parent === directory || isOutsideRoot(parentRelative)) {
      break
    }
    directory = parent
  }
  throw new Error(`${manifestPath} cannot resolve linked dependency ${name}`)
}

function isOutsideRoot(relativePath: string): boolean {
  return relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)
}

async function readPackageManifest(
  manifestFile: string,
  manifestPath: string,
): Promise<Readonly<Record<string, unknown>>> {
  let manifest: unknown
  try {
    manifest = await Bun.file(manifestFile).json()
  } catch {
    throw new Error(`Cannot read package manifest: ${manifestPath}`)
  }
  return packageManifestRecord(manifest, manifestPath)
}

function packageManifestRecord(
  manifest: unknown,
  manifestPath: string,
): Readonly<Record<string, unknown>> {
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    throw new Error(`Invalid package manifest: ${manifestPath}`)
  }
  const record = manifest as Readonly<Record<string, unknown>>
  if (typeof record.name !== "string" || record.name.length === 0) {
    throw new Error(`Invalid package name in ${manifestPath}`)
  }
  return record
}

async function pathEntryExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? (error as {code?: unknown}).code
      : undefined
    if (code === "ENOENT" || code === "ENOTDIR") return false
    throw error
  }
}

function collectGitlinkRecords(superprojectRoot: string): GitlinkRecord[] {
  const modules = moduleConfiguration(superprojectRoot)

  const index = new Map<string, Readonly<{mode: string; revision: string}>>()
  const indexedPaths: string[] = []
  const indexOutput = git(["ls-files", "--stage", "--", ...gitlinkPaths], superprojectRoot)
  for (const line of lines(indexOutput)) {
    const match = /^(\d{6}) ([0-9a-f]{40,64}) \d+\t(.+)$/.exec(line)
    if (match === null) throw new Error(`Invalid git index line: ${line}`)
    indexedPaths.push(match[3]!)
    index.set(match[3]!, Object.freeze({mode: match[1]!, revision: match[2]!}))
  }

  const worktrees = new Map<string, Readonly<{state: string; revision: string}>>()
  const checkedOutPaths: string[] = []
  const statusOutput = git(["submodule", "status", "--recursive"], superprojectRoot, false)
  for (const line of lines(statusOutput)) {
    const state = line[0]
    const parts = line.slice(1).trim().split(/\s+/)
    if (state === undefined || parts[0] === undefined || parts[1] === undefined) {
      throw new Error(`Invalid submodule status line: ${line}`)
    }
    checkedOutPaths.push(parts[1])
    worktrees.set(parts[1], Object.freeze({state, revision: parts[0]}))
  }
  validateGitlinkPathViews({
    configured: [...modules.values()].map(({path}) => path),
    indexed: indexedPaths,
    checkedOut: checkedOutPaths,
  })

  return gitlinkPaths.map((path) => {
    const module = [...modules.values()].find((entry) => entry.path === path)
    const indexed = index.get(path)
    const worktree = worktrees.get(path)
    return Object.freeze({
      path,
      branch: module?.branch,
      mode: indexed?.mode,
      indexRevision: indexed?.revision,
      worktreeRevision: worktree?.revision,
      state: worktree?.state,
    })
  })
}

function moduleConfiguration(
  superprojectRoot: string,
): Map<string, Readonly<{path: string; branch: string | undefined}>> {
  const result = new Map<string, Readonly<{path: string; branch: string | undefined}>>()
  const configuredPaths: string[] = []
  const configOutput = git(
    ["config", "-f", ".gitmodules", "--get-regexp", "^submodule\\..*\\.path$"],
    superprojectRoot,
  )
  for (const line of lines(configOutput)) {
    const match = /^submodule\.(.+)\.path\s+(.+)$/.exec(line)
    if (match === null) throw new Error(`Invalid .gitmodules path: ${line}`)
    const name = match[1]!
    const path = match[2]!
    configuredPaths.push(path)
    const branchResult = spawnGit(
      ["config", "-f", ".gitmodules", "--get", `submodule.${name}.branch`],
      superprojectRoot,
    )
    result.set(name, Object.freeze({
      path,
      branch: branchResult.exitCode === 0 ? output(branchResult.stdout).trim() : undefined,
    }))
  }
  assertExactPaths("configured submodules", configuredPaths, gitlinkPaths)
  return result
}

function assertToolRepositoryPins(
  links: readonly ResolvedWorkspaceLink[],
  verifyRemote = false,
): void {
  for (const link of links) {
    if (link.revision === undefined) continue
    const head = git(["rev-parse", "HEAD"], link.directory)
    if (head !== link.revision) {
      throw new Error(`${link.path} HEAD is ${head}, expected ${link.revision}`)
    }
    const dirty = git(["status", "--porcelain=v1"], link.directory)
    if (dirty.length > 0) throw new Error(`Dirty linked tool repository: ${link.path}`)
    if (verifyRemote) assertRemoteContains(link.path, link.revision, link.directory)
  }
}

function assertRemoteContains(path: string, revision: string, childRoot: string): void {
  const remote = spawnGit(["ls-remote", "--exit-code", "origin", "refs/heads/main"], childRoot)
  if (remote.exitCode !== 0) {
    throw new Error(`Cannot verify remote main for ${path}: ${output(remote.stderr).trim()}`)
  }
  const remoteRevision = output(remote.stdout).trim().split(/\s+/)[0]
  if (remoteRevision === undefined || !/^[0-9a-f]{40,64}$/.test(remoteRevision)) {
    throw new Error(`Invalid remote main revision for ${path}`)
  }
  if (remoteRevision === revision) return

  const hasRemoteRevision = spawnGit(["cat-file", "-e", `${remoteRevision}^{commit}`], childRoot)
  if (hasRemoteRevision.exitCode !== 0) {
    throw new Error(`Remote main moved for ${path}; fetch and inspect it before delivery`)
  }
  const contains = spawnGit(
    ["merge-base", "--is-ancestor", revision, remoteRevision],
    childRoot,
  )
  if (contains.exitCode !== 0) {
    throw new Error(`Remote main does not contain the pinned revision for ${path}`)
  }
}

async function assertRealpath(path: string, expected: string, label: string): Promise<void> {
  let actual: string
  try {
    actual = await realpath(path)
  } catch {
    throw new Error(`${label} link is missing: ${path}`)
  }
  if (actual !== expected) {
    throw new Error(`${label} resolves to ${actual}, expected ${expected}`)
  }
}

function assertExactPaths(label: string, actual: readonly string[], expected: readonly string[]): void {
  const actualSorted = [...actual].sort()
  const expectedSorted = [...expected].sort()
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error(`${label} mismatch: ${actualSorted.join(", ") || "none"}`)
  }
}

function assertExactObjectKeys(
  label: string,
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): void {
  const keys = Object.keys(value).sort()
  const accepted = [...expected].sort()
  if (JSON.stringify(keys) !== JSON.stringify(accepted)) {
    throw new Error(`${label} fields mismatch: ${keys.join(", ")}`)
  }
}

function git(args: readonly string[], cwd: string, trimStart = true): string {
  const result = spawnGit(args, cwd)
  if (result.exitCode !== 0) throw new Error(output(result.stderr).trim())
  const stdout = output(result.stdout).trimEnd()
  return trimStart ? stdout.trimStart() : stdout
}

function spawnGit(args: readonly string[], cwd: string): ReturnType<typeof Bun.spawnSync> {
  return Bun.spawnSync(["git", ...args], {cwd, stdout: "pipe", stderr: "pipe"})
}

function run(command: readonly string[], cwd: string): void {
  const result = Bun.spawnSync([...command], {cwd, stdout: "inherit", stderr: "inherit"})
  if (result.exitCode !== 0) throw new Error(`${command.join(" ")} failed in ${cwd}`)
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).filter((line) => line.length > 0)
}

function output(value: Uint8Array | undefined): string {
  return value?.toString() ?? ""
}

if (import.meta.main) {
  const superprojectRoot = resolve(import.meta.dir, "..")
  const command = process.argv[2]
  if (command === "bootstrap") {
    await bootstrapWorkspace(superprojectRoot)
    console.log(`workspace: declarations verified; ${workspaceLinks.length} deterministic links ready`)
  } else if (command === "links-check") {
    await assertWorkspaceLinks(superprojectRoot)
    console.log("workspace: external declarations and linked package identities verified")
  } else if (command === "gitlinks-check") {
    await assertGitlinks(superprojectRoot, {verifyRemote: true})
    await assertWorkspaceLinks(superprojectRoot, {verifyToolRemotes: true})
    console.log("workspace: gitlinks and linked tool revisions verified against remote main")
  } else {
    throw new Error("Usage: bun scripts/workspace.ts bootstrap|links-check|gitlinks-check")
  }
}
