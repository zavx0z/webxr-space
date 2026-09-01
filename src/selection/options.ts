export type SelectionOptionShape = Readonly<{
  key: string
  value: string
  label: string
  disabled?: boolean | undefined
}>

export type SelectionState = "ready" | "undefined" | "error"

export function validateSelectionOptions<T extends SelectionOptionShape>(options: readonly T[]): readonly T[] {
  if (!Array.isArray(options)) throw new TypeError("Field options must be an array")
  const keys = new Set<string>()
  const values = new Set<string>()
  for (const option of options) {
    if (typeof option.key !== "string" || option.key.length === 0) {
      throw new TypeError("Field option key must not be empty")
    }
    if (keys.has(option.key)) throw new Error(`Field option key must be unique: ${option.key}`)
    keys.add(option.key)
    if (typeof option.value !== "string" || typeof option.label !== "string") {
      throw new TypeError("Field option value and label must be strings")
    }
    if (values.has(option.value)) throw new Error(`Field option value must be unique: ${option.value}`)
    values.add(option.value)
  }
  return options
}

export function findSelectionOption<T extends SelectionOptionShape>(
  value: string,
  options: readonly T[]
): T | undefined {
  return options.find(option => option.value === value)
}

export function selectionExceptionalLabel(
  state: SelectionState | undefined,
  options: readonly SelectionOptionShape[] | undefined
): string | undefined {
  if (state === "error") return "Menu Error"
  if (state === "undefined" || options === undefined) return "Menu Undefined"
  if (options.length === 0) return "No Items"
  return undefined
}

export function validateSelectionState(state: SelectionState | undefined): void {
  if (state !== undefined && state !== "ready" && state !== "undefined" && state !== "error") {
    throw new Error(`Unknown selection state: ${state}`)
  }
}
