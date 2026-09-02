import {expect, test} from "bun:test"
import {link, mkdir, mkdtemp, rename, rm, symlink, unlink, writeFile} from "node:fs/promises"
import {statSync} from "node:fs"
import {tmpdir} from "node:os"
import {resolve} from "node:path"
import {
  GovernedFiles,
  lexicallyInside,
  selectGovernedCompilerSource,
} from "./governed-paths.ts"

test("does not case-fold path containment on case-sensitive filesystems", () => {
  expect(lexicallyInside("/virtual/Owner", "/virtual/owner/evil.ts")).toBe(false)
})

test("keeps lexical ownership for a regular hardlink and admits only its exact physical identity", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-hardlink-"))
  const canonicalRoot = resolve(temporaryRoot, "canonical")
  const physicalRoot = resolve(temporaryRoot, "physical/node_modules/@fixture/package")
  const physical = resolve(physicalRoot, "compiler/owner.tsx")
  const canonical = resolve(canonicalRoot, "compiler/owner.tsx")
  const renamed = resolve(physicalRoot, "compiler/renamed.tsx")
  const copied = resolve(physicalRoot, "compiler/copied.tsx")
  await Promise.all([
    mkdir(resolve(canonicalRoot, "compiler"), {recursive: true}),
    mkdir(resolve(physicalRoot, "compiler"), {recursive: true}),
  ])
  await writeFile(physical, "export function Owner() { return <div /> }\n")
  await Promise.all([
    link(physical, canonical),
    link(physical, renamed),
    writeFile(copied, "export function Owner() { return <div /> }\n"),
  ])

  try {
    const files = new GovernedFiles([canonicalRoot])
    const canonicalMatch = files.matchFile(canonical)
    expect(canonicalMatch).toMatchObject({
      kind: "lexical",
      relativePath: "compiler/owner.tsx",
      rootIndex: 0,
      sourcePath: canonical,
    })

    const canonicalMetadata = statSync(canonical, {bigint: true})
    const physicalMetadata = statSync(physical, {bigint: true})
    expect([canonicalMetadata.dev, canonicalMetadata.ino])
      .toEqual([physicalMetadata.dev, physicalMetadata.ino])
    expect(files.matchFile(physical)).toMatchObject({
      kind: "hardlink",
      ownerPath: canonical,
      relativePath: "compiler/owner.tsx",
      rootIndex: 0,
      sourcePath: physical,
    })
    expect(files.matchFile(renamed)).toBeNull()
    expect(files.matchFile(copied)).toBeNull()
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})

test("resolves parent directories but rejects final and parent symlink escapes", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-symlink-"))
  const governedRoot = resolve(temporaryRoot, "governed")
  const outsideRoot = resolve(temporaryRoot, "outside")
  const canonical = resolve(governedRoot, "canonical.ts")
  const outside = resolve(outsideRoot, "outside.ts")
  const governedOwner = resolve(governedRoot, "compiler/owner.ts")
  const outsideOwner = resolve(outsideRoot, "compiler/owner.ts")
  await Promise.all([
    mkdir(resolve(governedRoot, "compiler"), {recursive: true}),
    mkdir(resolve(outsideRoot, "compiler"), {recursive: true}),
  ])
  await Promise.all([
    writeFile(canonical, "export const canonical = true\n"),
    writeFile(outside, "export const outside = true\n"),
    writeFile(governedOwner, "export const owner = true\n"),
  ])
  await link(governedOwner, outsideOwner)
  await Promise.all([
    symlink(outside, resolve(governedRoot, "final-link.ts")),
    symlink(outsideRoot, resolve(governedRoot, "parent-link")),
  ])

  try {
    const files = new GovernedFiles([governedRoot])
    expect(files.matchFile(canonical)?.kind).toBe("lexical")
    expect(files.matchFile(resolve(governedRoot, "final-link.ts"))).toBeNull()
    expect(files.matchFile(resolve(governedRoot, "parent-link/outside.ts"))).toBeNull()
    expect(files.matchFile(resolve(governedRoot, "parent-link/compiler/owner.ts"))).toBeNull()
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})

test("revalidates cached owners and refreshes additions for a persistent session", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-refresh-"))
  const governedRoot = resolve(temporaryRoot, "governed")
  const physicalRoot = resolve(temporaryRoot, "physical")
  const owner = resolve(governedRoot, "compiler/owner.ts")
  const physical = resolve(physicalRoot, "compiler/owner.ts")
  await Promise.all([
    mkdir(resolve(governedRoot, "compiler"), {recursive: true}),
    mkdir(resolve(physicalRoot, "compiler"), {recursive: true}),
  ])
  await writeFile(physical, "export const owner = 1\n")
  await link(physical, owner)

  try {
    const files = new GovernedFiles([governedRoot])
    expect(files.matchFile(physical)?.kind).toBe("hardlink")

    const replacement = resolve(governedRoot, "compiler/replacement.ts")
    await writeFile(replacement, "export const owner = 2\n")
    await rename(replacement, owner)
    expect(files.matchFile(physical)).toBeNull()

    const addedOwner = resolve(governedRoot, "compiler/added.ts")
    const addedPhysical = resolve(physicalRoot, "compiler/added.ts")
    await writeFile(addedPhysical, "export const added = true\n")
    expect(files.matchFile(addedPhysical)).toBeNull()
    await link(addedPhysical, addedOwner)
    files.refresh()
    expect(files.matchFile(addedPhysical)).toMatchObject({
      kind: "hardlink",
      ownerPath: addedOwner,
      relativePath: "compiler/added.ts",
    })
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})

test("fails ambiguous hardlink owners and equivalent root aliases closed", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-ambiguous-"))
  const firstRoot = resolve(temporaryRoot, "a")
  const secondRoot = resolve(temporaryRoot, "a-much-longer-unrelated-owner")
  const physicalRoot = resolve(temporaryRoot, "physical")
  const physical = resolve(physicalRoot, "src/owner.ts")
  const firstOwner = resolve(firstRoot, "src/owner.ts")
  const secondOwner = resolve(secondRoot, "src/owner.ts")
  const firstAlias = resolve(temporaryRoot, "alias-a")
  const secondAlias = resolve(temporaryRoot, "alias-with-a-longer-name")
  await Promise.all([
    mkdir(resolve(firstRoot, "src"), {recursive: true}),
    mkdir(resolve(secondRoot, "src"), {recursive: true}),
    mkdir(resolve(physicalRoot, "src"), {recursive: true}),
  ])
  await writeFile(physical, "export const owner = true\n")
  await Promise.all([
    link(physical, firstOwner),
    link(physical, secondOwner),
    symlink(firstRoot, firstAlias),
    symlink(firstRoot, secondAlias),
  ])

  try {
    expect(new GovernedFiles([firstRoot, secondRoot]).matchFile(physical)).toBeNull()
    expect(new GovernedFiles([firstAlias, secondAlias]).matchFile(firstOwner)).toBeNull()
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})

test("keeps independent public tails for one inode across sequential mirror lookups", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-tails-"))
  const governedRoot = resolve(temporaryRoot, "governed")
  const physicalRoot = resolve(temporaryRoot, "physical")
  const firstOwner = resolve(governedRoot, "a.ts")
  const secondOwner = resolve(governedRoot, "b.ts")
  const firstPhysical = resolve(physicalRoot, "a.ts")
  const secondPhysical = resolve(physicalRoot, "b.ts")
  await Promise.all([
    mkdir(governedRoot, {recursive: true}),
    mkdir(physicalRoot, {recursive: true}),
  ])
  await writeFile(firstOwner, "export const shared = true\n")
  await Promise.all([
    link(firstOwner, secondOwner),
    link(firstOwner, firstPhysical),
    link(firstOwner, secondPhysical),
  ])

  try {
    const files = new GovernedFiles([governedRoot])
    expect(files.matchFile(firstPhysical)).toMatchObject({relativePath: "a.ts"})
    expect(files.matchFile(secondPhysical)).toMatchObject({relativePath: "b.ts"})
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})

test("rebuilds an explicitly configured symlink root after retargeting", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-root-link-"))
  const firstRoot = resolve(temporaryRoot, "first")
  const secondRoot = resolve(temporaryRoot, "second")
  const rootLink = resolve(temporaryRoot, "owner-link")
  const firstOwner = resolve(firstRoot, "owner.ts")
  const secondOwner = resolve(secondRoot, "owner.ts")
  await Promise.all([
    mkdir(firstRoot, {recursive: true}),
    mkdir(secondRoot, {recursive: true}),
  ])
  await Promise.all([
    writeFile(firstOwner, "export const owner = 1\n"),
    writeFile(secondOwner, "export const owner = 2\n"),
  ])
  await symlink(firstRoot, rootLink)

  try {
    const files = new GovernedFiles([rootLink])
    expect(files.matchFile(firstOwner)?.kind).toBe("lexical")
    await unlink(rootLink)
    await symlink(secondRoot, rootLink)
    files.refresh()
    expect(files.matchFile(firstOwner)).toBeNull()
    expect(files.matchFile(secondOwner)?.kind).toBe("lexical")
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})

test("excludes nested node_modules from a broad root but honors an exact physical source root", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-governed-node-modules-"))
  const broadRoot = resolve(temporaryRoot, "project")
  const physicalRoot = resolve(broadRoot, "node_modules/d3-array")
  const dependency = resolve(physicalRoot, "src/index.js")
  await mkdir(resolve(physicalRoot, "src"), {recursive: true})
  await writeFile(dependency, "export const max = values => values[0]\n")

  try {
    expect(selectGovernedCompilerSource(new GovernedFiles([broadRoot]), dependency)).toBeNull()
    expect(selectGovernedCompilerSource(
      new GovernedFiles([broadRoot, physicalRoot]),
      dependency,
    )).toMatchObject({
      kind: "lexical",
      relativePath: "src/index.js",
      root: physicalRoot,
      rootIndex: 1,
    })
  } finally {
    await rm(temporaryRoot, {force: true, recursive: true})
  }
})
