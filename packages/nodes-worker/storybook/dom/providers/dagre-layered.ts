import {runTopDownWorkerRequest} from "@nodes/worker/top-down/executor"
import {DAGRE_LAYERED_WORKER_STORY_GRAPH} from "../../fixtures/dagre-layered.ts"
import {asWorkerProtocolMessage, type WorkerDomExchangeProvider} from "../worker-provider.ts"

export const dagreLayeredWorkerDomProvider: WorkerDomExchangeProvider = Object.freeze({
  id: "dagre-layered",
  createExchange(generation) {
    const request: Parameters<typeof runTopDownWorkerRequest>[0] = {
      type: "layout",
      requestId: generation,
      generation,
      graph: DAGRE_LAYERED_WORKER_STORY_GRAPH,
    }
    return Object.freeze({
      id: "dagre-layered",
      label: "Dagre Layered Worker",
      executor: "@nodes/worker/top-down/executor",
      request: asWorkerProtocolMessage(request),
      response: asWorkerProtocolMessage(runTopDownWorkerRequest(request)),
    })
  },
  source(generation) {
    return [
      'import {runTopDownWorkerRequest} from "@nodes/worker/top-down/executor"',
      'import {DAGRE_LAYERED_WORKER_STORY_GRAPH} from "../fixtures/dagre-layered.ts"',
      "",
      `const dagreRequest = {type: "layout", requestId: ${generation}, generation: ${generation}, graph: DAGRE_LAYERED_WORKER_STORY_GRAPH} as const`,
      "const dagreResponse = runTopDownWorkerRequest(dagreRequest)",
    ].join("\n")
  },
})
