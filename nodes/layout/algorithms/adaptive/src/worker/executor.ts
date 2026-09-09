import {
  AdaptiveLayoutError,
  layoutAdaptiveWithDiagnostics,
} from "@nodes/layout/adaptive"
import {createWorkerExecutor, serializeWorkerError} from "../../../../execution/worker/src/executor.ts"
import type {
  AdaptiveWorkerFailure,
  AdaptiveWorkerRequest,
  AdaptiveWorkerResponse,
  SerializedAdaptiveLayoutError,
} from "../../../../execution/worker/src/types/worker.ts"

const execute = createWorkerExecutor(
  (graph: AdaptiveWorkerRequest["graph"]) => layoutAdaptiveWithDiagnostics(graph),
  serializeAdaptiveWorkerError,
)

/** Executes one adaptive-policy request and preserves diagnostics or witness. */
export function runAdaptiveWorkerRequest(
  message: AdaptiveWorkerRequest,
): AdaptiveWorkerResponse {
  return execute(message)
}

function serializeAdaptiveWorkerError(error: unknown): AdaptiveWorkerFailure["error"] {
  if (!(error instanceof AdaptiveLayoutError)) return serializeWorkerError(error)
  const serialized: SerializedAdaptiveLayoutError = {
    name: "AdaptiveLayoutError",
    message: error.message,
    code: error.code,
    witness: error.witness,
  }
  return serialized
}
