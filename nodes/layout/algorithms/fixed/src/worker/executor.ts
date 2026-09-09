import {layoutFixed} from "@nodes/layout/fixed"
import {createWorkerExecutor, serializeWorkerError} from "../../../../execution/worker/src/executor.ts"
import type {
  FixedWorkerRequest,
  FixedWorkerResponse,
} from "../../../../execution/worker/src/types/worker.ts"

const execute = createWorkerExecutor(
  (graph: FixedWorkerRequest["graph"]) => ({result: layoutFixed(graph)}),
  serializeWorkerError,
)

/** Executes one fixed-policy request without access to browser globals. */
export function runFixedWorkerRequest(message: FixedWorkerRequest): FixedWorkerResponse {
  return execute(message)
}
