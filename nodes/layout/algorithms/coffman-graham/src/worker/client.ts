import type {
  CoffmanGrahamLayoutInput,
  CoffmanGrahamLayoutOutput,
} from "@nodes/layout/coffman-graham"
import {WorkerTransportClient} from "../../../../execution/worker/src/transport.ts"
import type {
  CoffmanGrahamWorkerEndpoint,
  CoffmanGrahamWorkerFailure,
  CoffmanGrahamWorkerSuccess,
} from "../../../../execution/worker/src/types/worker.ts"

/** Main-thread client for the physically separate Coffman–Graham Worker. */
export class CoffmanGrahamWorkerClient extends WorkerTransportClient<
  CoffmanGrahamLayoutInput,
  CoffmanGrahamLayoutOutput,
  never,
  CoffmanGrahamWorkerFailure["error"]
> {
  constructor(endpoint: CoffmanGrahamWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{
    generation: number
    graph: CoffmanGrahamLayoutInput
  }>): Promise<CoffmanGrahamWorkerSuccess> {
    return super.layout(input)
  }
}
