import {isTypeAliasDeclaration, isInterfaceDeclaration, type Node} from "typescript/unstable/ast"
import {getLeadingCommentRanges} from "typescript/unstable/ast/scanner"
import {readComment} from "./comments.ts"

/**
Извлекает авторское описание узла AST через {@link readComment}.
Читает ведущие комментарии из текста SourceFile узла {@link Node}; оставляет
только doc-блоки и исключает блоки с тегом `packageDocumentation`.
Комментарии дочерних узлов не становятся описанием родителя.

@param node - Узел существующего AST с доступным SourceFile и исходными позициями.
Обычно это type/interface или его поле, полученное через API TypeScript;
синтетический узел без исходного файла не является входом этого помощника.

@returns Результат {@link readComment}: Markdown-описание и примеры в `comment`,
а также карта `properties` с описаниями и текстовыми defaults из `@property`.
При отсутствии подходящих блоков строки и коллекции результата пусты.

@example
```ts
import {API} from "typescript/unstable/async"
import {isInterfaceDeclaration} from "typescript/unstable/ast"

const api = new API({cwd: projectRoot})
try {
  const snapshot = await api.updateSnapshot({openFiles: [sourcePath]})
  const project = await snapshot.getDefaultProjectForFile(sourcePath)
  const file = await project?.program.getSourceFile(sourcePath)
  const declaration = file?.statements.find(isInterfaceDeclaration)
  if (declaration) {
    const {comment, properties} = documentation(declaration)
  }
} finally {
  await api.close()
}
```
*/
export function documentation(node: Node) {
  const file = node.getSourceFile()
  const comments = (getLeadingCommentRanges(file.text, node.getFullStart()) ?? [])
    .map(range => file.text.slice(range.pos, range.end))
    .filter(value => value.startsWith("/**") && !/@packageDocumentation\b/u.test(value))
  return readComment(comments)
}

/**
Читает `@property` у ближайшего содержащего type/interface через {@link documentation}.
Обход начинается с `node.parent` и прекращается на первом таком предке,
даже если нужного имени у него нет. Это поиск документации содержащей формы,
а не рекурсивное разрешение наследования интерфейсов.

@param node - Узел существующего AST с цепочкой родителей, обычно объявление поля.
Для самого type/interface проверяется его внешний предок, а не собственный doc-блок.

@param name - Точное имя в карте `@property`, с учётом регистра, без скобок optional
и без суффикса `=default`; например, `source` для `@property [source=""]`.

@returns Запись с Markdown-описанием и необязательным текстовым default
либо `undefined`, если нет содержащей формы или у ближайшей формы нет такого имени.

@example
После получения интерфейса `declaration` как в примере {@link documentation}:
```ts
const member = declaration.members.find(member => member.name?.getText() === "source")
const property = member ? enclosingProperty(member, "source") : undefined
const description = property?.description
```
*/
export function enclosingProperty(node: Node, name: string) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isTypeAliasDeclaration(parent) || isInterfaceDeclaration(parent)) return documentation(parent).properties.get(name)
  }
  return undefined
}
