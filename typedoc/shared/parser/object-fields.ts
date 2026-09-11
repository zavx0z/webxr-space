import {TypeFlags, type Type} from "typescript/unstable/async"

/**
Определяет, следует ли разворачивать свойства типа в строки справочника.
Скалярные alias и branded-примитивы не получают методы boxed string/number.

@param type - Тип из действующего checker; составные части читаются в той же сессии.

@returns Для object — `true`; для intersection без primitive-части — наличие
хотя бы одной объектной части; для union — непустой набор только объектных частей.
Во всех остальных случаях — `false`.

@example
При `type`, полученном из checker для `string & {brand: "id"}`:
```ts
const showMembers = await hasObjectFields(type) // false
```
*/
export async function hasObjectFields(type: Type): Promise<boolean> {
  if (type.isObjectType()) return true
  if (!type.isUnionType() && !type.isIntersectionType()) return false
  const parts = await type.getTypes() ?? []
  if (type.isIntersectionType() && parts.some(part => (part.flags & TypeFlags.Primitive) !== 0)) return false
  const objects = await Promise.all(parts.map(hasObjectFields))
  return type.isIntersectionType() ? objects.some(Boolean) : objects.length > 0 && objects.every(Boolean)
}
