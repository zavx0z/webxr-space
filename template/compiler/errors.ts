export class JsxCompileError extends Error {
  override readonly name = "JsxCompileError"

  constructor(message: string, readonly sourcePath: string) {
    super(`${sourcePath}: ${message}`)
  }
}
