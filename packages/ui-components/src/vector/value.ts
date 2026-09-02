export function normalizeVectorValue(
  value: readonly number[],
  axes: readonly string[] | undefined,
  step: number | undefined
): Readonly<{value: readonly number[]; axes: readonly string[]; step: number}> {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4 || !value.every(Number.isFinite)) {
    throw new TypeError("VectorField value must contain 2 to 4 finite numbers")
  }
  const normalizedAxes = axes ?? ["X", "Y", "Z", "W"].slice(0, value.length)
  if (normalizedAxes.length !== value.length || new Set(normalizedAxes).size !== normalizedAxes.length || normalizedAxes.some(axis => typeof axis !== "string" || axis.length === 0)) {
    throw new Error("VectorField axes must be unique and match value length")
  }
  const normalizedStep = step ?? 0.1
  if (!Number.isFinite(normalizedStep) || normalizedStep <= 0) throw new RangeError("VectorField step must be positive")
  return Object.freeze({
    value: Object.freeze([...value]),
    axes: Object.freeze([...normalizedAxes]),
    step: normalizedStep
  })
}

export function updateVectorValue(
  value: readonly number[],
  index: number,
  next: number
): readonly number[] {
  return Object.freeze(value.map((entry, entryIndex) => entryIndex === index ? next : entry))
}
