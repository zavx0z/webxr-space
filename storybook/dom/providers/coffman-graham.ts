import {runCoffmanGrahamWorkerRequest} from "@nodes/worker/coffman-graham/executor"
import {COFFMAN_GRAHAM_WORKER_STORY_GRAPH} from "../../fixtures/coffman-graham.ts"
import {asWorkerProtocolMessage, type WorkerDomExchangeProvider} from "../worker-provider.ts"

export const coffmanGrahamWorkerDomProvider: WorkerDomExchangeProvider = Object.freeze({
  id: "coffman-graham",
  createExchange(generation) {
    const request: Parameters<typeof runCoffmanGrahamWorkerRequest>[0] = {
      type: "layout",
      requestId: generation,
      generation,
      graph: COFFMAN_GRAHAM_WORKER_STORY_GRAPH,
    }
    return Object.freeze({
      id: "coffman-graham",
      label: "Coffman–Graham Worker",
      executor: "@nodes/worker/coffman-graham/executor",
      request: asWorkerProtocolMessage(request),
      response: asWorkerProtocolMessage(runCoffmanGrahamWorkerRequest(request)),
    })
  },
  source(generation) {
    return [
      'import {runCoffmanGrahamWorkerRequest} from "@nodes/worker/coffman-graham/executor"',
      'import {COFFMAN_GRAHAM_WORKER_STORY_GRAPH} from "../fixtures/coffman-graham.ts"',
      "",
      `const coffmanGrahamRequest = {type: "layout", requestId: ${generation}, generation: ${generation}, graph: COFFMAN_GRAHAM_WORKER_STORY_GRAPH} as const`,
      "const coffmanGrahamResponse = runCoffmanGrahamWorkerRequest(coffmanGrahamRequest)",
    ].join("\n")
  },
})
