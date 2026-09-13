import {WorkerTransportClient} from "../../../../execution/worker/src/transport.ts"
import type {
  FixedWorkerEndpoint,
  FixedWorkerFailure,
  FixedWorkerSuccess,
} from "../../../../execution/worker/src/types/worker.ts"
import type {FixedLayoutInput, FixedLayoutOutput} from "@nodes/layout/fixed"

/** Main-thread client for a physically separate fixed-policy Worker. */
export class FixedWorkerClient extends WorkerTransportClient<
  FixedLayoutInput,
  FixedLayoutOutput,
  never,
  FixedWorkerFailure["error"]
> {
  constructor(endpoint: FixedWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{generation: number; graph: FixedLayoutInput}>): Promise<FixedWorkerSuccess> {
    return super.layout(input)
  }
}
