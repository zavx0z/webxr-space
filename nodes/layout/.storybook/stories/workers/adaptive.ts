import {AdaptiveWorkerClient} from "@nodes/layout/worker/adaptive/client"
import {runAdaptiveWorkerRequest} from "@nodes/layout/worker/adaptive/executor"
import {installExecutor} from "./entry.ts"

installExecutor(runAdaptiveWorkerRequest)

export function createClient(): AdaptiveWorkerClient {
  return new AdaptiveWorkerClient(new Worker(import.meta.url, {type: "module", name: "layout-adaptive-story"}))
}
