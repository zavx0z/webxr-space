/** Минимальный lifecycle общей session, проверяемый без запуска TypeScript child. */
export interface CloseableBatchSession {
  close(): void | Promise<void>
}
