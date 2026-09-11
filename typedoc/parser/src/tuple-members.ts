import {NodeBuilderFlags, type Project, type Type} from "typescript/unstable/async"
import {isNamedTupleMember, isOptionalTypeNode, isTupleTypeNode, isTypeOperatorNode, type Node} from "typescript/unstable/ast"
import type {TypeDocMember} from "../../shared/types/model.ts"
import type {documentation} from "./documentation.ts"

/**
Проецирует элементы tuple в {@link TypeDocMember}, сохраняя метки, optional и тип элемента.
Отдельного rest-флага в модели нет: rest-элемент получает свой тип, например `boolean[]`,
а синтаксис `...` остаётся в исходной сигнатуре декларации.
Методы массива и его `length` не становятся строками справочника.

@param project - Проект с checker и emitter той же сессии, что породила type и declaration.

@param type - Эффективный тип декларации; проверяется reference-target tuple.

@param declaration - Исходный AST-узел для контекста разрешения типов и диагностики.

@param docs - Результат {@link documentation} для этой декларации.
Имена `@property` сопоставляются меткам tuple либо строковым индексам с нуля.

@returns Массив элементов в исходном порядке, включая пустой массив для `[]`;
`undefined`, когда type не является tuple reference.

@throws Error, если checker распознал tuple, но emitter не вернул tuple-узел.

@example
При `project`, `type` и `declaration`, полученных из одной сессии TypeScript:
```ts
const members = await tupleMembers(project, type, declaration, docs)
// readonly [first: string, second?: number] даёт строки first и second.
```
*/
export async function tupleMembers(project: Project, type: Type, declaration: Node, docs: ReturnType<typeof documentation>): Promise<TypeDocMember[] | undefined> {
  if (!type.isTypeReference() || !(await type.getTarget()).isTupleType()) return undefined
  const emitted = await project.checker.typeToTypeNode(type, declaration, NodeBuilderFlags.InTypeAlias | NodeBuilderFlags.NoTruncation | NodeBuilderFlags.AllowEmptyTuple)
  const tuple = emitted && isTypeOperatorNode(emitted) ? emitted.type : emitted
  if (!tuple || !isTupleTypeNode(tuple)) throw new Error(`TypeDoc: не удалось прочитать элементы tuple: ${declaration.getSourceFile().fileName}`)
  return Promise.all(tuple.elements.map(async (element, index) => {
    const named = isNamedTupleMember(element)
    const name = named ? element.name.text : String(index)
    const property = docs.properties.get(name)
    return {
      name,
      type: await project.emitter.printNode(named || isOptionalTypeNode(element) ? element.type : element),
      optional: named ? !!element.questionToken : isOptionalTypeNode(element),
      description: property?.description ?? "",
      ...(property?.defaultValue === undefined ? {} : {defaultValue: property.defaultValue}),
    }
  }))
}
