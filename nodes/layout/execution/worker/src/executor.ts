import type {
  WorkerFailure,
  WorkerRequest,
  WorkerSuccess,
  SerializedWorkerError,
} from "./types/worker.ts"

export type WorkerComputation<Result, Diagnostics = never> = Readonly<{
  result: Result
}> & ([Diagnostics] extends [never] ? Readonly<Record<never, never>> : Readonly<{
  diagnostics: Diagnostics
}>)

/** Serializes an ordinary exception without relying on structured-cloning Error. */
export function serializeWorkerError(error: unknown): SerializedWorkerError {
  return error instanceof Error
    ? {name: error.name, message: error.message}
    : {name: "Error", message: String(error)}
}

/**
 * Builds an executor envelope around one concrete pure policy.
 *
 * Policy modules provide the calculation and optional typed serializer; this
 * shared lifecycle never imports fixed or adaptive implementation code.
 */
export function createWorkerExecutor<
  Graph,
  Result,
  Diagnostics = never,
  Failure extends SerializedWorkerError = SerializedWorkerError,
>(
  calculate: (graph: Graph) => WorkerComputation<Result, Diagnostics>,
  serializeError: (error: unknown) => Failure,
): (
  message: WorkerRequest<Graph>,
) => WorkerSuccess<Result, Diagnostics> | WorkerFailure<Failure> {
  return (message) => {
    try {
      return {
        type: "layout-result",
        requestId: message.requestId,
        generation: message.generation,
        ...calculate(message.graph),
      } as WorkerSuccess<Result, Diagnostics>
    } catch (error) {
      return {
        type: "layout-error",
        requestId: message.requestId,
        generation: message.generation,
        error: serializeError(error),
      }
    }
  }
}
