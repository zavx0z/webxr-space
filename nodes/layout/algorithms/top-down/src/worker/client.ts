import type {TopDownLayoutOutput} from "@nodes/layout/top-down"
import type {TopDownInput} from "@nodes/layout/types"
import {WorkerTransportClient} from "../../../../execution/worker/src/transport.ts"
import type {
  TopDownWorkerEndpoint,
  TopDownWorkerFailure,
  TopDownWorkerSuccess,
} from "../../../../execution/worker/src/types/worker.ts"

/** Main-thread client for the physically separate top-down policy Worker. */
export class TopDownWorkerClient extends WorkerTransportClient<
  TopDownInput,
  TopDownLayoutOutput,
  never,
  TopDownWorkerFailure["error"]
> {
  constructor(endpoint: TopDownWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{
    generation: number
    graph: TopDownInput
  }>): Promise<TopDownWorkerSuccess> {
    return super.layout(input)
  }
}
