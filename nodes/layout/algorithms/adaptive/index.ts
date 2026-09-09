/**
Поиск совместимой стороны каждого точного сокета.

Ограниченный набор кандидатов учитывает capability и allowedSides, возвращает
геометрию и диагностику выбора. Общий сокет сохраняет одну выбранную сторону.
Worker client и executor используют тот же production алгоритм.

@packageDocumentation
*/

export * from "./src/index.ts"
