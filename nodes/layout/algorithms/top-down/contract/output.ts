import type {
  TopDownEdgeGeometry,
  TopDownPortGeometry,
} from "../../../protocol/types/src/top-down.ts"
import type {LayoutNodeGeometry, LayoutRectangle} from "../../../protocol/types/src/protocol.ts"

/**
Числовой результат детерминированной вертикальной раскладки.

@property direction - Постоянное направление слоёв `DOWN`.

@property bounds - Полные границы нод и маршрутов.

@property nodes - Абсолютные прямоугольники нод.

@property ports - Точные endpoints портового входа; для contour-входа массив пуст.

@property edges - Непустые цепочки кубических сегментов каждого semantic edge.
*/
export interface TopDownLayoutOutput {
  readonly direction: "DOWN"
  readonly bounds: LayoutRectangle
  readonly nodes: readonly LayoutNodeGeometry[]
  readonly ports: readonly TopDownPortGeometry[]
  readonly edges: readonly TopDownEdgeGeometry[]
}
