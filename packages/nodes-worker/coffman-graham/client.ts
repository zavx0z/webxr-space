import type {
  CoffmanGrahamLayoutGraph,
  CoffmanGrahamLayoutResult,
} from "@nodes/layout/coffman-graham"
import {WorkerTransportClient} from "../transport.ts"
import type {
  CoffmanGrahamWorkerEndpoint,
  CoffmanGrahamWorkerFailure,
  CoffmanGrahamWorkerSuccess,
} from "../types/worker.ts"

/** Main-thread client for the physically separate Coffman–Graham Worker. */
export class CoffmanGrahamWorkerClient extends WorkerTransportClient<
  CoffmanGrahamLayoutGraph,
  CoffmanGrahamLayoutResult,
  never,
  CoffmanGrahamWorkerFailure["error"]
> {
  constructor(endpoint: CoffmanGrahamWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{
    generation: number
    graph: CoffmanGrahamLayoutGraph
  }>): Promise<CoffmanGrahamWorkerSuccess> {
    return super.layout(input)
  }
}
