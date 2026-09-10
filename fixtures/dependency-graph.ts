import {dirname, relative} from "node:path"
import {API} from "typescript/unstable/async"
import {type Node, SyntaxKind} from "typescript/unstable/ast"
import {
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isNamedImports,
  isStringLiteral,
} from "typescript/unstable/ast/is"

/**
Адрес объявления компонента в исходном TSX.

@property file - Абсолютный путь к файлу с объявлением функции компонента.

@property name - Имя функции в исходном файле, а не локальный псевдоним импорта.
*/
export type ComponentReference = Readonly<{file: string, name: string}>

/**
Граф использования компонентов в JSX с ключами `путь относительно root#имя функции`.

Каждая запись содержит уникальные отсортированные списки: `uses` — ключи
непосредственно используемых компонентов, `elements` — имена нативных JSX-тегов.
Повторные использования объединяются; порядок и вложенность элементов не сохраняются.

@example
```ts
// Результат построения графа для DiagramNode.
const graph: ComponentDependencyGraph = {
  // До # — путь от корня проекта, после # — имя функции компонента.
  "nodes/node/diagram/index.tsx#DiagramNode": {
    // DiagramNode использует в своём JSX два компонента: Pane и Typography.
    uses: ["ui/surfaces/pane.tsx#Pane", "ui/typography.tsx#Typography"],
    // Сам DiagramNode создаёт нативный элемент <article>.
    elements: ["article"],
  },
  "ui/surfaces/pane.tsx#Pane": {
    // В собственном JSX Pane нет других компонентов.
    // Переданный снаружи Typography остаётся зависимостью DiagramNode.
    uses: [],
    elements: ["section"],
  },
  "ui/typography.tsx#Typography": {
    // Typography создаёт только нативный <span>.
    uses: [],
    elements: ["span"],
  },
}
```
*/
export type ComponentDependencyGraph = Record<string, {uses: string[], elements: string[]}>

/**
Рекурсивно строит граф компонентов по JSX исходных функций, не исполняя их.

Связь означает использование тега в собственном JSX функции. Компонент,
переданный через `children`, относится к автору этого JSX, а не к получателю.
Обход учитывает все ветви исходника независимо от значений props.

Поддерживаются объявления функций в том же файле и именованные импорты,
включая псевдонимы. Реэкспорты, default-импорты, составные JSX-имена и компоненты,
объявленные через переменные, не разрешаются. Импорты типов пропускаются.
Повторно достигнутые компоненты не обходятся, поэтому циклы не зацикливают поиск.

Функция создаёт собственную сессию TypeScript API и закрывает её в `finally`,
включая выход с ошибкой. Исходные файлы не изменяются.

@param root - Абсолютный корень проекта: рабочий каталог TypeScript API и база ключей графа.

@param entry - Файл и исходное имя функции, с которой начинается обход.

@returns Граф всех достигнутых компонентов, включая листья без компонентных зависимостей.

@throws Если исходник или объявление не найдены, JSX-ссылка не поддерживается
либо зависимость не разрешается. Ошибки TypeScript API и разрешения модулей передаются вызывающему коду.

@example
```ts
const graph = await buildComponentDependencyGraph(root, {
  file: resolve(root, "nodes/node/diagram/index.tsx"),
  name: "DiagramNode",
})
```
*/
export async function buildComponentDependencyGraph(root: string, entry: ComponentReference): Promise<ComponentDependencyGraph> {
  const api = new API({cwd: root})
  const graph: ComponentDependencyGraph = {}
  const pending = [entry]
  const identity = (file: string, name: string) => `${relative(root, file)}#${name}`

  try {
    while (pending.length > 0) {
      const {file, name} = pending.pop()!
      const id = identity(file, name)
      if (Object.hasOwn(graph, id)) continue

      const snapshot = await api.updateSnapshot({openFiles: [file]})
      const project = await snapshot.getDefaultProjectForFile(file)
      const source = await project?.program.getSourceFile(file)
      if (source === undefined) throw new Error(`Не найден исходный файл компонента: ${id}`)
      const declaration = source.statements.find(statement => isFunctionDeclaration(statement) && statement.name?.text === name)
      if (declaration === undefined) throw new Error(`Не найдено объявление компонента: ${id}`)

      const imports = new Map<string, ComponentReference>()
      for (const statement of source.statements) {
        if (!isImportDeclaration(statement) || !isStringLiteral(statement.moduleSpecifier)) continue
        const clause = statement.importClause
        if (clause === undefined || clause.phaseModifier === SyntaxKind.TypeKeyword) continue
        const bindings = clause.namedBindings
        if (bindings === undefined || !isNamedImports(bindings)) continue
        for (const binding of bindings.elements) {
          if (binding.isTypeOnly) continue
          imports.set(binding.name.text, {
            file: Bun.resolveSync(statement.moduleSpecifier.text, dirname(file)),
            name: binding.propertyName?.text ?? binding.name.text,
          })
        }
      }

      const uses = new Set<string>()
      const elements = new Set<string>()
      const visit = (node: Node) => {
        if (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) {
          if (!isIdentifier(node.tagName)) throw new Error(`Неподдерживаемая форма ссылки на JSX-компонент в ${id}`)
          const tag = node.tagName.text
          if (/^[a-z]/.test(tag)) {
            elements.add(tag)
          } else {
            const local = source.statements.some(statement => isFunctionDeclaration(statement) && statement.name?.text === tag)
            const dependency = imports.get(tag) ?? (local ? {file, name: tag} : undefined)
            if (dependency === undefined) throw new Error(`Не удалось разрешить JSX-компонент ${tag} в ${id}`)
            uses.add(identity(dependency.file, dependency.name))
            pending.push(dependency)
          }
        }
        node.forEachChild(visit)
      }
      visit(declaration)
      graph[id] = {uses: [...uses].sort(), elements: [...elements].sort()}
    }

    return graph
  } finally {
    await api.close()
  }
}
