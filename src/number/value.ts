export type NumberValueOptions = Readonly<{
  min?: number | undefined
  max?: number | undefined
  softMin?: number | undefined
  softMax?: number | undefined
  step?: number | undefined
}>

export type NumberRange = Readonly<{min: number; max: number}>

export function formatNumberValue(value: number, precision: number | undefined): number | string {
  if (precision === undefined) return value
  if (!Number.isInteger(precision) || precision < 0 || precision > 20) {
    throw new RangeError("NumberField precision must be an integer from 0 to 20")
  }
  return value.toFixed(precision)
}

export function numberFillPercentage(
  value: number,
  minimum: number | undefined,
  maximum: number | undefined
): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum! <= minimum!) {
    return null
  }
  return Math.min(100, Math.max(0, (value - minimum!) / (maximum! - minimum!) * 100))
}

export function normalizeNumberValue(
  value: number,
  options: NumberValueOptions = {}
): number {
  const minimum = finiteBound(options.min, Number.NEGATIVE_INFINITY)
  const maximum = Math.max(minimum, finiteBound(options.max, Number.POSITIVE_INFINITY))
  const finite = Number.isFinite(value) ? value : finiteBound(options.min, 0)
  const clamped = Math.min(maximum, Math.max(minimum, finite))
  const step = validNumberStep(options.step)
  const stepBase = Number.isFinite(minimum) ? minimum : 0
  const stepped = step === undefined
    ? clamped
    : stepBase + Math.round((clamped - stepBase) / step) * step
  return roundedNumber(Math.min(maximum, Math.max(minimum, stepped)))
}

export function resolveNumberSoftRange(
  value: number,
  options: NumberValueOptions = {}
): NumberRange {
  const hardMin = finiteBound(options.min, Number.NEGATIVE_INFINITY)
  const hardMax = Math.max(hardMin, finiteBound(options.max, Number.POSITIVE_INFINITY))
  const center = normalizeNumberValue(value, options)
  const step = numberPointerStep(options)
  const adaptiveSpan = numberPointerAdaptiveSpan(options)
  let minimum = Number.isFinite(options.softMin)
    ? options.softMin!
    : Number.isFinite(hardMin)
      ? hardMin
      : center - adaptiveSpan / 2
  let maximum = Number.isFinite(options.softMax)
    ? options.softMax!
    : Number.isFinite(hardMax)
      ? hardMax
      : center + adaptiveSpan / 2
  if (minimum > maximum) [minimum, maximum] = [maximum, minimum]
  minimum = Math.max(hardMin, minimum)
  maximum = Math.min(hardMax, maximum)
  if (minimum > maximum) minimum = maximum
  if (minimum === maximum) {
    if (maximum + step <= hardMax) maximum += step
    else if (minimum - step >= hardMin) minimum -= step
  }
  return Object.freeze({min: minimum, max: maximum})
}

export function stepNumberValue(
  value: number,
  direction: -1 | 1,
  options: NumberValueOptions = {}
): number {
  const range = resolveNumberSoftRange(value, options)
  const candidate = normalizeNumberValue(value + numberPointerStep(options) * direction, options)
  return direction < 0 ? Math.max(range.min, candidate) : Math.min(range.max, candidate)
}

export function numberPointerStep(options: NumberValueOptions): number {
  return validNumberStep(options.step) ?? 0.1
}

export function numberPointerAdaptiveSpan(options: NumberValueOptions): number {
  return 20_000 * Math.min(numberPointerStep(options), 0.1)
}

function validNumberStep(value: number | undefined): number | undefined {
  return Number.isFinite(value) && value! > 0 ? value : undefined
}

function finiteBound(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback
}

export function roundedNumber(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
