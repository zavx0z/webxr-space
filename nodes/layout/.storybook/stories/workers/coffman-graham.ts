import {CoffmanGrahamWorkerClient} from "@nodes/layout/worker/coffman-graham/client"
import {runCoffmanGrahamWorkerRequest} from "@nodes/layout/worker/coffman-graham/executor"
import {installExecutor} from "./entry.ts"

installExecutor(runCoffmanGrahamWorkerRequest)

export function createClient(): CoffmanGrahamWorkerClient {
  return new CoffmanGrahamWorkerClient(new Worker(import.meta.url, {type: "module", name: "layout-coffman-graham-story"}))
}
