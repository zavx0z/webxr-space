import {describe, expect, test} from "bun:test"
import {
  layoutAdaptiveWithDiagnostics,
  type AdaptiveLayoutGraph,
} from "@nodes/layout/adaptive"
import {AdaptiveWorkerClient} from "./adaptive/client.ts"
import {runAdaptiveWorkerRequest} from "./adaptive/executor.ts"
import {WorkerRemoteError} from "./transport.ts"
import type {
  AdaptiveWorkerEndpoint,
  AdaptiveWorkerRequest,
  AdaptiveWorkerResponse,
  SerializedAdaptiveLayoutError,
} from "./types/worker.ts"

const graph = (): AdaptiveLayoutGraph => ({
  viewport: {width: 900, height: 600},
  layoutOptions: {spacing: 28, layerSpacing: 28, padding: 28, clearance: 28},
  nodes: [
    {id: "source", width: 180, height: 100},
    {id: "target", width: 180, height: 100},
  ],
  ports: [
    {id: "source/io", nodeId: "source", y: 50, capability: "inout", allowedSides: ["WEST", "EAST"]},
    {id: "target/io", nodeId: "target", y: 50, capability: "inout", allowedSides: ["WEST", "EAST"]},
  ],
  edges: [{id: "message", sourcePortId: "source/io", targetPortId: "target/io"}],
})

describe("adaptive layout Worker protocol", () => {
  test("structured-clones geometry and bounded diagnostics", () => {
    const input = graph()
    const response = structuredClone(runAdaptiveWorkerRequest({
      type: "layout",
      requestId: 9,
      generation: 4,
      graph: input,
    }))
    const expected = layoutAdaptiveWithDiagnostics(input)

    expect(response.type).toBe("layout-result")
    if (response.type !== "layout-result") return
    expect(response.result).toEqual(expected.result)
    expect(response.diagnostics).toEqual(expected.diagnostics)
    expect(response.diagnostics.attemptedCandidates).toBeLessThanOrEqual(
      response.diagnostics.candidateBudget,
    )
  })

  test("structured-clones the complete AdaptiveLayoutError witness", async () => {
    const invalid: AdaptiveLayoutGraph = {
      ...graph(),
      ports: graph().ports.map((port) => port.id === "source/io" ? {...port, allowedSides: []} : port),
    }
    const response = structuredClone(runAdaptiveWorkerRequest({
      type: "layout",
      requestId: 10,
      generation: 5,
      graph: invalid,
    }))

    expect(response.type).toBe("layout-error")
    if (response.type !== "layout-error") return
    expect(response.error.name).toBe("AdaptiveLayoutError")
    expect("code" in response.error ? response.error.code : undefined)
      .toBe("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
    expect("witness" in response.error ? response.error.witness : undefined).toEqual({
      code: "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT",
      reason: "PORT_HAS_NO_ALLOWED_SIDE",
      candidateBudget: 16,
      theoreticalCandidateCount: "0",
      dynamicPortIds: [],
      portId: "source/io",
      attempts: [],
    })

    const endpoint = new AdaptiveFakeWorkerEndpoint()
    const client = new AdaptiveWorkerClient(endpoint)
    const pending = client.layout({graph: invalid, generation: 5})
    endpoint.respond(0)
    try {
      await pending
      throw new Error("Expected adaptive Worker failure")
    } catch (error) {
      expect(error).toBeInstanceOf(WorkerRemoteError)
      const remote = error as WorkerRemoteError<SerializedAdaptiveLayoutError>
      expect(remote.name).toBe("AdaptiveLayoutError")
      expect(remote.serialized.witness.reason).toBe("PORT_HAS_NO_ALLOWED_SIDE")
    } finally {
      client.dispose()
    }
  })
})

class AdaptiveFakeWorkerEndpoint implements AdaptiveWorkerEndpoint {
  readonly requests: AdaptiveWorkerRequest[] = []
  readonly messageListeners = new Set<(event: MessageEvent<AdaptiveWorkerResponse>) => void>()
  readonly errorListeners = new Set<(event: ErrorEvent) => void>()

  postMessage(message: AdaptiveWorkerRequest): void {
    this.requests.push(structuredClone(message))
  }

  addEventListener(type: "message" | "error", listener: ((event: MessageEvent<AdaptiveWorkerResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === "message") this.messageListeners.add(listener as (event: MessageEvent<AdaptiveWorkerResponse>) => void)
    else this.errorListeners.add(listener as (event: ErrorEvent) => void)
  }

  removeEventListener(type: "message" | "error", listener: ((event: MessageEvent<AdaptiveWorkerResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === "message") this.messageListeners.delete(listener as (event: MessageEvent<AdaptiveWorkerResponse>) => void)
    else this.errorListeners.delete(listener as (event: ErrorEvent) => void)
  }

  terminate(): void {}

  respond(index: number): void {
    const response = runAdaptiveWorkerRequest(this.requests[index]!)
    for (const listener of this.messageListeners) {
      listener({data: structuredClone(response)} as MessageEvent<AdaptiveWorkerResponse>)
    }
  }
}
