import type {
  CoffmanGrahamCrossingGeometry,
  CoffmanGrahamEdgeGeometry,
  CoffmanGrahamPortGeometry,
} from "../../../protocol/types/src/coffman-graham.ts"
import type {LayoutNodeGeometry, LayoutRectangle} from "../../../protocol/types/src/protocol.ts"

/**
Числовой результат одной детерминированной раскладки Coffman–Graham.

@property direction - Постоянное направление слоёв `DOWN`.

@property bounds - Полные границы нод и маршрутов.

@property nodes - Абсолютная геометрия нод.

@property ports - Абсолютные центры портов на сторонах `NORTH` и `SOUTH`.

@property edges - Кубические цепочки маршрутов.

@property crossings - Классифицированные пересечения с устойчивым порядком over/under.
*/
export interface CoffmanGrahamLayoutOutput {
  readonly direction: "DOWN"
  readonly bounds: LayoutRectangle
  readonly nodes: readonly LayoutNodeGeometry[]
  readonly ports: readonly CoffmanGrahamPortGeometry[]
  readonly edges: readonly CoffmanGrahamEdgeGeometry[]
  readonly crossings: readonly CoffmanGrahamCrossingGeometry[]
}
