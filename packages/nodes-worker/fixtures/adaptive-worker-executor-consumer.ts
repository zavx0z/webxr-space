import {runAdaptiveWorkerRequest} from "@nodes/worker/adaptive/executor"
import type {AdaptiveWorkerRequest, AdaptiveWorkerResponse} from "@nodes/worker/types"

export function executeAdaptiveWorker(request: AdaptiveWorkerRequest): AdaptiveWorkerResponse {
  return runAdaptiveWorkerRequest(request)
}
