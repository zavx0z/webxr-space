import {ElementFlags, SignatureKind, SymbolFlags, TypeFlags, type Project, type Type} from "typescript/unstable/async"
import type {Node} from "typescript/unstable/ast"
import type {TypeDocSchema} from "../types/model.ts"
import type {VisitTypeMember} from "../types/type-members.ts"
import {documentation, enclosingProperty} from "./documentation.ts"

/**
Строит JSON Schema по разрешённым типам checker и тем же TSDoc, что справочник.
Рекурсивные формы ссылаются на уже раскрытую схему через стандартный $ref.
Не добавляет ограничений из свободного текста и не исполняет документируемый код.
Функции и не поддержанные JSON-формы явно закрываются схемой not с пояснением.
*/
export async function typeSchema(
  project: Project,
  type: Type,
  declaration: Node,
  visit: VisitTypeMember,
): Promise<TypeDocSchema> {
  const seen = new Map<number, string>()
  let remaining = 4096
  const pointer = (name: string) => encodeURIComponent(name.replace(/~/gu, "~0").replace(/\//gu, "~1"))
  const unavailable = async (value: Type, reason = "Тип не представим в JSON"): Promise<TypeDocSchema> => ({
    not: {}, description: `${reason}: ${await project.checker.typeToString(value, declaration)}`,
  })
  const annotate = (schema: TypeDocSchema, description: string): TypeDocSchema => description
    ? {...schema, description: schema.not && schema.description ? `${description}\n${schema.description}` : description}
    : schema
  const build = async (value: Type, path: string, depth: number, optional = false): Promise<TypeDocSchema> => {
    if (--remaining < 0 || depth > 48) return unavailable(value, "Превышен предел раскрытия JSON Schema")
    if (value.isStringLiteralType() || value.isNumberLiteralType() || value.isBooleanLiteralType()) {
      return {type: typeof value.value, const: value.value}
    }
    if (value.flags & TypeFlags.Any || value.flags & TypeFlags.Unknown) return {}
    if (value.flags & TypeFlags.String) return {type: "string"}
    if (value.flags & TypeFlags.Number) return {type: "number"}
    if (value.flags & TypeFlags.Boolean) return {type: "boolean"}
    if (value.flags & TypeFlags.Null) return {type: "null"}
    if (value.flags & (TypeFlags.Undefined | TypeFlags.Void | TypeFlags.Never | TypeFlags.BigIntLike | TypeFlags.ESSymbolLike)) return unavailable(value)
    if (value.isTypeParameter()) {
      const constraint = await project.checker.getBaseConstraintOfType(value)
      return constraint ? build(constraint, path, depth + 1) : {}
    }
    const previous = seen.get(value.id)
    if (previous !== undefined) return {$ref: previous}
    seen.set(value.id, path)
    if (value.isUnionType()) {
      const members = (await value.getTypes()).filter(member => !(optional && member.flags & TypeFlags.Undefined))
      if (members.length === 1) return build(members[0]!, path, depth + 1)
      if (members.every(member => member.isStringLiteralType() || member.isNumberLiteralType() || member.isBooleanLiteralType())) {
        const values = members.map(member => member.value as string | number | boolean)
        return {...(values.every(item => typeof item === typeof values[0]) ? {type: typeof values[0]} : {}), enum: values}
      }
      const anyOf: TypeDocSchema[] = []
      for (const [index, member] of members.entries()) anyOf.push(await build(member, `${path}/anyOf/${index}`, depth + 1))
      return {anyOf}
    }
    if (value.isIntersectionType()) {
      const allOf: TypeDocSchema[] = []
      for (const [index, member] of (await value.getTypes()).entries()) allOf.push(await build(member, `${path}/allOf/${index}`, depth + 1))
      return {allOf}
    }
    if (value.isTypeReference()) {
      const target = await value.getTarget()
      if (target.isTupleType()) {
        const elements = await project.checker.getTypeArguments(value)
        const prefixItems: TypeDocSchema[] = []
        let items: TypeDocSchema | boolean = false
        let minItems = 0
        for (const [index, element] of elements.entries()) {
          const flags = target.elementFlags[index] ?? ElementFlags.Required
          if (flags & (ElementFlags.Rest | ElementFlags.Variadic)) {
            if (index !== elements.length - 1) return unavailable(value, "JSON Schema пока не поддерживает обязательный хвост после rest")
            items = await build(element, `${path}/items`, depth + 1)
          } else {
            prefixItems.push(await build(element, `${path}/prefixItems/${index}`, depth + 1, !!(flags & ElementFlags.Optional)))
            if (flags & ElementFlags.Required) minItems = index + 1
          }
        }
        return {type: "array", ...(prefixItems.length ? {prefixItems} : {}), minItems, items,
          ...(items === false ? {maxItems: prefixItems.length} : {})}
      }
      if (await project.checker.isArrayType(value)) {
        const [element] = await project.checker.getTypeArguments(value)
        return {type: "array", items: element ? await build(element, `${path}/items`, depth + 1) : {}}
      }
    }
    if ((await project.checker.getSignaturesOfType(value, SignatureKind.Call)).length
      || (await project.checker.getSignaturesOfType(value, SignatureKind.Construct)).length) return unavailable(value)
    if (value.flags & TypeFlags.NonPrimitive) return {anyOf: [{type: "object"}, {type: "array"}]}
    if (!value.isObjectType()) return unavailable(value, "Генерация JSON Schema пока не поддерживает тип")
    const symbol = await value.getSymbol()
    const origin = await symbol?.declarations[0]?.resolve()
    if (origin && !symbol?.name.startsWith("__") && await project.program.isSourceFileDefaultLibrary(origin.getSourceFile())) return unavailable(value)
    if (origin) await visit(origin)
    const docs = origin ? documentation(origin) : undefined
    const properties: Record<string, TypeDocSchema> = Object.create(null)
    const required: string[] = []
    for (const member of await project.checker.getPropertiesOfType(value)) {
      const memberOrigin = await member.declarations[0]?.resolve()
      if (memberOrigin) await visit(memberOrigin)
      const own = memberOrigin ? documentation(memberOrigin).comment.summary : ""
      const inherited = memberOrigin ? enclosingProperty(memberOrigin, member.name) : undefined
      const description = docs?.properties.get(member.name)?.description || own || inherited?.description || ""
      const isOptional = !!(member.flags & SymbolFlags.Optional)
      const memberType = await project.checker.getTypeOfSymbolAtLocation(member, memberOrigin ?? declaration)
      properties[member.name] = annotate(await build(memberType, `${path}/properties/${pointer(member.name)}`, depth + 1, isOptional), description)
      if (!isOptional) required.push(member.name)
    }
    const indexes = await project.checker.getIndexInfosOfType(value)
    const index = indexes.find(entry => entry.keyType.flags & TypeFlags.String)
    if (indexes.length && !index) return unavailable(value, "JSON Schema пока поддерживает только строковый индекс объекта")
    const schema: TypeDocSchema = {
      type: "object",
      ...(Object.keys(properties).length ? {properties} : {}),
      ...(required.length ? {required} : {}),
      ...(index ? {additionalProperties: await build(index.valueType, `${path}/additionalProperties`, depth + 1)} : {}),
    }
    return annotate(schema, docs?.comment.summary ?? "")
  }
  return annotate(await build(type, "#", 0), documentation(declaration).comment.summary)
}
