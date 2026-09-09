import {FixedWorkerClient} from "@nodes/layout/worker/fixed/client"
import {runFixedWorkerRequest} from "@nodes/layout/worker/fixed/executor"
import {installExecutor} from "./entry.ts"

installExecutor(runFixedWorkerRequest)

export function createClient(): FixedWorkerClient {
  return new FixedWorkerClient(new Worker(import.meta.url, {type: "module", name: "layout-fixed-story"}))
}
