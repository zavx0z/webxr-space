import {runFixedWorkerRequest} from "@nodes/layout/worker/fixed/executor"
const scope = globalThis as unknown as {
  postMessage?: (message: ReturnType<typeof runFixedWorkerRequest>) => void
  addEventListener(type: "message", listener: (event: MessageEvent<Parameters<typeof runFixedWorkerRequest>[0]>) => void): void
}
if (typeof scope.postMessage === "function") {
  scope.addEventListener("message", event => scope.postMessage!(runFixedWorkerRequest(event.data)))
}
