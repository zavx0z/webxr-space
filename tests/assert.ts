export function assertRequirement(
  condition: unknown,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`${code}: ${message}`)
}
