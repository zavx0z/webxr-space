import {mkdtemp, rm} from "node:fs/promises"
import {join} from "node:path"
import {API} from "typescript/unstable/async"
import {isImportDeclaration, isNamespaceImport} from "typescript/unstable/ast/is"

export type PublicModuleEntry = Readonly<{
  id: string
  entrypoint: string
}>

export async function readPublicExportSymbols(
  entries: readonly PublicModuleEntry[],
): Promise<ReadonlyMap<string, readonly string[]>> {
  const temporaryRoot = await mkdtemp(join(import.meta.dir, ".public-symbols-"))
  const sourcePath = join(temporaryRoot, "inventory.ts")
  const paths: Record<string, readonly string[]> = {}
  const identifiers = new Map<string, string>()
  const imports: string[] = []

  for (const [index, entry] of entries.entries()) {
    const moduleName = `migration-public-module-${index}`
    const identifier = `publicModule${index}`
    paths[moduleName] = [entry.entrypoint]
    identifiers.set(identifier, entry.id)
    imports.push(`import * as ${identifier} from ${JSON.stringify(moduleName)}`)
  }

  await Bun.write(sourcePath, `${imports.join("\n")}\n`)
  await Bun.write(join(temporaryRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      allowImportingTsExtensions: true,
      jsx: "preserve",
      jsxImportSource: "@zavx0z/template",
      lib: ["ESNext", "DOM"],
      module: "Preserve",
      moduleDetection: "force",
      moduleResolution: "bundler",
      noEmit: true,
      paths,
      skipLibCheck: true,
      strict: true,
      target: "ESNext",
      types: ["bun", "@webgpu/types"],
    },
    files: ["inventory.ts"],
  }))

  const api = new API({cwd: temporaryRoot})
  let snapshot: Awaited<ReturnType<API["updateSnapshot"]>> | null = null
  try {
    snapshot = await api.updateSnapshot({openFiles: [sourcePath]})
    const project = await snapshot.getDefaultProjectForFile(sourcePath)
    if (!project) throw new Error("MIG-003: TypeScript found no public-symbol project")
    const sourceFile = await project.program.getSourceFile(sourcePath)
    if (!sourceFile) throw new Error("MIG-003: TypeScript returned no inventory source")

    const result = new Map<string, readonly string[]>()
    for (const statement of sourceFile.statements) {
      if (!isImportDeclaration(statement)) continue
      const namedBindings = statement.importClause?.namedBindings
      if (!namedBindings || !isNamespaceImport(namedBindings)) continue
      const id = identifiers.get(namedBindings.name.text)
      if (!id) continue
      const alias = await project.checker.getSymbolAtLocation(namedBindings.name)
      if (!alias) throw new Error(`MIG-003: cannot resolve inventory alias ${id}`)
      const moduleSymbol = await project.checker.getAliasedSymbol(alias)
      if (await project.checker.isUnknownSymbol(moduleSymbol)) {
        throw new Error(`MIG-003: cannot resolve public module ${id}`)
      }
      const exports = await project.checker.getExportsOfModule(moduleSymbol)
      result.set(
        id,
        Object.freeze(exports.map(symbol => symbol.name).sort()),
      )
    }

    for (const entry of entries) {
      if (!result.has(entry.id)) throw new Error(`MIG-003: no public symbols read for ${entry.id}`)
    }
    return result
  } finally {
    await snapshot?.dispose()
    await api.close()
    await rm(temporaryRoot, {force: true, recursive: true})
  }
}
