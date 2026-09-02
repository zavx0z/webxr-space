import {TopDownLayoutError, layoutTopDown} from "@nodes/layout/top-down"
import {createWorkerExecutor, serializeWorkerError} from "../executor.ts"
import type {
  SerializedTopDownLayoutError,
  TopDownWorkerFailure,
  TopDownWorkerRequest,
  TopDownWorkerResponse,
} from "../types/worker.ts"

const execute = createWorkerExecutor(
  (graph: TopDownWorkerRequest["graph"]) => ({result: layoutTopDown(graph)}),
  serializeTopDownWorkerError,
)

/** Executes one top-down DAG request without importing another layout policy. */
export function runTopDownWorkerRequest(message: TopDownWorkerRequest): TopDownWorkerResponse {
  return execute(message)
}

function serializeTopDownWorkerError(error: unknown): TopDownWorkerFailure["error"] {
  if (!(error instanceof TopDownLayoutError)) return serializeWorkerError(error)
  const serialized: SerializedTopDownLayoutError = {
    name: "TopDownLayoutError",
    message: error.message,
    code: error.code,
    witness: error.witness,
  }
  return serialized
}
