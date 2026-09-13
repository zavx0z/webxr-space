import type {LayoutEdge, LayoutNode, LayoutOptions, LayoutSize} from "../../../protocol/types/src/protocol.ts"
import type {AdaptiveLayoutPort} from "../types/adaptive.ts"

/**
Измеренный граф для ограниченного поиска допустимых сторон портов.

@property viewport - Размер доступной области в логических CSS-пикселях.

@property nodes - Измеренные ноды без изменения исходного порядка.

@property ports - Сокеты с capability и допустимыми сторонами.

@property edges - Семантические связи между точными портами.

@property [layoutOptions] - Интервалы и отступы общего solver.

@example
```ts
const input: AdaptiveLayoutInput = {
  viewport: {width: 800, height: 600},
  nodes: [],
  ports: [],
  edges: [],
}
```
*/
export interface AdaptiveLayoutInput {
  readonly viewport: LayoutSize
  readonly nodes: readonly LayoutNode[]
  readonly ports: readonly AdaptiveLayoutPort[]
  readonly edges: readonly LayoutEdge[]
  readonly layoutOptions?: LayoutOptions | undefined
}
