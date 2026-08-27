import {runFixedWorkerRequest} from "@nodes/worker/fixed/executor"
import {FIXED_WORKER_STORY_GRAPH} from "../../fixtures/fixed.ts"
import {asWorkerProtocolMessage, type WorkerDomExchangeProvider} from "../worker-provider.ts"

export const fixedWorkerDomProvider: WorkerDomExchangeProvider = Object.freeze({
  id: "fixed",
  createExchange(generation) {
    const request: Parameters<typeof runFixedWorkerRequest>[0] = {
      type: "layout",
      requestId: generation,
      generation,
      graph: FIXED_WORKER_STORY_GRAPH,
    }
    return Object.freeze({
      id: "fixed",
      label: "Fixed Worker",
      executor: "@nodes/worker/fixed/executor",
      request: asWorkerProtocolMessage(request),
      response: asWorkerProtocolMessage(runFixedWorkerRequest(request)),
    })
  },
  source(generation) {
    return [
      'import {runFixedWorkerRequest} from "@nodes/worker/fixed/executor"',
      'import {FIXED_WORKER_STORY_GRAPH} from "../fixtures/fixed.ts"',
      "",
      `const fixedRequest = {type: "layout", requestId: ${generation}, generation: ${generation}, graph: FIXED_WORKER_STORY_GRAPH} as const`,
      "const fixedResponse = runFixedWorkerRequest(fixedRequest)",
    ].join("\n")
  },
})
