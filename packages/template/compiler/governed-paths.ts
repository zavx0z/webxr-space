import {
  lstatSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs"
import {basename, dirname, relative, resolve, sep} from "node:path"

export type GovernedFileMatch = Readonly<{
  kind: "hardlink" | "lexical"
  ownerPath: string
  relativePath: string
  root: string
  rootIndex: number
  sourcePath: string
}>

type InspectedFile = Readonly<{
  canonicalPath: string
  identity: string
  sourcePath: string
}>

type GovernedRoot = Readonly<{
  canonicalPath: string
  configuredPath: string
  index: number
  kind: "directory" | "file"
  lexicalIdentity: string
}>

type IndexedOwner = Readonly<{
  ownerPath: string
  publicTail: string
  relativePath: string
  root: GovernedRoot
}>

/**
 * Resolves compiler ownership without asking the OS for a physical path for the
 * final regular file. APFS may report another hard-link spelling for that file,
 * while the canonical parent directory still preserves the explicit owner.
 */
export class GovernedFiles {
  readonly roots: readonly string[]
  private descriptors: readonly GovernedRoot[]
  private readonly indexedOwners = new Map<string, IndexedOwner[]>()
  private indexed = false

  constructor(sourceRoots: readonly string[]) {
    this.roots = Object.freeze(sourceRoots.map(path => resolve(path)))
    this.descriptors = this.readDescriptors()
  }

  matchFile(sourcePath: string): GovernedFileMatch | null {
    const file = inspectRegularFile(sourcePath)
    if (file === null) return null
    const direct = this.directMatches(file)
    if (direct.length > 0) {
      const owner = selectMostSpecificOwner(direct)
      if (owner === null) return null
      this.indexOwner(file.identity, owner)
      return matchFromOwner(file, owner, "lexical")
    }
    if (this.descriptors.some(root => lexicallyWithinRoot(root, file.sourcePath))) return null

    this.indexRoots()
    const cached = this.indexedOwners.get(file.identity) ?? []
    const liveOwners = cached.filter(owner => ownerStillOwnsIdentity(owner, file.identity))
    if (liveOwners.length !== cached.length) this.indexedOwners.set(file.identity, liveOwners)
    const owners = liveOwners.filter(owner => hasExactPublicTail(file.sourcePath, owner.publicTail))
    const owner = selectMostSpecificOwner(owners)
    if (owner === null) return null
    return matchFromOwner(file, owner, "hardlink")
  }

  refresh(): void {
    this.descriptors = this.readDescriptors()
    this.indexed = false
    this.indexedOwners.clear()
  }

  authorizationKey(sourcePath: string): string | null {
    const match = this.matchFile(sourcePath)
    const file = inspectRegularFile(sourcePath)
    const root = match === null
      ? undefined
      : this.descriptors.find(candidate => candidate.index === match.rootIndex)
    if (match === null || file === null || root === undefined) return null
    return JSON.stringify([
      file.identity,
      root.index,
      root.kind,
      root.canonicalPath,
      root.lexicalIdentity,
      match.relativePath,
    ])
  }

  private readDescriptors(): readonly GovernedRoot[] {
    return Object.freeze(this.roots.flatMap((path, index) => {
      const root = inspectRoot(path, index)
      return root === null ? [] : [root]
    }))
  }

  private directMatches(file: InspectedFile): readonly IndexedOwner[] {
    return this.descriptors.flatMap(root => {
      const relativePath = root.kind === "file"
        ? normalizedPath(root.canonicalPath) === normalizedPath(file.canonicalPath) ? "" : null
        : containedRelative(root.canonicalPath, file.canonicalPath)
      if (relativePath === null) return []
      return [{
        ownerPath: file.sourcePath,
        publicTail: relativePath === "" ? basename(root.configuredPath) : relativePath,
        relativePath,
        root,
      }]
    })
  }

  private indexRoots(): void {
    if (this.indexed) return
    this.indexed = true
    for (const root of this.descriptors) {
      if (root.kind === "file") {
        const file = inspectRegularFile(root.configuredPath)
        if (file !== null) {
          this.indexOwner(file.identity, {
            ownerPath: file.sourcePath,
            publicTail: basename(root.configuredPath),
            relativePath: "",
            root,
          })
        }
        continue
      }
      this.indexDirectory(root)
    }
  }

  private indexDirectory(root: GovernedRoot): void {
    const pending = [root.canonicalPath]
    while (pending.length > 0) {
      const directory = pending.pop()!
      let entries
      try {
        entries = readdirSync(directory, {withFileTypes: true})
      } catch {
        continue
      }
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue
        const path = resolve(directory, entry.name)
        const relativePath = relative(root.canonicalPath, path)
        if (relativePath.split(sep).includes("node_modules")) continue
        if (entry.isDirectory()) {
          pending.push(path)
          continue
        }
        if (!entry.isFile() || !isCompilerSource(path)) continue
        const file = inspectRegularFile(path)
        if (file === null) continue
        this.indexOwner(file.identity, {
          ownerPath: resolve(root.configuredPath, relativePath),
          publicTail: relativePath,
          relativePath,
          root,
        })
      }
    }
  }

  private indexOwner(identity: string, owner: IndexedOwner): void {
    const owners = this.indexedOwners.get(identity)
    if (owners === undefined) {
      this.indexedOwners.set(identity, [owner])
      return
    }
    if (owners.some(candidate => candidate.root.index === owner.root.index &&
      candidate.relativePath === owner.relativePath)) return
    owners.push(owner)
  }
}

export function selectGovernedCompilerSource(
  files: GovernedFiles,
  sourcePath: string,
): GovernedFileMatch | null {
  const match = files.matchFile(sourcePath)
  if (match === null || match.relativePath.split(sep).includes("node_modules")) return null
  return match
}

export function sameRegularFile(left: string, right: string): boolean {
  const leftFile = inspectRegularFile(left)
  const rightFile = inspectRegularFile(right)
  return leftFile !== null && rightFile !== null && leftFile.identity === rightFile.identity
}

export function lexicallyInside(root: string, path: string): boolean {
  return containedRelative(resolve(root), resolve(path)) !== null
}

function inspectRoot(path: string, index: number): GovernedRoot | null {
  const configuredPath = resolve(path)
  try {
    const lexical = lstatSync(configuredPath, {bigint: true})
    if (lexical.isSymbolicLink()) {
      const canonicalPath = realpathSync.native(configuredPath)
      const target = statSync(canonicalPath, {bigint: true})
      if (!target.isDirectory()) return null
      return {
        canonicalPath,
        configuredPath,
        index,
        kind: "directory",
        lexicalIdentity: fileIdentity(lexical),
      }
    }
    if (lexical.isDirectory()) {
      return {
        canonicalPath: realpathSync.native(configuredPath),
        configuredPath,
        index,
        kind: "directory",
        lexicalIdentity: fileIdentity(lexical),
      }
    }
    if (!lexical.isFile()) return null
    const file = inspectRegularFile(configuredPath)
    return file === null
      ? null
      : {
        canonicalPath: file.canonicalPath,
        configuredPath,
        index,
        kind: "file",
        lexicalIdentity: fileIdentity(lexical),
      }
  } catch {
    return null
  }
}

function inspectRegularFile(path: string): InspectedFile | null {
  const sourcePath = resolve(path)
  try {
    const metadata = lstatSync(sourcePath, {bigint: true})
    if (metadata.isSymbolicLink() || !metadata.isFile()) return null
    const parent = realpathSync.native(dirname(sourcePath))
    return {
      canonicalPath: resolve(parent, basename(sourcePath)),
      identity: `${metadata.dev}:${metadata.ino}`,
      sourcePath,
    }
  } catch {
    return null
  }
}

function matchFromOwner(
  file: InspectedFile,
  owner: IndexedOwner,
  kind: GovernedFileMatch["kind"],
): GovernedFileMatch {
  return Object.freeze({
    kind,
    ownerPath: owner.ownerPath,
    relativePath: owner.relativePath,
    root: owner.root.configuredPath,
    rootIndex: owner.root.index,
    sourcePath: file.sourcePath,
  })
}

function containedRelative(root: string, path: string): string | null {
  const child = relative(root, path)
  return child === "" || (child !== ".." && !child.startsWith(`..${sep}`) &&
    !child.startsWith(sep)) ? child : null
}

function normalizedPath(path: string): string {
  return path
}

function selectMostSpecificOwner(owners: readonly IndexedOwner[]): IndexedOwner | null {
  const winners = owners.filter(owner => !owners.some(candidate =>
    candidate !== owner && rootIsStrictlyMoreSpecific(candidate.root, owner.root)))
  return winners.length === 1 ? winners[0]! : null
}

function rootIsStrictlyMoreSpecific(candidate: GovernedRoot, base: GovernedRoot): boolean {
  const samePath = normalizedPath(candidate.canonicalPath) === normalizedPath(base.canonicalPath)
  if (samePath) return candidate.kind === "file" && base.kind === "directory"
  return base.kind === "directory" &&
    containedRelative(base.canonicalPath, candidate.canonicalPath) !== null
}

function lexicallyWithinRoot(root: GovernedRoot, path: string): boolean {
  if (root.kind === "file") {
    return normalizedPath(root.configuredPath) === normalizedPath(resolve(path))
  }
  if (containedRelative(root.configuredPath, resolve(path)) !== null) return true
  let ancestor = dirname(resolve(path))
  while (true) {
    try {
      const metadata = lstatSync(ancestor, {bigint: true})
      if (fileIdentity(metadata) === root.lexicalIdentity) return true
    } catch {
      return true
    }
    const parent = dirname(ancestor)
    if (parent === ancestor) return false
    ancestor = parent
  }
}

function ownerStillOwnsIdentity(owner: IndexedOwner, identity: string): boolean {
  const file = inspectRegularFile(owner.ownerPath)
  if (file === null || file.identity !== identity) return false
  const relativePath = owner.root.kind === "file"
    ? normalizedPath(owner.root.canonicalPath) === normalizedPath(file.canonicalPath) ? "" : null
    : containedRelative(owner.root.canonicalPath, file.canonicalPath)
  return relativePath === owner.relativePath
}

function hasExactPublicTail(path: string, publicTail: string): boolean {
  const normalized = normalizedPath(path).replaceAll("\\", "/")
  const tail = normalizedPath(publicTail).replaceAll("\\", "/")
  return normalized === tail || normalized.endsWith(`/${tail}`)
}

function isCompilerSource(path: string): boolean {
  return /\.(?:[cm]?[jt]sx?)$/i.test(path)
}

function fileIdentity(metadata: Readonly<{dev: bigint; ino: bigint}>): string {
  return `${metadata.dev}:${metadata.ino}`
}
