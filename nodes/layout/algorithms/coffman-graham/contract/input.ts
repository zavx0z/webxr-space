import type {
  CoffmanGrahamLayoutEdge,
  CoffmanGrahamLayoutNode,
  CoffmanGrahamLayoutOptions,
  CoffmanGrahamLayoutPort,
} from "../../../protocol/types/src/coffman-graham.ts"

/**
Измеренный DAG для раскладки Coffman–Graham с ограниченной шириной слоя.

@property nodes - Измеренные прямоугольники нод в стабильном порядке.

@property ports - Точные горизонтальные offsets портов внутри нод.

@property edges - Семантические связи между портами.

@property [layoutOptions] - Ограничение числа нод в слое и числовые интервалы.

@example
```ts
const input: CoffmanGrahamLayoutInput = {nodes: [], ports: [], edges: []}
```
*/
export interface CoffmanGrahamLayoutInput {
  readonly nodes: readonly CoffmanGrahamLayoutNode[]
  readonly ports: readonly CoffmanGrahamLayoutPort[]
  readonly edges: readonly CoffmanGrahamLayoutEdge[]
  readonly layoutOptions?: CoffmanGrahamLayoutOptions | undefined
}
