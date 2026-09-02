import {runAdaptiveWorkerRequest} from "@nodes/worker/adaptive/executor"
import {ADAPTIVE_WORKER_STORY_GRAPH} from "../../fixtures/adaptive.ts"
import {asWorkerProtocolMessage, type WorkerDomExchangeProvider} from "../worker-provider.ts"

export const adaptiveWorkerDomProvider: WorkerDomExchangeProvider = Object.freeze({
  id: "adaptive",
  createExchange(generation) {
    const request: Parameters<typeof runAdaptiveWorkerRequest>[0] = {
      type: "layout",
      requestId: generation,
      generation,
      graph: ADAPTIVE_WORKER_STORY_GRAPH,
    }
    return Object.freeze({
      id: "adaptive",
      label: "Adaptive Worker",
      executor: "@nodes/worker/adaptive/executor",
      request: asWorkerProtocolMessage(request),
      response: asWorkerProtocolMessage(runAdaptiveWorkerRequest(request)),
    })
  },
  source(generation) {
    return [
      'import {runAdaptiveWorkerRequest} from "@nodes/worker/adaptive/executor"',
      'import {ADAPTIVE_WORKER_STORY_GRAPH} from "../fixtures/adaptive.ts"',
      "",
      `const adaptiveRequest = {type: "layout", requestId: ${generation}, generation: ${generation}, graph: ADAPTIVE_WORKER_STORY_GRAPH} as const`,
      "const adaptiveResponse = runAdaptiveWorkerRequest(adaptiveRequest)",
    ].join("\n")
  },
})
