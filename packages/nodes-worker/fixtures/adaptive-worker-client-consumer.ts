import {AdaptiveWorkerClient} from "@nodes/worker/adaptive/client"
import type {AdaptiveWorkerEndpoint} from "@nodes/worker/types"

export function createAdaptiveWorkerClient(endpoint: AdaptiveWorkerEndpoint): AdaptiveWorkerClient {
  return new AdaptiveWorkerClient(endpoint)
}
