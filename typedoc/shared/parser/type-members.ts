import {ElementFlags, SignatureKind, SymbolFlags, type Project, type Type} from "typescript/unstable/async"
import type {Node} from "typescript/unstable/ast"
import type {TypeDocMember} from "../types/model.ts"
import type {TypeTraversal, VisitTypeMember} from "../types/type-members.ts"
import {documentation, enclosingProperty} from "./documentation.ts"
import {hasObjectFields} from "./object-fields.ts"
import {isPromiseType} from "./promise-type.ts"
import {tupleMembers} from "./tuple-members.ts"

const maximumDepth = 12
const maximumMembers = 256

/**
Удаляет nullable-части union через checker перед решением о структуре вложенного дерева.
Полный текст строки по-прежнему печатается из исходного типа, поэтому optional
`T | undefined` не теряет наблюдаемую сигнатуру.

@param project - Проект с checker, создавшим исходный тип.

@param type - Тип поля из checker текущей сессии.

@returns Non-nullable effective type либо `undefined`, если checker не вернул результат.
*/
async function structuralType(project: Project, type: Type): Promise<Type | undefined> {
  return project.checker.getNonNullableType(type)
}

/**
Строит строки effective-типа через checker без разбора напечатанного TypeScript.
Object раскрывается в реальные properties, array — в единственный элемент `[]`,
tuple сохраняет авторские метки. Рекурсия по текущему пути, глубина и общий бюджет
останавливают только дальнейшие `children`, оставляя исходный `type` у строки.

@param project - Проект TypeScript 7 с checker той же сессии.

@param type - Эффективный тип контейнера.

@param declaration - AST-контекст для разрешения и печати типов полей.

@param docs - Документация декларации верхнего уровня; во вложенных объектах
описания берутся из собственных doc-блоков полей и содержащих их типов.

@param visit - Callback учёта посещённых объявлений в dependency snapshot parser.

@param traversal - Путь, глубина и оставшийся бюджет текущей ветви; parser
создаёт начальное состояние автоматически.

@returns Строки контейнера; пустой массив для скаляра, callback, стандартного
`Promise`, цикла и исчерпанного лимита.
*/
export async function typeMembers(
  project: Project,
  type: Type,
  declaration: Node,
  docs: ReturnType<typeof documentation> | undefined,
  visit: VisitTypeMember,
  traversal: TypeTraversal = {path: new Set(), depth: 0, remaining: {value: maximumMembers}},
): Promise<TypeDocMember[]> {
  const structural = await structuralType(project, type)
  if (!structural || traversal.depth >= maximumDepth || traversal.remaining.value <= 0 || traversal.path.has(structural.id)) return []
  const path = new Set(traversal.path)
  path.add(structural.id)
  const nested = (child: Type) => typeMembers(project, child, declaration, undefined, visit, {
    path,
    depth: traversal.depth + 1,
    remaining: traversal.remaining,
  })
  const tuple = await tupleMembers(project, structural, declaration, docs)
  if (tuple) {
    const rows = takeBudget(tuple, traversal)
    if (!structural.isTypeReference()) return rows
    const elementTypes = await project.checker.getTypeArguments(structural)
    const target = await structural.getTarget()
    const elementFlags = target.isTupleType() ? target.elementFlags : []
    const result: TypeDocMember[] = []
    for (let index = 0; index < rows.length; index += 1) {
      const member = rows[index]!
      const element = elementTypes[index]
      const isRest = !!(elementFlags[index] && elementFlags[index]! & (ElementFlags.Rest | ElementFlags.Variadic))
      let children: TypeDocMember[] = []
      if (element && isRest && !await project.checker.isArrayType(element)) {
        const collectionTraversal: TypeTraversal = {
          path,
          depth: traversal.depth + 1,
          remaining: traversal.remaining,
        }
        if (takeOne(collectionTraversal)) {
          const itemChildren = await typeMembers(project, element, declaration, undefined, visit, {
            path,
            depth: traversal.depth + 2,
            remaining: traversal.remaining,
          })
          children = [{
            name: "[]",
            type: await project.checker.typeToString(element, declaration),
            optional: false,
            description: "",
            ...(itemChildren.length ? {children: itemChildren} : {}),
          }]
        }
      } else if (element) children = await nested(element)
      result.push({...member, ...(children.length ? {children} : {})})
    }
    return result
  }
  if (await project.checker.isArrayType(structural)) {
    if (!structural.isTypeReference()) return []
    const [element] = await project.checker.getTypeArguments(structural)
    if (!element || !takeOne(traversal)) return []
    const children = await nested(element)
    return [{
      name: "[]",
      type: await project.checker.typeToString(element, declaration),
      optional: false,
      description: "",
      ...(children.length ? {children} : {}),
    }]
  }
  if (await isPromiseType(project, structural) ||
    (await project.checker.getSignaturesOfType(structural, SignatureKind.Call)).length ||
    !await hasObjectFields(structural)) return []
  const result: TypeDocMember[] = []
  for (const member of await project.checker.getPropertiesOfType(structural)) {
    if (!takeOne(traversal)) break
    const origin = await member.declarations[0]?.resolve()
    if (origin) await visit(origin)
    const own = origin ? documentation(origin).comment.summary : ""
    const inherited = origin ? enclosingProperty(origin, member.name) : undefined
    const property = docs?.properties.get(member.name)
    const propertyType = await project.checker.getTypeOfSymbolAtLocation(member, declaration)
    const defaultValue = property?.defaultValue ?? inherited?.defaultValue
    const children = await nested(propertyType)
    result.push({
      name: member.name,
      type: await project.checker.typeToString(propertyType, declaration),
      optional: (member.flags & SymbolFlags.Optional) !== 0,
      description: property?.description || own || inherited?.description || "",
      ...(defaultValue === undefined ? {} : {defaultValue}),
      ...(children.length ? {children} : {}),
    })
  }
  return result
}

/**
Резервирует строки tuple в общем бюджете до раскрытия их дочерних типов.
Корневой tuple сохраняет все строки прежней плоской модели.

@param members - Элементы tuple до рекурсивного построения.

@param traversal - Состояние дерева с общей изменяемой квотой.

@returns Начало tuple, помещающееся в оставшийся бюджет.
*/
function takeBudget(members: TypeDocMember[], traversal: TypeTraversal): TypeDocMember[] {
  if (traversal.depth === 0) return members
  const count = Math.min(members.length, traversal.remaining.value)
  traversal.remaining.value -= count
  return members.slice(0, count)
}

/**
Резервирует строку до рекурсивного построения её дочерних строк.
Корневые строки существующей модели не расходуют новый бюджет вложенности.

@param traversal - Состояние дерева с общей изменяемой квотой.

@returns `true`, когда строка может быть добавлена.
*/
function takeOne(traversal: TypeTraversal): boolean {
  if (traversal.depth === 0) return true
  if (traversal.remaining.value <= 0) return false
  traversal.remaining.value -= 1
  return true
}
