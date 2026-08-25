import {runAdaptiveWorkerRequest} from "@nodes/worker/adaptive/executor"
import {runFixedWorkerRequest} from "@nodes/worker/fixed/executor"
import {adaptiveWorkerFixture, fixedWorkerFixture} from "./worker-fixture.ts"

const requestView = requiredElement("worker-request", HTMLPreElement)
const responseView = requiredElement("worker-response", HTMLPreElement)
const status = requiredElement("worker-status", HTMLOutputElement)
let generation = 0

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-policy]")) {
  button.addEventListener("click", () => run(button.dataset.policy === "adaptive" ? "adaptive" : "fixed"))
}

run("fixed")
document.documentElement.dataset.nodesStorybook = "ready"

function run(policy: "fixed" | "adaptive"): void {
  generation += 1
  if (policy === "fixed") {
    const request = {type: "layout" as const, requestId: generation, generation, graph: fixedWorkerFixture()}
    publish(policy, request, runFixedWorkerRequest(request))
    return
  }
  const request = {type: "layout" as const, requestId: generation, generation, graph: adaptiveWorkerFixture()}
  publish(policy, request, runAdaptiveWorkerRequest(request))
}

function publish(policy: "fixed" | "adaptive", request: unknown, response: Readonly<{type: string}>): void {
  requestView.textContent = JSON.stringify(request, null, 2)
  responseView.textContent = JSON.stringify(response, null, 2)
  status.value = `${policy} · generation ${generation} · ${response.type}`
  document.documentElement.dataset.workerPolicy = policy
  document.documentElement.dataset.workerGeneration = String(generation)
  document.documentElement.dataset.workerResponse = response.type
}

function requiredElement<T extends HTMLElement>(
  id: string,
  constructor: abstract new (...args: never[]) => T,
): T {
  const element = document.getElementById(id)
  if (!(element instanceof constructor)) throw new Error(`Layout Worker storybook element is missing: ${id}`)
  return element
}
