import {WorkerTransportClient} from "../../../../execution/worker/src/transport.ts"
import type {
  AdaptiveWorkerEndpoint,
  AdaptiveWorkerFailure,
  AdaptiveWorkerSuccess,
} from "../../../../execution/worker/src/types/worker.ts"
import type {AdaptiveLayoutInput, AdaptiveLayoutOutput} from "@nodes/layout/adaptive"
import type {AdaptiveLayoutDiagnostics} from "@nodes/layout/adaptive/types"

/** Main-thread client for a physically separate adaptive-policy Worker. */
export class AdaptiveWorkerClient extends WorkerTransportClient<
  AdaptiveLayoutInput,
  AdaptiveLayoutOutput,
  AdaptiveLayoutDiagnostics,
  AdaptiveWorkerFailure["error"]
> {
  constructor(endpoint: AdaptiveWorkerEndpoint) {
    super(endpoint)
  }

  override layout(input: Readonly<{generation: number; graph: AdaptiveLayoutInput}>): Promise<AdaptiveWorkerSuccess> {
    return super.layout(input)
  }
}
