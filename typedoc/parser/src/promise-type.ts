import type {Project, Type} from "typescript/unstable/async"

/**
Распознаёт стандартные Promise-оболочки для сохранения их сигнатуры без таблицы методов.
Одного совпадения имени недостаточно: объявление должно принадлежать default library проекта.

@param project - Проект той же сессии TypeScript, из которой получен type.

@param type - Тип, символ которого проверяется на `Promise` или `PromiseLike`.

@returns `true` для символа с соответствующим именем и объявлением в стандартной
библиотеке; пользовательский одноимённый тип и тип без символа дают `false`.

@example
При типе стандартного `Promise<number>`, полученном через checker:
```ts
const preserveWrapper = await isPromiseType(project, type) // true
```
*/
export async function isPromiseType(project: Project, type: Type): Promise<boolean> {
  const symbol = await type.getSymbol()
  if (!symbol || (symbol.name !== "Promise" && symbol.name !== "PromiseLike")) return false
  for (const handle of symbol.declarations) {
    const declaration = await handle.resolve()
    if (declaration && await project.program.isSourceFileDefaultLibrary(declaration.getSourceFile())) return true
  }
  return false
}
