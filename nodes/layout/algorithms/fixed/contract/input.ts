import type {LayoutEdge, LayoutNode, LayoutOptions, LayoutPort, LayoutSize} from "../../../protocol/types/src/protocol.ts"

/**
Измеренный граф для фиксированной политики сторон портов.

Источник каждой связи получает сторону `EAST`, приёмник — `WEST`. Один порт,
использованный в обеих ролях, отклоняется до запуска общего solver.

@property viewport - Размер доступной области в логических CSS-пикселях.

@property nodes - Измеренные ноды; исходный порядок и массив не изменяются.

@property ports - Измеренные вертикальные offsets сокетов без выбранной стороны.

@property edges - Семантические связи между точными идентификаторами портов.

@property [layoutOptions] - Интервалы, отступы и clearance общего solver.

@example
```ts
const input: FixedLayoutInput = {
  viewport: {width: 800, height: 600},
  nodes: [],
  ports: [],
  edges: [],
}
```
*/
export interface FixedLayoutInput {
  readonly viewport: LayoutSize
  readonly nodes: readonly LayoutNode[]
  readonly ports: readonly LayoutPort[]
  readonly edges: readonly LayoutEdge[]
  readonly layoutOptions?: LayoutOptions
}
