import {TopDownWorkerClient} from "@zavx0z/layout/worker/top-down/client"
import {runTopDownWorkerRequest} from "@zavx0z/layout/worker/top-down/executor"
import {installExecutor} from "./entry.ts"

installExecutor(runTopDownWorkerRequest)

export function createClient(): TopDownWorkerClient {
  return new TopDownWorkerClient(new Worker(import.meta.url, {type: "module", name: "layout-top-down-story"}))
}
