import {WorkerTransportClient} from "../../../../execution/worker/src/transport.ts"
import type {
  AdaptiveWorkerEndpoint,
  AdaptiveWorkerFailure,
  AdaptiveWorkerSuccess,
} from "../../../../execution/worker/src/types/worker.ts"
import type {AdaptiveLayoutDiagnostics, AdaptiveLayoutGraph} from "@nodes/layout/adaptive"
import type {LayoutResult} from "@nodes/layout/types"

/** Main-thread client for a physically separate adaptive-policy Worker. */
export class AdaptiveWorkerClient extends WorkerTransportClient<
  AdaptiveLayoutGraph,
  LayoutResult,
  AdaptiveLayoutDiagnostics,
  AdaptiveWorkerFailure["error"]
> {
  constructor(endpoint: AdaptiveWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{generation: number; graph: AdaptiveLayoutGraph}>): Promise<AdaptiveWorkerSuccess> {
    return super.layout(input)
  }
}
