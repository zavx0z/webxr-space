import {describe, test} from "bun:test"
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path"
import {assertRequirement} from "../assert.ts"
import {
  exportDispositions,
  finalPackageDirectories,
  legacyPackageManifestPaths,
} from "./export-dispositions.ts"
import type {
  FinalPackageName,
  LegacyPackageName,
} from "./export-dispositions.ts"
import {readPublicExportSymbols} from "./public-export-symbols.ts"
import {
  publicModuleEntrypoints,
  publicSymbolComparisons,
  publicSymbolDispositions,
  requirementEvidenceFiles,
} from "./source-fidelity.ts"
import type {RequirementId} from "./source-fidelity.ts"

const root = join(import.meta.dir, "../..")

const packageDirectories = Object.freeze(Object.values(finalPackageDirectories))
const packageNames = Object.freeze(Object.keys(finalPackageDirectories) as FinalPackageName[])

const forbiddenPackageNames = Object.freeze([
  "@engine/core",
  "@nodes/core",
  "@nodes/editor",
  "@nodes/layout",
  "@nodes/ui",
  "@nodes/worker",
  "@ui/components",
  "@zavx0z/dom-devtools",
  "@zavx0z/react",
  "@zavx0z/renderer-browser",
  "@zavx0z/renderer-webgpu",
] as const)

const forbiddenRootDirectories = Object.freeze([
  "components",
  "core",
  "devtools",
  "editor",
  "packages",
  "react",
  "renderer-browser",
  "renderer-webgpu",
  "worker",
] as const)

const sourceCheckouts = Object.freeze([
  ["projects/engine", "a3032d960fc592296e8c5d1408a02551635d1fb3"],
  ["projects/node", "6aef6ab1fc038f2fbbf752746d3f328d93ad63e8"],
  ["projects/ui", "90c77080c27d92fea5ee803e8ff1e49d65885ae1"],
  ["../renderer", "e428e64003efdbc3e627d85431532abde0aed350"],
  ["../template", "671d19f652b2899b77bd30e50e9fd254080ef93f"],
] as const)

type PackageManifest = Readonly<{
  exports?: Readonly<Record<string, unknown>>
  name?: string
  workspaces?: readonly string[]
}>

const productionFileGlob = new Bun.Glob("{package.json,**/*.{ts,tsx,js,jsx,mjs,cjs,json,css}}")
const codeFileGlob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mjs,cjs}")
const excludedSegments = new Set(["coverage", "dist", "node_modules"])
const excludedProductionSegments = new Set([
  ".storybook",
  "bench",
  "coverage",
  "dist",
  "node_modules",
  "test",
  "tests",
])

async function runGit(
  requirementCode: string,
  checkout: string,
  ...arguments_: string[]
): Promise<string> {
  const process = Bun.spawn(
    ["git", "-C", checkout, ...arguments_],
    {cwd: root, stdout: "pipe", stderr: "pipe"},
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  assertRequirement(
    exitCode === 0,
    requirementCode,
    `git ${arguments_.join(" ")} завершился с кодом ${exitCode}: ${stderr.trim()}`,
  )
  return stdout.trim()
}

async function readManifest(path: string): Promise<PackageManifest> {
  return Bun.file(path).json()
}

function assertSameStrings(
  actual: readonly string[],
  expected: readonly string[],
  requirementCode: string,
  message: string,
): void {
  const normalizedActual = [...actual].sort()
  const normalizedExpected = [...expected].sort()
  assertRequirement(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected),
    requirementCode,
    `${message}; expected ${normalizedExpected.join(", ")}; actual ${normalizedActual.join(", ")}`,
  )
}

async function executableRequirementFiles(
  requirementIds: readonly string[],
  requirementCode: string,
): Promise<ReadonlySet<string>> {
  const files = new Set<string>()
  for (const requirementId of requirementIds) {
    const file = requirementEvidenceFiles[requirementId as RequirementId]
    assertRequirement(
      file !== undefined,
      requirementCode,
      `${requirementId} не имеет explicit executable evidence file`,
    )
    const source = await Bun.file(join(root, file)).text()
    assertRequirement(
      source.includes(`test("[${requirementId}]`),
      requirementCode,
      `${requirementId} отсутствует в ${file}`,
    )
    assertRequirement(
      !source.includes(`test.todo("[${requirementId}]`),
      requirementCode,
      `${requirementId} в ${file} остаётся todo`,
    )
    files.add(file)
  }
  return files
}

async function runEvidenceTests(files: ReadonlySet<string>): Promise<void> {
  const bunExecutable = process.execPath
  const child = Bun.spawn(
    [bunExecutable, "test", ...[...files].sort()],
    {cwd: root, stdout: "pipe", stderr: "pipe"},
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  assertRequirement(
    exitCode === 0,
    "MIG-003",
    `fidelity requirements failed:\n${stdout}\n${stderr}`,
  )
}

function loaderFor(file: string): "js" | "jsx" | "ts" | "tsx" {
  switch (extname(file)) {
    case ".jsx": return "jsx"
    case ".tsx": return "tsx"
    case ".ts": return "ts"
    default: return "js"
  }
}

function isInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate)
  return pathFromParent === "" || (
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromParent)
  )
}

describe("Граница конечного переноса", () => {
  test("[MIG-001] каждая прежняя публичная возможность имеет нового владельца", async () => {
    const project = await Bun.file(join(root, "PROJECT.md")).text()
    const dispositionKeys = new Set<string>()

    for (const disposition of exportDispositions) {
      const key = `${disposition.sourcePackage}:${disposition.sourceSubpath}`
      assertRequirement(
        !dispositionKeys.has(key),
        "MIG-001",
        `duplicate export disposition ${key}`,
      )
      dispositionKeys.add(key)

      if (disposition.kind === "moved") {
        assertRequirement(
          disposition.targets.length > 0,
          "MIG-001",
          `${key} moved disposition должен иметь final target`,
        )
        for (const target of disposition.targets) {
          const manifest = await readManifest(
            join(root, finalPackageDirectories[target.packageName], "package.json"),
          )
          assertRequirement(
            manifest.name === target.packageName,
            "MIG-001",
            `${key} указывает не на manifest ${target.packageName}`,
          )
          assertRequirement(
            Object.hasOwn(manifest.exports ?? {}, target.subpath),
            "MIG-001",
            `${key} указывает на отсутствующий ${target.packageName}${target.subpath === "." ? "" : target.subpath.slice(1)}`,
          )
        }
        continue
      }

      assertRequirement(
        (disposition.reason?.length ?? 0) > 0 &&
          (disposition.decisionMarker?.length ?? 0) > 0 &&
          project.includes(disposition.decisionMarker!),
        "MIG-001",
        `${key} ${disposition.kind} должен иметь записанное решение в PROJECT.md`,
      )

      if (disposition.kind === "retired") {
        assertRequirement(
          (disposition.ownerPackages?.length ?? 0) > 0 &&
            (disposition.requirementIds?.length ?? 0) > 0,
          "MIG-001",
          `${key} retired должен ссылаться на final owner и executable requirements`,
        )
        await executableRequirementFiles(disposition.requirementIds ?? [], "MIG-001")
      } else {
        assertRequirement(
          disposition.sourcePackage === "@nodes/editor" ||
            disposition.sourcePackage === "@zavx0z/dom-devtools",
          "MIG-001",
          `${key} не является разрешённым deferred исключением`,
        )
      }
    }

    for (const [legacyPackage, manifestPath] of Object.entries(
      legacyPackageManifestPaths,
    ) as Array<[LegacyPackageName, string]>) {
      const manifest = await readManifest(resolve(root, manifestPath))
      assertRequirement(
        manifest.name === legacyPackage,
        "MIG-001",
        `${manifestPath} должен оставаться manifest ${legacyPackage}`,
      )
      const actualSubpaths = Object.keys(manifest.exports ?? {})
      const disposedSubpaths = exportDispositions
        .filter(disposition => disposition.sourcePackage === legacyPackage)
        .map(disposition => disposition.sourceSubpath)
      assertSameStrings(
        disposedSubpaths,
        actualSubpaths,
        "MIG-001",
        `${legacyPackage} export inventory должен иметь disposition без молчаливых пропусков`,
      )
    }
  })

  test("[MIG-002] исходные репозитории не изменяются во время переноса", async () => {
    for (const [relativeCheckout, expectedRevision] of sourceCheckouts) {
      const checkout = resolve(root, relativeCheckout)
      const topLevel = await runGit("MIG-002", checkout, "rev-parse", "--show-toplevel")
      assertRequirement(
        resolve(topLevel) === checkout,
        "MIG-002",
        `${relativeCheckout} должен оставаться самостоятельным исходным checkout`,
      )
      const revision = await runGit("MIG-002", checkout, "rev-parse", "HEAD")
      assertRequirement(
        revision === expectedRevision,
        "MIG-002",
        `${relativeCheckout} изменил исходную ревизию ${expectedRevision} на ${revision}`,
      )
      const status = await runGit(
        "MIG-002",
        checkout,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      )
      assertRequirement(
        status === "",
        "MIG-002",
        `${relativeCheckout} содержит изменения:\n${status}`,
      )
    }
  })

  test("[MIG-003] новая реализация не подменяет прежнее поведение упрощённым", async () => {
    const project = await Bun.file(join(root, "PROJECT.md")).text()
    const symbols = await readPublicExportSymbols(
      Object.entries(publicModuleEntrypoints).map(([id, entrypoint]) => ({
        id,
        entrypoint: resolve(root, entrypoint),
      })),
    )
    const evidenceFiles = new Set<string>()

    for (const comparison of publicSymbolComparisons) {
      const sourceSymbols = symbols.get(comparison.sourceId) ?? []
      assertRequirement(
        sourceSymbols.length === comparison.expectedSourceCount,
        "MIG-003",
        `${comparison.sourceId} expected ${comparison.expectedSourceCount} public symbols, got ${sourceSymbols.length}`,
      )
      const targetSymbols = new Set(
        comparison.targetIds.flatMap(targetId => symbols.get(targetId) ?? []),
      )
      const missing = sourceSymbols.filter(symbol => !targetSymbols.has(symbol))
      const disposed = publicSymbolDispositions
        .filter(disposition => disposition.sourceId === comparison.sourceId)
        .flatMap(disposition => disposition.symbols)
      assertSameStrings(
        missing,
        disposed,
        "MIG-003",
        `${comparison.sourceId} missing public symbols должны иметь explicit disposition`,
      )
    }

    for (const disposition of publicSymbolDispositions) {
      assertRequirement(
        disposition.ownerPackages.length > 0 &&
          disposition.requirementIds.length > 0 &&
          project.includes(disposition.decisionMarker),
        "MIG-003",
        `${disposition.sourceId}:${disposition.symbols.join(",")} не имеет owner/requirements/PROJECT decision`,
      )
      for (const ownerPackage of disposition.ownerPackages) {
        assertRequirement(
          packageNames.includes(ownerPackage as FinalPackageName),
          "MIG-003",
          `${ownerPackage} не является final owner`,
        )
      }
      for (const file of await executableRequirementFiles(
        disposition.requirementIds,
        "MIG-003",
      )) evidenceFiles.add(file)
    }

    const oldObject3D = await Bun.file(
      join(root, "projects/engine/packages/core/src/core/object-3d.ts"),
    ).text()
    const newObject3D = await Bun.file(join(root, "engine/src/core/object-3d.ts")).text()
    assertRequirement(
      /public\s+layout\??:\s*LayoutProps/u.test(oldObject3D) &&
        /public\s+computedLayout\??:\s*ComputedLayout/u.test(oldObject3D) &&
        !/public\s+layout\??:/u.test(newObject3D) &&
        !/public\s+computedLayout\??:/u.test(newObject3D),
      "MIG-003",
      "Object3D.layout/computedLayout retirement должен оставаться explicit",
    )

    const oldViewPoint = await Bun.file(
      join(root, "projects/engine/packages/core/src/core/view-point.ts"),
    ).text()
    const newViewPoint = await Bun.file(join(root, "engine/src/core/view-point.ts")).text()
    assertRequirement(
      oldViewPoint.includes("controls?: ViewPointControls") &&
        oldViewPoint.includes("element?: HTMLElement") &&
        !newViewPoint.includes("controls?: ViewPointControls") &&
        !newViewPoint.includes("element?: HTMLElement"),
      "MIG-003",
      "direct Engine browser controls retirement должен оставаться explicit",
    )

    const oldGlassPanel = await Bun.file(
      join(root, "projects/engine/packages/core/src/ui/glass-panel.ts"),
    ).text()
    const oldEngineIndex = await Bun.file(
      join(root, "projects/engine/packages/core/src/index.ts"),
    ).text()
    assertRequirement(
      oldGlassPanel.includes("export class GlassPanel") &&
        !oldEngineIndex.includes("ui/glass-panel") &&
        !(symbols.get("old-engine") ?? []).includes("GlassPanel") &&
        project.includes("GlassPanel"),
      "MIG-003",
      "GlassPanel должен оставаться явно retired непубличной реализацией",
    )

    await runEvidenceTests(evidenceFiles)
  }, 60_000)

  test("[MIG-004] каждый пакет имеет ровно одного изменяемого владельца", async () => {
    const rootManifest = await readManifest(join(root, "package.json"))
    assertSameStrings(
      rootManifest.workspaces ?? [],
      packageDirectories,
      "MIG-004",
      "root workspaces должны перечислять ровно 12 final owners",
    )

    const seenNames = new Set<string>()
    for (const packageName of packageNames) {
      const packageDirectory = finalPackageDirectories[packageName]
      const packageRoot = join(root, packageDirectory)
      const manifest = await readManifest(join(packageRoot, "package.json"))
      assertRequirement(
        manifest.name === packageName && !seenNames.has(packageName),
        "MIG-004",
        `${packageName} должен иметь ровно один final manifest owner`,
      )
      seenNames.add(packageName)

      const manifests = (await Array.fromAsync(
        new Bun.Glob("**/package.json").scan({cwd: packageRoot, onlyFiles: true}),
      )).filter(path => !path.split("/").some(segment => excludedSegments.has(segment)))
      assertSameStrings(
        manifests,
        ["package.json"],
        "MIG-004",
        `${packageName} не должен содержать вложенный package owner`,
      )
    }

    const sourceRoots = [
      resolve(root, "projects"),
      resolve(root, "../renderer"),
      resolve(root, "../template"),
    ]
    for (const packageName of packageNames) {
      const packageRoot = join(root, finalPackageDirectories[packageName])
      for await (const file of codeFileGlob.scan({cwd: packageRoot, onlyFiles: true})) {
        if (file.split("/").some(segment => excludedProductionSegments.has(segment))) continue
        const source = await Bun.file(join(packageRoot, file)).text()
        const transpiler = new Bun.Transpiler({loader: loaderFor(file)})
        for (const sourceImport of transpiler.scanImports(source)) {
          if (!sourceImport.path.startsWith(".") && !isAbsolute(sourceImport.path)) continue
          const importedPath = resolve(packageRoot, dirname(file), sourceImport.path)
          assertRequirement(
            !sourceRoots.some(sourceRoot => isInside(sourceRoot, importedPath)),
            "MIG-004",
            `${packageName}/${file} импортирует исходный checkout ${sourceImport.path}`,
          )
        }
      }
    }

    const ignoredProjects = await runGit(
      "MIG-004",
      root,
      "check-ignore",
      "projects/engine",
      "projects/node",
      "projects/ui",
    )
    assertSameStrings(
      ignoredProjects.split("\n").filter(Boolean),
      ["projects/engine", "projects/node", "projects/ui"],
      "MIG-004",
      "projects должны оставаться ignored source checkouts",
    )
    const trackedProjects = await runGit("MIG-004", root, "ls-files", "projects")
    assertRequirement(
      trackedProjects === "",
      "MIG-004",
      `root не должен владеть файлами source projects:\n${trackedProjects}`,
    )
    for (const [relativeCheckout] of sourceCheckouts) {
      const status = await runGit(
        "MIG-004",
        resolve(root, relativeCheckout),
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      )
      assertRequirement(
        status === "",
        "MIG-004",
        `${relativeCheckout} не read-only во время migration:\n${status}`,
      )
    }
  })

  test("[MIG-005] конечные пакеты не содержат прежних package names и корневых каталогов", async () => {
    const rootDirectoryGlob = new Bun.Glob(`{${forbiddenRootDirectories.join(",")}}`)
    const oldDirectories = await Array.fromAsync(
      rootDirectoryGlob.scan({cwd: root, onlyFiles: false}),
    )
    assertRequirement(
      oldDirectories.length === 0,
      "MIG-005",
      `в корне остались прежние package-каталоги: ${oldDirectories.join(", ")}`,
    )

    for (const packageDirectory of packageDirectories) {
      const packageRoot = join(root, packageDirectory)
      const oldPackageCatalogs = await Array.fromAsync(
        new Bun.Glob("**/packages").scan({cwd: packageRoot, onlyFiles: false}),
      )
      assertRequirement(
        oldPackageCatalogs.length === 0,
        "MIG-005",
        `${packageDirectory} содержит прежние package-каталоги: ${oldPackageCatalogs.join(", ")}`,
      )
      for await (const file of productionFileGlob.scan({cwd: packageRoot, onlyFiles: true})) {
        if (file.split("/").some(segment => excludedSegments.has(segment))) continue
        const source = await Bun.file(join(packageRoot, file)).text()
        for (const forbiddenName of forbiddenPackageNames) {
          assertRequirement(
            !source.includes(forbiddenName),
            "MIG-005",
            `${packageDirectory}/${file} содержит прежнее имя ${forbiddenName}`,
          )
        }
      }
    }
  })
})
