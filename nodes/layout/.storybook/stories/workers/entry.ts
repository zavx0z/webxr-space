/** Install only inside the separate Worker that re-enters its emitted module. */
export function installExecutor<Request, Response>(execute: (request: Request) => Response): void {
  const scope = globalThis as unknown as {
    document?: unknown
    postMessage?: (message: Response) => void
    addEventListener(type: "message", listener: (event: MessageEvent<Request>) => void): void
  }
  if (scope.document !== undefined || typeof scope.postMessage !== "function") return
  scope.addEventListener("message", event => scope.postMessage!(execute(event.data)))
}
