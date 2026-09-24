import {runCoffmanGrahamWorkerRequest} from "@nodes/layout/worker/coffman-graham/executor"
const scope = globalThis as unknown as {
  postMessage?: (message: ReturnType<typeof runCoffmanGrahamWorkerRequest>) => void
  addEventListener(type: "message", listener: (event: MessageEvent<Parameters<typeof runCoffmanGrahamWorkerRequest>[0]>) => void): void
}
if (typeof scope.postMessage === "function") {
  scope.addEventListener("message", event => scope.postMessage!(runCoffmanGrahamWorkerRequest(event.data)))
}
