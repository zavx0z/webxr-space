import {describe, expect, test} from "bun:test"
import {layoutTopDown, type TopDownLayoutGraph} from "@nodes/layout/top-down"
import {TopDownWorkerClient} from "./top-down/client.ts"
import {runTopDownWorkerRequest} from "./top-down/executor.ts"
import {WorkerRemoteError} from "./transport.ts"
import type {
  SerializedTopDownLayoutError,
  TopDownWorkerEndpoint,
  TopDownWorkerRequest,
  TopDownWorkerResponse,
} from "./types/worker.ts"

const graph = (): TopDownLayoutGraph => ({
  nodes: [{id: "source", width: 120, height: 60}, {id: "target", width: 100, height: 50}],
  ports: [
    {id: "source/out", nodeId: "source", x: 60},
    {id: "target/in", nodeId: "target", x: 50},
  ],
  edges: [{id: "flow", sourcePortId: "source/out", targetPortId: "target/in"}],
})

describe("top-down layout Worker protocol", () => {
  test("structured-clones the exact isolated policy result", () => {
    const input = graph()
    const response = structuredClone(runTopDownWorkerRequest({
      type: "layout",
      requestId: 1,
      generation: 7,
      graph: input,
    }))

    expect(response.type).toBe("layout-result")
    if (response.type !== "layout-result") return
    expect(response.result).toEqual(layoutTopDown(input))
    expect(response.generation).toBe(7)
  })

  test("preserves the complete cycle witness through transport", async () => {
    const cyclic: TopDownLayoutGraph = {
      nodes: [{id: "a", width: 80, height: 40}, {id: "b", width: 80, height: 40}],
      ports: [
        {id: "a/in", nodeId: "a", x: 40},
        {id: "a/out", nodeId: "a", x: 40},
        {id: "b/in", nodeId: "b", x: 40},
        {id: "b/out", nodeId: "b", x: 40},
      ],
      edges: [
        {id: "a-b", sourcePortId: "a/out", targetPortId: "b/in"},
        {id: "b-a", sourcePortId: "b/out", targetPortId: "a/in"},
      ],
    }
    const endpoint = new TopDownFakeWorkerEndpoint()
    const client = new TopDownWorkerClient(endpoint)
    const pending = client.layout({graph: cyclic, generation: 8})
    endpoint.respond(0)
    try {
      await pending
      throw new Error("Expected top-down Worker failure")
    } catch (error) {
      expect(error).toBeInstanceOf(WorkerRemoteError)
      const remote = error as WorkerRemoteError<SerializedTopDownLayoutError>
      expect(remote.serialized.code).toBe("CYCLE_DETECTED")
      expect(remote.serialized.witness).toEqual({nodeIds: ["a", "b"], edgeIds: ["a-b", "b-a"]})
    } finally {
      client.dispose()
    }
  })
})

class TopDownFakeWorkerEndpoint implements TopDownWorkerEndpoint {
  readonly requests: TopDownWorkerRequest[] = []
  readonly messageListeners = new Set<(event: MessageEvent<TopDownWorkerResponse>) => void>()
  readonly errorListeners = new Set<(event: ErrorEvent) => void>()

  postMessage(message: TopDownWorkerRequest): void {
    this.requests.push(structuredClone(message))
  }

  addEventListener(type: "message" | "error", listener: ((event: MessageEvent<TopDownWorkerResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === "message") this.messageListeners.add(listener as (event: MessageEvent<TopDownWorkerResponse>) => void)
    else this.errorListeners.add(listener as (event: ErrorEvent) => void)
  }

  removeEventListener(type: "message" | "error", listener: ((event: MessageEvent<TopDownWorkerResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === "message") this.messageListeners.delete(listener as (event: MessageEvent<TopDownWorkerResponse>) => void)
    else this.errorListeners.delete(listener as (event: ErrorEvent) => void)
  }

  terminate(): void {}

  respond(index: number): void {
    const response = runTopDownWorkerRequest(this.requests[index]!)
    for (const listener of this.messageListeners) {
      listener({data: structuredClone(response)} as MessageEvent<TopDownWorkerResponse>)
    }
  }
}
