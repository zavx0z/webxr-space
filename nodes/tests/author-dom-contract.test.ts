import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {API} from "typescript/unstable/async"
import {isImportDeclaration, isNamedImports, isNamespaceImport, isStringLiteral} from "typescript/unstable/ast/is"

/** Проверяем авторские точки входа, а не реализацию платформы и её тестовые стенды. */
test("[NODES-AUTHOR-DOM] авторские компоненты не импортируют реализацию стандартных DOM типов", async () => {
  const root = resolve(import.meta.dir, "../..")
  const manifest = await Bun.file(resolve(root, "nodes/package.json")).json()
  const files = [
    ...Object.values(manifest.exports).filter((entry): entry is string => typeof entry === "string" && entry.endsWith(".tsx")).map(entry => resolve(root, "nodes", entry)),
    resolve(root, "nodes/node/diagram/index.tsx"),
    resolve(root, "markdown/mermaid/index.tsx"),
    resolve(root, "markdown/mermaid/node/index.tsx"),
  ]
  const standard = new Set(["Node", "Element", "HTMLElement", "Document", "Event", "MouseEvent", "PointerEvent", "KeyboardEvent", "InputEvent", "WheelEvent", "DOMRect", "DOMRectReadOnly"])
  const api = new API({cwd: root})
  const snapshot = await api.updateSnapshot({openFiles: files})
  const violations: string[] = []
  try {
    for (const file of files) {
      const project = await snapshot.getDefaultProjectForFile(file)
      const source = await project?.program.getSourceFile(file)
      if (source === undefined) throw new Error(`Нет AST авторского компонента ${file}`)
      for (const statement of source.statements) {
        if (!isImportDeclaration(statement) || !isStringLiteral(statement.moduleSpecifier)) continue
        const owner = statement.moduleSpecifier.text
        if (owner !== "@zavx0z/dom" && !owner.startsWith("@zavx0z/dom/")) continue
        const bindings = statement.importClause?.namedBindings
        if (bindings !== undefined && isNamespaceImport(bindings)) violations.push(`${file}: namespace ${owner}`)
        if (bindings === undefined || !isNamedImports(bindings)) continue
        for (const entry of bindings.elements) {
          const name = (entry.propertyName ?? entry.name).text
          if (standard.has(name)) violations.push(`${file}: ${name} из ${owner}`)
        }
      }
    }
    expect(violations).toEqual([])
  } finally {
    await snapshot.dispose()
    await api.close()
  }
}, 30_000)
