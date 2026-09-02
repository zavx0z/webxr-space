import fieldMetrics from "../../themes/field-metrics.json"

export type FieldDensity = "regular" | "compact"

export function resolveFieldDensity(
  value: FieldDensity | undefined,
  fallback: FieldDensity,
  owner: string
): FieldDensity {
  const density = value ?? fallback
  if (density !== "regular" && density !== "compact") {
    throw new Error(`Unknown ${owner} density: ${density}`)
  }
  return density
}

export function fieldMetric(name: keyof typeof fieldMetrics): number {
  const value = fieldMetrics[name]
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`UI field metric must be a non-negative finite number: ${name}`)
  }
  return value
}

export function fieldDensityHeight(density: FieldDensity): number {
  return fieldMetric(`field-height-${density}`)
}

export function labelledFieldHeight(controlHeight: number, labelled = false): number {
  return labelled
    ? Math.max(controlHeight, fieldMetric("field-label-height"))
    : controlHeight
}

export function matrixFieldHeight(size: number, density: FieldDensity): number {
  if (!Number.isInteger(size) || size < 2 || size > 4) {
    throw new RangeError("MatrixField layout size must be an integer from 2 to 4")
  }
  return size * fieldDensityHeight(density) + (size - 1) * fieldMetric("field-matrix-row-gap")
}

export function collectionFieldHeight(visibleRows: number, movable: boolean): number {
  const visibleHeight = collectionVisibleRowsHeight(visibleRows)
  const actionCount = movable ? 4 : 2
  const actionsHeight = actionCount * fieldMetric("field-collection-action-height") +
    (actionCount - 1) * fieldMetric("field-collection-action-gap")
  return Math.max(visibleHeight, actionsHeight)
}

export function collectionVisibleRowsHeight(visibleRows: number): number {
  const normalizedRows = normalizeVisibleRows(visibleRows)
  return fieldMetric(`field-collection-rows-${normalizedRows}-height`)
}

export function colorPickerFieldHeight(): number {
  const channelCount = fieldMetric("field-color-picker-channel-count")
  const composedHeight = fieldMetric("field-color-picker-swatch-height") +
    channelCount * fieldMetric("field-color-picker-channel-height") +
    channelCount * fieldMetric("field-color-picker-gap") +
    2 * fieldMetric("field-color-picker-padding") +
    2 * fieldMetric("field-color-picker-border-width")
  const height = fieldMetric("field-color-picker-height")
  if (height !== composedHeight) {
    throw new Error(`ColorPickerField height ${height} must equal its composed height ${composedHeight}`)
  }
  return height
}

function normalizeVisibleRows(value: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  if (!Number.isFinite(value)) return 3
  return Math.max(1, Math.min(8, Math.trunc(value))) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
}
