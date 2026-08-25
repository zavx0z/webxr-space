import type {TopDownLayoutGraph, TopDownLayoutResult} from "@nodes/layout/top-down"
import {WorkerTransportClient} from "../transport.ts"
import type {
  TopDownWorkerEndpoint,
  TopDownWorkerFailure,
  TopDownWorkerSuccess,
} from "../types/worker.ts"

/** Main-thread client for the physically separate top-down policy Worker. */
export class TopDownWorkerClient extends WorkerTransportClient<
  TopDownLayoutGraph,
  TopDownLayoutResult,
  never,
  TopDownWorkerFailure["error"]
> {
  constructor(endpoint: TopDownWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{
    generation: number
    graph: TopDownLayoutGraph
  }>): Promise<TopDownWorkerSuccess> {
    return super.layout(input)
  }
}
