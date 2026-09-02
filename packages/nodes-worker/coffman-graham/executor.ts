import {
  CoffmanGrahamLayoutError,
  layoutCoffmanGraham,
} from "@nodes/layout/coffman-graham"
import {createWorkerExecutor, serializeWorkerError} from "../executor.ts"
import type {
  CoffmanGrahamWorkerFailure,
  CoffmanGrahamWorkerRequest,
  CoffmanGrahamWorkerResponse,
  SerializedCoffmanGrahamLayoutError,
} from "../types/worker.ts"

const execute = createWorkerExecutor(
  (graph: CoffmanGrahamWorkerRequest["graph"]) => ({result: layoutCoffmanGraham(graph)}),
  serializeCoffmanGrahamWorkerError,
)

/** Executes one width-bounded Coffman–Graham request and no other policy. */
export function runCoffmanGrahamWorkerRequest(
  message: CoffmanGrahamWorkerRequest,
): CoffmanGrahamWorkerResponse {
  return execute(message)
}

function serializeCoffmanGrahamWorkerError(
  error: unknown,
): CoffmanGrahamWorkerFailure["error"] {
  if (!(error instanceof CoffmanGrahamLayoutError)) return serializeWorkerError(error)
  const serialized: SerializedCoffmanGrahamLayoutError = {
    name: "CoffmanGrahamLayoutError",
    message: error.message,
    code: error.code,
    witness: error.witness,
  }
  return serialized
}
