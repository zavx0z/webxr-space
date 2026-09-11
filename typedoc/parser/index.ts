/**
Создаёт структурированную документацию экспортируемых type/interface через API TypeScript 7.
Импорты разрешает компилятор; исходные модули не исполняются.

@packageDocumentation
*/
import {API, SymbolFlags} from "typescript/unstable/async"
import {isTypeAliasDeclaration, isInterfaceDeclaration} from "typescript/unstable/ast"
import {basename, resolve} from "node:path"
import {stat} from "node:fs/promises"
import {documentation, enclosingProperty} from "./src/documentation.ts"
import {hasObjectFields} from "./src/object-fields.ts"
import {tupleMembers} from "./src/tuple-members.ts"
import {isPromiseType} from "./src/promise-type.ts"
import type {AnalyzeTypeDocInput} from "./contract/input.ts"
import type {AnalyzeTypeDocOutput} from "./contract/output.ts"
import type {TypeDocDeclaration, TypeDocMember} from "../shared/types/model.ts"
import {sourceTracker} from "./src/sources.ts"

export type {AnalyzeTypeDocInput} from "./contract/input.ts"
export type {AnalyzeTypeDocOutput} from "./contract/output.ts"

/**
Извлекает документацию экспортируемых type/interface через отдельную сессию TypeScript.
Разрешает поля {@link Readonly}, {@link Partial}, наследование и tuple; исходные модули не исполняет.
Сессия закрывается перед завершением Promise, в том числе при ошибке.

@param input - {@link AnalyzeTypeDocInput}: рабочий root и путь к документируемому файлу.

@returns {@link AnalyzeTypeDocOutput} с моделью справочника и digest посещённых источников.

@throws Promise отклоняется при отсутствии файла или экспортируемых type/interface,
ошибках TypeScript в анализируемом источнике и посещённых объявлениях.

@example
```ts
const result = await analyzeTypeDoc({root: projectRoot, path: "contract/input.ts"})
```
*/
export async function analyzeTypeDoc(input: AnalyzeTypeDocInput): Promise<AnalyzeTypeDocOutput> {
  const {root, path} = input
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
      const tuple = type ? await tupleMembers(project, type, declaration, docs) : undefined
      const members: TypeDocMember[] = tuple ?? []
      if (type && !tuple && !await isPromiseType(project, type) && await hasObjectFields(type)) for (const member of await project.checker.getPropertiesOfType(type)) {
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
