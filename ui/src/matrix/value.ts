export function normalizeMatrixValue(
  value: readonly (readonly number[])[],
  step: number | undefined
): Readonly<{value: readonly (readonly number[])[]; step: number}> {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
    throw new TypeError("MatrixField must contain 2 to 4 rows")
  }
  const size = value.length
  if (value.some(row => !Array.isArray(row) || row.length !== size || !row.every(Number.isFinite))) {
    throw new TypeError("MatrixField value must be a square finite matrix")
  }
  const normalizedStep = step ?? 0.1
  if (!Number.isFinite(normalizedStep) || normalizedStep <= 0) throw new RangeError("MatrixField step must be positive")
  return Object.freeze({
    value: Object.freeze(value.map(row => Object.freeze([...row]))),
    step: normalizedStep
  })
}

export function updateMatrixValue(
  matrix: readonly (readonly number[])[],
  rowIndex: number,
  columnIndex: number,
  next: number
): readonly (readonly number[])[] {
  return Object.freeze(matrix.map((row, currentRow) => Object.freeze(
    row.map((entry, currentColumn) => currentRow === rowIndex && currentColumn === columnIndex ? next : entry)
  )))
}
