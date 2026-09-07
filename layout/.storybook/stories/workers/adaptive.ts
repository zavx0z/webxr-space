import {AdaptiveWorkerClient} from "@zavx0z/layout/worker/adaptive/client"
import {runAdaptiveWorkerRequest} from "@zavx0z/layout/worker/adaptive/executor"
import {installExecutor} from "./entry.ts"

installExecutor(runAdaptiveWorkerRequest)

export function createClient(): AdaptiveWorkerClient {
  return new AdaptiveWorkerClient(new Worker(import.meta.url, {type: "module", name: "layout-adaptive-story"}))
}
