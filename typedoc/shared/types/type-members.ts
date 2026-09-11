import type {Node} from "typescript/unstable/ast"

/**
Состояние одного ограниченного обхода вложенной части effective-типа.

@property path - Идентификаторы типов только текущей ветви; повтор завершает строку,
но не запрещает раскрыть тот же переиспользованный тип в соседней ветви.

@property depth - Число уже раскрытых контейнеров от корня декларации.
Нулевой уровень не расходует бюджет: существующие поля публичного контракта сохраняются.

@property remaining - Общий бюджет новых вложенных строк одной декларации.
*/
export interface TypeTraversal {
  readonly path: ReadonlySet<number>
  readonly depth: number
  readonly remaining: {value: number}
}

/** Посещает исходное объявление вложенного поля для снимка зависимостей parser. */
export type VisitTypeMember = (node: Node) => Promise<void>
