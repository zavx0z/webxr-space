import {FixedWorkerClient} from "@nodes/worker/fixed/client"
import type {FixedWorkerEndpoint} from "@nodes/worker/types"

export function createFixedWorkerClient(endpoint: FixedWorkerEndpoint): FixedWorkerClient {
  return new FixedWorkerClient(endpoint)
}
