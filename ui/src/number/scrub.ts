import {
  normalizeNumberValue,
  numberPointerAdaptiveSpan,
  resolveNumberSoftRange,
  roundedNumber,
  type NumberRange,
  type NumberValueOptions
} from "./value.ts"

export function scrubNumberValue(
  value: number,
  deltaX: number,
  distanceX: number,
  options: NumberValueOptions = {},
  shift = false,
  ctrl = false
): number {
  const range = resolveNumberDragRange(value, options)
  const raw = scrubNumberRawValue(value, deltaX, distanceX, range, shift)
  const candidate = ctrl ? snapNumberValue(raw, range, shift) : raw
  return normalizeNumberValue(candidate, options)
}

export function snapNumberValue(
  value: number,
  range: NumberRange,
  small = false
): number {
  if (!Number.isFinite(value) || value === range.min || value === range.max) return value
  const span = range.max - range.min
  if (!Number.isFinite(span) || span <= 0) return value
  const baseIncrement = span < 2.1 ? 0.1 : span < 21 ? 1 : 10
  const increment = baseIncrement * (small ? 0.1 : 1)
  const snapped = roundHalfAwayFromZero(value / increment) * increment
  return roundedNumber(Math.min(range.max, Math.max(range.min, snapped)))
}

export function scrubNumberRawValue(
  value: number,
  deltaX: number,
  distanceX: number,
  range: NumberRange,
  shift: boolean
): number {
  const softSpan = range.max - range.min
  if (softSpan <= 0 || !Number.isFinite(deltaX) || !Number.isFinite(distanceX)) {
    return Math.min(range.max, Math.max(range.min, value))
  }
  let scale = softSpan > 11 ? Math.abs(distanceX) / 500 : 1
  if (shift) scale /= 10
  return Math.min(range.max, Math.max(range.min, value + (deltaX / 500) * scale * softSpan))
}

export function resolveNumberDragRange(
  value: number,
  options: NumberValueOptions
): NumberRange {
  const range = resolveNumberSoftRange(value, options)
  const span = range.max - range.min
  const maximumSpan = numberPointerAdaptiveSpan(options)
  if (span <= maximumSpan) return range
  const center = normalizeNumberValue(value, options)
  let minimum = center - maximumSpan / 2
  let maximum = center + maximumSpan / 2
  if (minimum < range.min) {
    minimum = range.min
    maximum = minimum + maximumSpan
  }
  else if (maximum > range.max) {
    maximum = range.max
    minimum = maximum - maximumSpan
  }
  return Object.freeze({min: minimum, max: maximum})
}

function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}
