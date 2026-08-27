import { Color } from "../math"
import { Material, type MaterialParameters } from "./material"

/**
 * Параметры RoundedRectMaterial.
 *
 * Все размеры — в WORLD-units. Caller сам пересчитывает logical-px → world
 * через свой pixelScale. Для обычного rounded rect `width`/`height` совпадают
 * с PlaneGeometry; analytical shadow сохраняет в них исходную inner shape,
 * а сам quad симметрично расширяется на `shadowSpread + shadowBlur`.
 *
 * `radius` — единое значение либо per-corner кортеж {tl, tr, br, bl}.
 * `borderWidth` — uniform shorthand. `borderWidths` — canonical tuple
 * `[top, right, bottom, left]`. Non-uniform widths are supported only when all
 * corner radii are zero; a rounded asymmetric inner contour is not claimed.
 *
 * Антиалиасинг работает через fwidth() в фрагментном шейдере — независим
 * от размера меша и pixelRatio, даёт стабильный 1-px переход на любой DPR.
 */
export interface RoundedRectMaterialParameters extends MaterialParameters {
  /** Размер исходной SDF-формы в world-units. */
  width: number
  height: number
  /** Радиус скругления (world-units). Может быть single number или per-corner. */
  radius: number | {tl: number; tr: number; br: number; bl: number}
  /** Цвет заливки. Omitted = opaque 0xffffff; explicit null = transparent fill. */
  fill?: Color | number | null
  /** Цвет рамки. Default null (нет рамки). */
  border?: Color | number | null
  /** Толщина рамки в world-units. Default 0. */
  borderWidth?: number
  /** Canonical per-edge widths `[top, right, bottom, left]` in world-units. */
  borderWidths?: RoundedRectBorderWidths
  /** 0..1, домножается на alpha. Default 1. */
  opacity?: number
  /** Local half-width of the analytical shadow fade. Default 0. */
  shadowBlur?: number
  /** Local solid expansion before the analytical shadow fade. Default 0. */
  shadowSpread?: number
}

export type RoundedRectBorderWidths = readonly [
  top: number,
  right: number,
  bottom: number,
  left: number,
]

const finiteNonNegative = (value: number | undefined): number =>
  value !== undefined && Number.isFinite(value) ? Math.max(0, value) : 0

export class RoundedRectMaterial extends Material {
  public readonly isRoundedRectMaterial: true = true

  public width: number
  public height: number
  /** tl, tr, br, bl */
  public radii: [number, number, number, number]
  public fill: Color
  public border: Color
  private edgeBorderWidths: [number, number, number, number] = [0, 0, 0, 0]
  public opacity: number
  public shadowBlur: number
  public shadowSpread: number
  public clipBounds: [number, number, number, number] | null = null

  constructor(parameters: RoundedRectMaterialParameters) {
    super(parameters)
    this.width = parameters.width
    this.height = parameters.height

    if (typeof parameters.radius === "number") {
      const r = parameters.radius
      this.radii = [r, r, r, r]
    } else {
      const {tl, tr, br, bl} = parameters.radius
      this.radii = [tl, tr, br, bl]
    }

    this.fill = parameters.fill instanceof Color
      ? parameters.fill.clone()
      : new Color(parameters.fill === undefined || parameters.fill === null ? 0xffffff : parameters.fill)
    if (parameters.fill === null) this.fill.a = 0
    this.border = parameters.border instanceof Color
      ? parameters.border.clone()
      : new Color(parameters.border === null || parameters.border === undefined ? 0x000000 : parameters.border)
    if (parameters.border === null || parameters.border === undefined) {
      this.border.a = 0
    }

    if (parameters.borderWidths !== undefined) this.borderWidths = parameters.borderWidths
    else this.borderWidth = finiteNonNegative(parameters.borderWidth)
    this.opacity = parameters.opacity ?? 1
    this.shadowBlur = finiteNonNegative(parameters.shadowBlur)
    this.shadowSpread = finiteNonNegative(parameters.shadowSpread)
  }

  /** Canonical `[top, right, bottom, left]` border widths. */
  get borderWidths(): RoundedRectBorderWidths {
    return this.edgeBorderWidths
  }

  set borderWidths(value: RoundedRectBorderWidths) {
    const widths = validatedBorderWidths(value)
    assertRoundedBorderCompatibility(widths, this.radii)
    this.edgeBorderWidths = widths
  }

  /**
   * Uniform authoring shorthand retained for existing consumers.
   *
   * Assigning it replaces all four canonical edges. Reading a non-uniform
   * tuple returns `NaN` rather than choosing one edge lossily.
   */
  get borderWidth(): number {
    const [top, right, bottom, left] = this.edgeBorderWidths
    return top === right && top === bottom && top === left ? top : Number.NaN
  }

  set borderWidth(value: number) {
    const width = finiteNonNegative(value)
    this.edgeBorderWidths = [width, width, width, width]
  }
}

const validatedBorderWidths = (
  value: RoundedRectBorderWidths,
): [number, number, number, number] => {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TypeError("RoundedRectMaterial.borderWidths must contain top/right/bottom/left")
  }
  const widths = [...value] as [number, number, number, number]
  if (widths.some(width => !Number.isFinite(width) || width < 0)) {
    throw new RangeError("RoundedRectMaterial.borderWidths must be finite and non-negative")
  }
  return widths
}

const assertRoundedBorderCompatibility = (
  widths: RoundedRectBorderWidths,
  radii: readonly number[],
): void => {
  const [top, right, bottom, left] = widths
  const uniform = top === right && top === bottom && top === left
  if (!uniform && radii.some(radius => radius !== 0)) {
    throw new RangeError(
      "RoundedRectMaterial non-uniform border widths require zero corner radii",
    )
  }
}
