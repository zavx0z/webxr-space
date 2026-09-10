import {SymbolFlags, type Diagnostic, type Project, type Symbol} from "typescript/unstable/async"
import {SyntaxKind, isInterfaceDeclaration, isTypeAliasDeclaration, isExpressionWithTypeArguments, isImportTypeNode, isTypeQueryNode, isTypeReferenceNode, type Node, type SourceFile} from "typescript/unstable/ast"
import {createHash} from "node:crypto"

/** Следует только ссылкам из читаемых деклараций; тела модулей не исполняет. */
export function sourceTracker(project: Project) {
  const sources = new Map<string, string>()
  const diagnostics = new Map<string, readonly Diagnostic[]>()
  const visited = new Set<Node>()
  const symbols = new Set<number>()
  const remember = async (file: SourceFile) => {
    if (sources.has(file.fileName)) return
    if ((await project.program.getSyntacticDiagnostics(file.fileName)).length) {
      throw new Error(`TypeDoc: неверный TypeScript: ${file.fileName}`)
    }
    sources.set(file.fileName, createHash("sha256").update(file.text).digest("hex"))
  }
  const follow = async (symbol: Symbol): Promise<void> => {
    if (symbols.has(symbol.id)) return
    symbols.add(symbol.id)
    for (const handle of symbol.declarations) {
      const declaration = await handle.resolve()
      if (declaration) await visit(declaration)
    }
    if (symbol.flags & SymbolFlags.Alias) {
      const target = await project.checker.getImmediateAliasedSymbol(symbol)
      if (target) await follow(target)
    }
  }
  const visit = async (node: Node): Promise<void> => {
    if (visited.has(node)) return
    visited.add(node)
    const file = node.getSourceFile()
    await remember(file)
    // Стандартную библиотеку учитываем как источник, но не раскрываем всё DOM-дерево.
    if (await project.program.isSourceFileDefaultLibrary(file)) return
    if (isTypeAliasDeclaration(node) || isInterfaceDeclaration(node)) {
      let errors = diagnostics.get(file.fileName)
      if (!errors) {
        errors = await project.program.getSemanticDiagnostics(file.fileName)
        diagnostics.set(file.fileName, errors)
      }
      const error = errors.find(error => error.pos >= node.pos && error.pos < node.end)
      if (error) throw new Error(`TypeDoc: ошибки типов: ${file.fileName}: TS${error.code}: ${error.text}`)
    }
    const references: Node[] = []
    const walk = (child: Node) => {
      if (child.kind === SyntaxKind.SourceFile || child.kind === SyntaxKind.Block) return
      if (isTypeReferenceNode(child)) references.push(child.typeName)
      else if (isExpressionWithTypeArguments(child)) references.push(child.expression)
      else if (isTypeQueryNode(child)) references.push(child.exprName)
      else if (isImportTypeNode(child)) references.push(child.qualifier ?? child)
      child.forEachChild(walk)
    }
    walk(node)
    const resolved = await project.checker.getSymbolAtLocation(references)
    for (const reference of resolved) if (reference) await follow(reference)
  }
  return {
    remember,
    visit,
    follow,
    result: () => [...sources].sort(([a], [b]) => a.localeCompare(b)).map(([path, digest]) => ({path, digest})),
  }
}
