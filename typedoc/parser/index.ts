/**
Создаёт структурированную документацию экспортируемых type/interface через API TypeScript 7.
Импорты разрешает компилятор; исходные модули не исполняются.

@packageDocumentation
*/
import {API, SymbolFlags, TypeFlags, type Type} from "typescript/unstable/async"
import {isTypeAliasDeclaration, isInterfaceDeclaration, type Node} from "typescript/unstable/ast"
import {basename, resolve} from "node:path"
import {stat} from "node:fs/promises"
import {documentation} from "./src/documentation.ts"
import {sourceTracker} from "./src/sources.ts"
import type {TypeDocAnalysis, TypeDocDeclaration, TypeDocMember} from "../shared/model.ts"

/** Разрешает эффективные поля, включая Readonly, Partial и наследование интерфейсов. */
export async function analyzeTypeDoc(root: string, path: string): Promise<TypeDocAnalysis> {
  const absolutePath = resolve(root, path)
  if (!(await stat(absolutePath).catch(() => undefined))?.isFile()) throw new Error(`TypeDoc: исходник не найден: ${absolutePath}`)
  const api = new API({cwd: resolve(root)})
  try {
    const snapshot = await api.updateSnapshot({openFiles: [absolutePath]})
    const project = await snapshot.getDefaultProjectForFile(absolutePath)
    const file = await project?.program.getSourceFile(absolutePath)
    if (!project || !file) throw new Error(`TypeDoc: исходник не найден: ${absolutePath}`)
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
      const members: TypeDocMember[] = []
      if (type && await hasObjectFields(type)) for (const member of await project.checker.getPropertiesOfType(type)) {
        const origin = await member.declarations[0]?.resolve()
        if (origin) await sources.visit(origin)
        const own = origin ? documentation(origin).comment.summary : ""
        const inherited = origin ? enclosingProperty(origin, member.name) : undefined
        const property = docs.properties.get(member.name)
        const propertyType = await project.checker.getTypeOfSymbolAtLocation(member, declaration)
        const defaultValue = property?.defaultValue ?? inherited?.defaultValue
        members.push({
          name: member.name,
          type: await project.checker.typeToString(propertyType, declaration),
          optional: (member.flags & SymbolFlags.Optional) !== 0,
          description: property?.description || own || inherited?.description || "",
          ...(defaultValue === undefined ? {} : {defaultValue}),
        })
      }
      declarations.push({
        name: exported.name,
        kind: isInterfaceDeclaration(declaration) ? "interface" : "type",
        signature: declaration.getText(declaration.getSourceFile()),
        comment: docs.comment,
        members,
      })
    }
    if (!declarations.length) throw new Error(`TypeDoc: нет экспортируемого type/interface: ${absolutePath}`)
    return {document: {name: basename(absolutePath), declarations}, sources: sources.result()}
  } finally {
    await api.close()
  }
}

/** Скалярные alias не получают методы boxed string/number из стандартной библиотеки. */
async function hasObjectFields(type: Type): Promise<boolean> {
  if (type.isObjectType()) return true
  if (!type.isUnionType() && !type.isIntersectionType()) return false
  const parts = await type.getTypes() ?? []
  if (type.isIntersectionType() && parts.some(part => (part.flags & TypeFlags.Primitive) !== 0)) return false
  const objects = await Promise.all(parts.map(hasObjectFields))
  return type.isIntersectionType() ? objects.some(Boolean) : objects.length > 0 && objects.every(Boolean)
}

function enclosingProperty(node: Node, name: string) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isTypeAliasDeclaration(parent) || isInterfaceDeclaration(parent)) return documentation(parent).properties.get(name)
  }
  return undefined
}
