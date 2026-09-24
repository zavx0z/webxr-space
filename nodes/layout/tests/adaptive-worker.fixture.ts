import {runAdaptiveWorkerRequest} from "@nodes/layout/worker/adaptive/executor"
const scope = globalThis as unknown as {
  postMessage?: (message: ReturnType<typeof runAdaptiveWorkerRequest>) => void
  addEventListener(type: "message", listener: (event: MessageEvent<Parameters<typeof runAdaptiveWorkerRequest>[0]>) => void): void
}
if (typeof scope.postMessage === "function") {
  scope.addEventListener("message", event => scope.postMessage!(runAdaptiveWorkerRequest(event.data)))
}
