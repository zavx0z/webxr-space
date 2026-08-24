import {WorkerTransportClient} from "../transport.ts"
import type {
  FixedWorkerEndpoint,
  FixedWorkerFailure,
  FixedWorkerSuccess,
} from "../types/worker.ts"
import type {FixedLayoutGraph, FixedLayoutResult} from "@nodes/layout/fixed"

/** Main-thread client for a physically separate fixed-policy Worker. */
export class FixedWorkerClient extends WorkerTransportClient<
  FixedLayoutGraph,
  FixedLayoutResult,
  never,
  FixedWorkerFailure["error"]
> {
  constructor(endpoint: FixedWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{generation: number; graph: FixedLayoutGraph}>): Promise<FixedWorkerSuccess> {
    return super.layout(input)
  }
}
