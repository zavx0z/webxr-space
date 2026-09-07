import {layoutFixed} from "@zavx0z/layout/fixed"
import {FixedWorkerClient} from "@zavx0z/layout/worker/fixed/client"
import {WorkerRemoteError} from "@zavx0z/layout/worker/transport"
import type {FixedWorkerEndpoint, FixedWorkerRequest, FixedWorkerResponse} from "@zavx0z/layout/worker/types"
import {fixedGraph} from "./fixtures.ts"
import type {LayoutReport} from "./reports.ts"

/** Controlled endpoint for transport fault injection; never called a real Worker. */
class ControlledEndpoint implements FixedWorkerEndpoint {
  readonly messages: FixedWorkerRequest[] = []
  readonly listeners = new Map<string, Set<(event: never) => void>>()
  terminated = false
  failPost = false

  postMessage(message: FixedWorkerRequest): void {
    if (this.failPost) throw new Error("Проба: postMessage отказал")
    this.messages.push(message)
  }

  addEventListener(type: "message", listener: (event: MessageEvent<FixedWorkerResponse>) => void): void
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void
  addEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: "message", listener: (event: MessageEvent<FixedWorkerResponse>) => void): void
  removeEventListener(type: "error", listener: (event: ErrorEvent) => void): void
  removeEventListener(type: string, listener: (event: never) => void): void {
    this.listeners.get(type)?.delete(listener)
  }

  terminate(): void {
    this.terminated = true
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event as never)
  }
}

export async function transportFaultReport(route: string): Promise<LayoutReport> {
  const endpoint = new ControlledEndpoint()
  const client = new FixedWorkerClient(endpoint)
  const graph = fixedGraph()
  const errors: Record<string, string> = {}
  try {
    const mismatch = rejected(client.layout({generation: 1, graph}))
    endpoint.emit("message", {data: {type: "layout-result", requestId: 1, generation: 99, result: layoutFixed(graph)}})
    errors.generation = await mismatch

    const remote = client.layout({generation: 2, graph}).then(() => "unexpected-success", error => {
      if (!(error instanceof WorkerRemoteError)) throw error
      return error.message as string
    })
    endpoint.emit("message", {data: {type: "layout-error", requestId: 2, generation: 2, error: {name: "Error", message: "Проба: remote error"}}})
    errors.remote = await remote

    const failedA = rejected(client.layout({generation: 3, graph}))
    const failedB = rejected(client.layout({generation: 4, graph}))
    endpoint.emit("error", {message: "Проба: endpoint error event"})
    errors.errorEventA = await failedA
    errors.errorEventB = await failedB

    endpoint.failPost = true
    errors.postMessage = await rejected(client.layout({generation: 5, graph}))
  } finally {
    client.dispose()
  }
  const listenerCount = [...endpoint.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0)
  if (Object.values(errors).some(value => value === "unexpected-success") || !endpoint.terminated || listenerCount !== 0) {
    throw new Error("Проверка transport fault lifecycle не завершена")
  }
  return {
    route,
    title: "Worker transport · контролируемые отказы",
    description: "Управляемый endpoint намеренно подаёт неверное поколение, remote error, error event и отказ postMessage в настоящий FixedWorkerClient. Это проверка transport через test double; отдельный Worker показывается в соседнем варианте.",
    status: "result",
    input: {endpoint: "controlled test double", generations: [1, 2, 3, 4, 5]},
    output: {errors, terminated: endpoint.terminated, listenerCount, requestIds: endpoint.messages.map(message => message.requestId)},
    summary: Object.entries(errors).map(([name, message]) => `${name}: ${message}`).concat(`terminate: ${endpoint.terminated} · оставшиеся listeners: ${listenerCount}`),
    source: "const endpoint = new ControlledEndpoint()\nconst client = new FixedWorkerClient(endpoint)\nconst pending = client.layout({generation: 1, graph})\nendpoint.emit(\"message\", {data: wrongGenerationResponse})\nawait pending.catch(error => error.message)\nclient.dispose()",
  }
}

function rejected(pending: Promise<unknown>): Promise<string> {
  return pending.then(() => "unexpected-success", error => error instanceof Error ? error.message : String(error))
}
