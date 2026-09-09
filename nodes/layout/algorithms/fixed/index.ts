/**
Фиксированная политика сторон портов.

Источник получает EAST, приёмник WEST; один порт с конфликтующими ролями
отклоняется. Измеренный graph возвращается как ортогональная геометрия.
Worker client и executor используют тот же production алгоритм.

@packageDocumentation
*/

export * from "./src/index.ts"
