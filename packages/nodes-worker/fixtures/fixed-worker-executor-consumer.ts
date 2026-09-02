import {runFixedWorkerRequest} from "@nodes/worker/fixed/executor"
import type {FixedWorkerRequest, FixedWorkerResponse} from "@nodes/worker/types"

export function executeFixedWorker(request: FixedWorkerRequest): FixedWorkerResponse {
  return runFixedWorkerRequest(request)
}
