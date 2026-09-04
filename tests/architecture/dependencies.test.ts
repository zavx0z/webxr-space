import {describe, test} from "bun:test"
import {dirname, extname, isAbsolute, join, relative, resolve, sep} from "node:path"
import {assertRequirement} from "../assert.ts"

const root = join(import.meta.dir, "../..")

const packageDirectories = Object.freeze({
  "@zavx0z/engine": "engine",
  "@zavx0z/dom": "dom",
  "@zavx0z/template": "template",
  "@zavx0z/component": "component",
  "@zavx0z/renderer": "renderer",
  "@zavx0z/webgpu": "webgpu",
  "@zavx0z/browser": "browser",
  "@zavx0z/space": "space",
  "@zavx0z/ui": "ui",
  "@zavx0z/nodetree": "nodetree",
  "@zavx0z/layout": "layout",
  "@zavx0z/nodes": "nodes",
  "@zavx0z/devtools": "devtools",
} as const)

type PackageName = keyof typeof packageDirectories

const packageNames = Object.freeze(Object.keys(packageDirectories) as PackageName[])

const allowedInternalDependencies: Readonly<Record<PackageName, readonly PackageName[]>> =
  Object.freeze({
    "@zavx0z/engine": [],
    "@zavx0z/dom": [],
    "@zavx0z/template": ["@zavx0z/dom"],
    "@zavx0z/component": ["@zavx0z/dom", "@zavx0z/template"],
    "@zavx0z/renderer": ["@zavx0z/dom"],
    "@zavx0z/devtools": ["@zavx0z/dom", "@zavx0z/renderer"],
    "@zavx0z/webgpu": ["@zavx0z/engine", "@zavx0z/renderer"],
    "@zavx0z/browser": [
      "@zavx0z/dom",
      "@zavx0z/engine",
      "@zavx0z/renderer",
      "@zavx0z/space",
      "@zavx0z/webgpu",
    ],
    "@zavx0z/space": [
      "@zavx0z/component",
      "@zavx0z/dom",
      "@zavx0z/engine",
      "@zavx0z/template",
    ],
    "@zavx0z/ui": ["@zavx0z/component", "@zavx0z/dom", "@zavx0z/template"],
    "@zavx0z/nodetree": [],
    "@zavx0z/layout": [],
    "@zavx0z/nodes": [
      "@zavx0z/component",
      "@zavx0z/dom",
      "@zavx0z/layout",
      "@zavx0z/nodetree",
      "@zavx0z/template",
      "@zavx0z/ui",
    ],
  })

type PackageManifest = Readonly<{
  dependencies?: Readonly<Record<string, string>>
  optionalDependencies?: Readonly<Record<string, string>>
  peerDependencies?: Readonly<Record<string, string>>
}>

type SourceImport = Readonly<{
  file: string
  packageName: PackageName
  specifier: string
}>

const sourceGlob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mjs,cjs}")
const excludedSourceSegments = new Set([
  ".storybook",
  "bench",
  "coverage",
  "dist",
  "node_modules",
  "test",
  "tests",
])
const sourceImportCache = new Map<PackageName, Promise<readonly SourceImport[]>>()

async function readManifest(packageName: PackageName): Promise<PackageManifest> {
  return Bun.file(join(root, packageDirectories[packageName], "package.json")).json()
}

function declaredDependencies(manifest: PackageManifest): ReadonlySet<string> {
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ])
}

function internalPackageName(specifier: string): PackageName | null {
  for (const packageName of packageNames) {
    if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
      return packageName
    }
  }
  return null
}

function isProductionSource(file: string): boolean {
  return !file.split("/").some(segment => excludedSourceSegments.has(segment))
}

function loaderFor(file: string): "js" | "jsx" | "ts" | "tsx" {
  switch (extname(file)) {
    case ".jsx": return "jsx"
    case ".tsx": return "tsx"
    case ".ts": return "ts"
    default: return "js"
  }
}

function scanPackageImports(packageName: PackageName): Promise<readonly SourceImport[]> {
  const cached = sourceImportCache.get(packageName)
  if (cached) return cached
  const scanning = scanPackageImportsUncached(packageName)
  sourceImportCache.set(packageName, scanning)
  return scanning
}

async function scanPackageImportsUncached(
  packageName: PackageName,
): Promise<readonly SourceImport[]> {
  const packageRoot = join(root, packageDirectories[packageName])
  const imports: SourceImport[] = []
  for await (const file of sourceGlob.scan({cwd: packageRoot, onlyFiles: true})) {
    if (!isProductionSource(file)) continue
    const source = await Bun.file(join(packageRoot, file)).text()
    const transpiler = new Bun.Transpiler({loader: loaderFor(file)})
    for (const sourceImport of transpiler.scanImports(source)) {
      imports.push(Object.freeze({
        file,
        packageName,
        specifier: sourceImport.path,
      }))
    }
  }
  return Object.freeze(imports)
}

async function internalDependencyGraph(): Promise<ReadonlyMap<PackageName, readonly PackageName[]>> {
  const graph = new Map<PackageName, readonly PackageName[]>()
  for (const packageName of packageNames) {
    const dependencies = declaredDependencies(await readManifest(packageName))
    graph.set(
      packageName,
      Object.freeze([...dependencies]
        .map(internalPackageName)
        .filter((dependency): dependency is PackageName => dependency !== null)),
    )
  }
  return graph
}

describe("Направление производственных зависимостей", () => {
  test("[PKG-003] производственные зависимости пакетов не образуют циклов", async () => {
    const graph = await internalDependencyGraph()
    const visiting = new Set<PackageName>()
    const visited = new Set<PackageName>()

    const visit = (packageName: PackageName, path: readonly PackageName[]): void => {
      if (visited.has(packageName)) return
      assertRequirement(
        !visiting.has(packageName),
        "PKG-003",
        `обнаружен цикл: ${[...path, packageName].join(" -> ")}`,
      )
      visiting.add(packageName)
      for (const dependency of graph.get(packageName) ?? []) {
        visit(dependency, [...path, packageName])
      }
      visiting.delete(packageName)
      visited.add(packageName)
    }

    for (const packageName of packageNames) visit(packageName, [])
  })

  test("[PKG-004] пакет не импортирует внутренний src другого пакета", async () => {
    for (const packageName of packageNames) {
      const packageRoot = join(root, packageDirectories[packageName])
      for (const sourceImport of await scanPackageImports(packageName)) {
        const importedPackage = internalPackageName(sourceImport.specifier)
        if (importedPackage && importedPackage !== packageName) {
          const subpath = sourceImport.specifier.slice(importedPackage.length)
          assertRequirement(
            !/^\/src(?:\/|$)/u.test(subpath),
            "PKG-004",
            `${packageName}/${sourceImport.file} импортирует внутренний ${sourceImport.specifier}`,
          )
        }

        if (!sourceImport.specifier.startsWith(".")) continue
        const resolvedImport = resolve(packageRoot, dirname(sourceImport.file), sourceImport.specifier)
        for (const otherPackage of packageNames) {
          if (otherPackage === packageName) continue
          const otherSourceRoot = join(root, packageDirectories[otherPackage], "src")
          const pathFromOtherSource = relative(otherSourceRoot, resolvedImport)
          const pointsInsideOtherSource = pathFromOtherSource === "" || (
            pathFromOtherSource !== ".." &&
            !pathFromOtherSource.startsWith(`..${sep}`) &&
            !isAbsolute(pathFromOtherSource)
          )
          assertRequirement(
            !pointsInsideOtherSource,
            "PKG-004",
            `${packageName}/${sourceImport.file} обходит public export ${otherPackage}`,
          )
        }
      }
    }
  })

  test("[PKG-005] Engine не зависит от DOM, UI, Node и WebGPU", async () => {
    const dependencies = declaredDependencies(await readManifest("@zavx0z/engine"))
    for (const forbidden of [
      "@zavx0z/dom",
      "@zavx0z/ui",
      "@zavx0z/nodetree",
      "@zavx0z/nodes",
      "@zavx0z/webgpu",
    ]) {
      assertRequirement(
        !dependencies.has(forbidden),
        "PKG-005",
        `@zavx0z/engine не должен зависеть от ${forbidden}`,
      )
    }
  })

  test("[PKG-006] UI не зависит от Engine, Renderer, WebGPU и Nodes", async () => {
    const dependencies = declaredDependencies(await readManifest("@zavx0z/ui"))
    for (const forbidden of [
      "@zavx0z/engine",
      "@zavx0z/renderer",
      "@zavx0z/webgpu",
      "@zavx0z/nodes",
    ]) {
      assertRequirement(
        !dependencies.has(forbidden),
        "PKG-006",
        `@zavx0z/ui не должен зависеть от ${forbidden}`,
      )
    }
  })

  test("[PKG-007] Nodes не создаёт Document, Canvas, Renderer и Space", async () => {
    const nodesRoot = join(root, packageDirectories["@zavx0z/nodes"])
    const forbiddenConstructions = [
      ["Document", /\b(?:createDocument|new\s+Document)\s*\(/u],
      ["Canvas", /(?:<canvas(?:\s|>)|\bnew\s+(?:Offscreen)?Canvas\s*\(|\.createElement\s*\(\s*["'`]canvas["'`])/u],
      ["Renderer", /\b(?:createDocumentRenderer|createRenderer|new\s+[A-Za-z]*Renderer)\s*\(/u],
      ["Space", /(?:<xr-space(?:\s|>)|\b(?:createSpace|new\s+Space)\s*\()/u],
    ] as const

    for await (const file of sourceGlob.scan({cwd: nodesRoot, onlyFiles: true})) {
      if (!isProductionSource(file)) continue
      const source = await Bun.file(join(nodesRoot, file)).text()
      for (const [owner, pattern] of forbiddenConstructions) {
        assertRequirement(
          !pattern.test(source),
          "PKG-007",
          `@zavx0z/nodes/${file} содержит создание владельца ${owner}`,
        )
      }
    }
  })

  test("[PKG-008] сборка, тесты, файлы и процессы используют нативный Bun API там, где он применим", async () => {
    const manifests = [
      ["root", await Bun.file(join(root, "package.json")).json()],
      ...await Promise.all(packageNames.map(async packageName => [
        packageName,
        await Bun.file(join(root, packageDirectories[packageName], "package.json")).json(),
      ] as const)),
    ] as const

    for (const [owner, manifest] of manifests) {
      const scripts = (manifest as {scripts?: Readonly<Record<string, string>>}).scripts ?? {}
      for (const [name, command] of Object.entries(scripts)) {
        if (/^(?:build|check|test)(?::|$)/u.test(name)) {
          assertRequirement(
            command.startsWith("bun "),
            "PKG-008",
            `${owner} script ${name} должен запускаться через Bun: ${command}`,
          )
        }
        assertRequirement(
          !/(?:^|\s)(?:deno|node|npm|npx|pnpm|yarn|cp|find|grep|mv|rm)(?:\s|$)/u.test(command),
          "PKG-008",
          `${owner} script ${name} обходит Bun внешней командой: ${command}`,
        )
      }
    }

    const rootScripts = (manifests[0][1] as {
      scripts: Readonly<Record<string, string>>
    }).scripts
    assertRequirement(
      rootScripts.typecheck?.includes("bun run --parallel") === true &&
      rootScripts.test?.includes("bun run --parallel") === true &&
      rootScripts["test:packages"]?.includes("bun run --workspaces --parallel"),
      "PKG-008",
      "корневые проверки типов и тесты должны использовать параллельный запуск Bun",
    )

    for (const packageName of packageNames) {
      const manifest = await Bun.file(
        join(root, packageDirectories[packageName], "package.json"),
      ).json() as {scripts: Readonly<Record<string, string>>}
      assertRequirement(
        manifest.scripts.test === "bun test --parallel tests",
        "PKG-008",
        `${packageName} должен запускать package tests нативным параллельным Bun test`,
      )
      assertRequirement(
        manifest.scripts.check === "bun run --parallel typecheck test",
        "PKG-008",
        `${packageName} должен параллельно запускать typecheck и test через Bun`,
      )
    }

    const packagesTest = await Bun.file(join(root, "tests/architecture/packages.test.ts")).text()
    const migrationTest = await Bun.file(join(root, "tests/migration/contract.test.ts")).text()
    assertRequirement(
      packagesTest.includes("Bun.Glob") && packagesTest.includes("Bun.file") &&
      !packagesTest.includes('node:fs'),
      "PKG-008",
      "проверка файловой структуры должна использовать Bun.Glob и Bun.file",
    )
    assertRequirement(
      migrationTest.includes("Bun.spawn") && !migrationTest.includes("node:child_process"),
      "PKG-008",
      "проверка процессов должна использовать Bun.spawn",
    )
  })

  test("[PKG-009] внутренние зависимости и импорты следуют принятому направлению графа", async () => {
    for (const packageName of packageNames) {
      const manifest = await readManifest(packageName)
      const declared = declaredDependencies(manifest)
      const allowed = new Set(allowedInternalDependencies[packageName])

      for (const dependency of declared) {
        const internalDependency = internalPackageName(dependency)
        if (!internalDependency || internalDependency === packageName) continue
        assertRequirement(
          allowed.has(internalDependency),
          "PKG-009",
          `${packageName} объявляет запрещённое направление к ${internalDependency}`,
        )
      }

      for (const sourceImport of await scanPackageImports(packageName)) {
        const importedPackage = internalPackageName(sourceImport.specifier)
        if (!importedPackage || importedPackage === packageName) continue
        assertRequirement(
          allowed.has(importedPackage),
          "PKG-009",
          `${packageName}/${sourceImport.file} импортирует запрещённый ${importedPackage}`,
        )
        assertRequirement(
          declared.has(importedPackage),
          "PKG-009",
          `${packageName}/${sourceImport.file} импортирует не объявленный ${importedPackage}`,
        )
      }
    }
  })
})
