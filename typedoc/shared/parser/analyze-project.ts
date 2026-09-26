import {SymbolFlags, type Project} from "typescript/unstable/async"
import {isTypeAliasDeclaration, isInterfaceDeclaration} from "typescript/unstable/ast"
import {createHash} from "node:crypto"
import {basename, join} from "node:path"
import {readFile, stat} from "node:fs/promises"
import {documentation} from "./documentation.ts"
import {typeMembers} from "./type-members.ts"
import {typeSchema} from "./schema.ts"
import {sourceTracker} from "./sources.ts"
import type {AnalyzeTypeDocOutput} from "../../parser/contract/output.ts"
import type {TypeDocDeclaration, TypeDocSource} from "../types/model.ts"

/**
Извлекает один документ из уже открытого проекта TypeScript.

Функция заимствует lifecycle проекта и не закрывает его. Помимо посещённых
TypeScript-деклараций результат учитывает активный `tsconfig` и ближайшие
`package.json`, влияющие на разбор и разрешение модулей.

@param project - Проект действующего snapshot TypeScript API.

@param absolutePath - Абсолютный путь файла внутри этого проекта.

@returns Сериализуемая модель и побайтовые снимки её входов.

@throws При отсутствии экспортируемого `type`/`interface` или диагностике TypeScript.
*/
export async function analyzeTypeDocProject(
  project: Project,
  absolutePath: string,
  configurationSources: readonly TypeDocSource[] = [],
): Promise<AnalyzeTypeDocOutput> {
  const file = await project.program.getSourceFile(absolutePath)
  if (!file) throw new Error(`TypeDoc: исходник не найден: ${absolutePath}`)
  const sources = sourceTracker(project)
  await sources.remember(file)
  if ((await project.program.getSemanticDiagnostics(absolutePath)).length) throw new Error(`TypeDoc: ошибки типов: ${absolutePath}`)
  const module = await project.checker.getSymbolAtLocation(file)
  const declarations: TypeDocDeclaration[] = []
  for (const exported of module ? await project.checker.getExportsOfModule(module) : []) {
    const symbol = exported.flags & SymbolFlags.Alias ? await project.checker.getAliasedSymbol(exported) : exported
    const nodes = await Promise.all(symbol.declarations.map(handle => handle.resolve()))
    const declaration = nodes.find(node => node && (isTypeAliasDeclaration(node) || isInterfaceDeclaration(node)))
    if (!declaration || !(isTypeAliasDeclaration(declaration) || isInterfaceDeclaration(declaration))) continue
    await sources.follow(exported)
    const docs = documentation(declaration)
    const type = await project.checker.getTypeAtLocation(declaration)
    const members = type ? await typeMembers(project, type, declaration, docs, node => sources.visit(node)) : []
    declarations.push({
      name: exported.name,
      kind: isInterfaceDeclaration(declaration) ? "interface" : "type",
      signature: declaration.getText(declaration.getSourceFile()),
      comment: docs.comment,
      members,
      ...(type ? {schema: await typeSchema(project, type, declaration, node => sources.visit(node))} : {}),
    })
  }
  if (!declarations.length) throw new Error(`TypeDoc: нет экспортируемого type/interface: ${absolutePath}`)
  const tracked = sources.result()
  const configuration = await analysisConfigurationSources(project, tracked)
  return {
    document: {name: basename(absolutePath), declarations},
    sources: mergeSources(tracked, [...configuration, ...configurationSources]),
  }
}

async function analysisConfigurationSources(
  project: Project,
  sources: readonly TypeDocSource[],
): Promise<readonly TypeDocSource[]> {
  const paths = new Set<string>()
  if ((await stat(project.configFileName).catch(() => undefined))?.isFile()) paths.add(project.configFileName)
  for (const source of sources) {
    const metadata = await project.program.getSourceFileMetadata(source.path)
    if (metadata?.packageJsonDirectory) paths.add(join(metadata.packageJsonDirectory, "package.json"))
  }
  const snapshots: TypeDocSource[] = []
  for (const path of paths) {
    const bytes = await readFile(path).catch(() => null)
    if (bytes !== null) snapshots.push({path, digest: createHash("sha256").update(bytes).digest("hex")})
  }
  return snapshots
}

function mergeSources(
  left: readonly TypeDocSource[],
  right: readonly TypeDocSource[],
): readonly TypeDocSource[] {
  const byPath = new Map(left.map(source => [source.path, source]))
  for (const source of right) byPath.set(source.path, source)
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))
}
