import type {
  LayoutDirection,
  LayoutEdgeGeometry,
  LayoutNodeGeometry,
  LayoutPortGeometry,
  LayoutRectangle,
} from "../../../protocol/types/src/protocol.ts"

/**
Числовой результат выбранного допустимого назначения сторон.

@property direction - Фактическое направление слоёв.

@property bounds - Полные границы рассчитанной геометрии.

@property nodes - Абсолютные прямоугольники нод.

@property ports - Абсолютные центры портов с выбранной стороной.

@property edges - Ортогональные маршруты связей.
*/
export interface AdaptiveLayoutOutput {
  readonly direction: LayoutDirection
  readonly bounds: LayoutRectangle
  readonly nodes: readonly LayoutNodeGeometry[]
  readonly ports: readonly LayoutPortGeometry[]
  readonly edges: readonly LayoutEdgeGeometry[]
}
