/**
Фиксированная политика сторон портов.

Источник получает EAST, приёмник WEST; один порт с конфликтующими ролями
отклоняется. Измеренный graph возвращается как ортогональная геометрия.
Worker client и executor используют тот же production алгоритм.

@packageDocumentation
*/

import {layoutResolved} from "../../shared/layout.ts"
import {resolveFixedLayoutGraph} from "./src/resolve.ts"
import type {FixedLayoutInput} from "./contract/input.ts"
import type {FixedLayoutOutput} from "./contract/output.ts"

export type {FixedLayoutInput} from "./contract/input.ts"
export type {FixedLayoutOutput} from "./contract/output.ts"

/**
Применяет фиксированные стороны endpoints и запускает общий placement/routing.

@param input - Измеренный граф без выбранных сторон портов.
@returns Числовая геометрия с `EAST` у источников и `WEST` у приёмников.
@throws Error при неизвестном порте, конфликте ролей или недопустимой геометрии.
*/
export function layoutFixed(input: FixedLayoutInput): FixedLayoutOutput {
  return layoutResolved(resolveFixedLayoutGraph(input))
}
