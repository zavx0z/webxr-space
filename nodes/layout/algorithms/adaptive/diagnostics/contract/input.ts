import type {LayoutEdge, LayoutNode, LayoutOptions, LayoutSize} from "../../../../protocol/types/src/protocol.ts"
import type {AdaptiveLayoutPort} from "../../types/adaptive.ts"

/**
Вход adaptive-раскладки с возвратом ограниченной диагностики поиска.

@property viewport - Размер области в логических CSS-пикселях.
@property nodes - Измеренные ноды.
@property ports - Сокеты с capability и допустимыми сторонами.
@property edges - Связи между точными портами.
@property [layoutOptions] - Интервалы общего solver.
*/
export interface AdaptiveLayoutDiagnosticsInput {
  readonly viewport: LayoutSize
  readonly nodes: readonly LayoutNode[]
  readonly ports: readonly AdaptiveLayoutPort[]
  readonly edges: readonly LayoutEdge[]
  readonly layoutOptions?: LayoutOptions | undefined
}
