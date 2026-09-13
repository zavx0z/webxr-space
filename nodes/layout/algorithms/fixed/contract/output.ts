import type {
  LayoutDirection,
  LayoutEdgeGeometry,
  LayoutNodeGeometry,
  LayoutPortGeometry,
  LayoutRectangle,
} from "../../../protocol/types/src/protocol.ts"

/**
Результат фиксированной раскладки с выбранными сторонами каждого видимого порта.

@property direction - Фактическое направление слоёв общего solver.

@property bounds - Полные границы рассчитанной геометрии.

@property nodes - Абсолютные прямоугольники нод и compound-контейнеров.

@property ports - Абсолютные центры портов со сторонами `WEST` либо `EAST`.

@property edges - Ортогональные маршруты semantic edges.
*/
export interface FixedLayoutOutput {
  readonly direction: LayoutDirection
  readonly bounds: LayoutRectangle
  readonly nodes: readonly LayoutNodeGeometry[]
  readonly ports: readonly LayoutPortGeometry[]
  readonly edges: readonly LayoutEdgeGeometry[]
}
