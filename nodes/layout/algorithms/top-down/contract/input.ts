import type {TopDownInput} from "../../../protocol/types/src/top-down.ts"

/**
Вход одной вертикальной раскладки DAG.

`graph` сохраняет один из двух числовых форматов: точные порты `NORTH/SOUTH`
либо контурные связи между измеренными фигурами. Алгоритм не читает DOM и не
изменяет исходные массивы.

@property graph - Портовый или контурный измеренный граф.

@example
```ts
const input: TopDownLayoutInput = {
  graph: {attachment: "contour", nodes: [], edges: []},
}
```
*/
export interface TopDownLayoutInput {
  readonly graph: TopDownInput
}
