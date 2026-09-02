import {layoutFixed} from "@zavx0z/layout/fixed"
import {createWorkerExecutor, serializeWorkerError} from "../executor.ts"
import type {
  FixedWorkerRequest,
  FixedWorkerResponse,
} from "../types/worker.ts"

const execute = createWorkerExecutor(
  (graph: FixedWorkerRequest["graph"]) => ({result: layoutFixed(graph)}),
  serializeWorkerError,
)

/** Executes one fixed-policy request without access to browser globals. */
export function runFixedWorkerRequest(message: FixedWorkerRequest): FixedWorkerResponse {
  return execute(message)
}
