import type {
  AdaptiveLayoutDiagnostics,
  AdaptiveLayoutGraph,
  AdaptiveNoLegalSideWitness,
} from "@nodes/layout/adaptive"
import type {FixedLayoutGraph, FixedLayoutResult} from "@nodes/layout/fixed"
import type {
  TopDownCycleWitness,
  TopDownLayoutGraph,
  TopDownLayoutResult,
} from "@nodes/layout/top-down"
import type {LayoutResult} from "@nodes/layout/types"

/** Policy-neutral request envelope for one long-lived layout Worker. */
export type WorkerRequest<Graph = FixedLayoutGraph> = Readonly<{
  type: "layout"
  requestId: number
  generation: number
  graph: Graph
}>

/** Policy-neutral success envelope; a policy may add structured diagnostics. */
export type WorkerSuccess<Result = FixedLayoutResult, Diagnostics = never> = Readonly<{
  type: "layout-result"
  requestId: number
  generation: number
  result: Result
}> & ([Diagnostics] extends [never] ? Readonly<Record<never, never>> : Readonly<{
  diagnostics: Diagnostics
}>)

/** Serializable error fields shared by every Worker policy. */
export type SerializedWorkerError = Readonly<{
  name: string
  message: string
}>

/** Serializable form of the adaptive policy's typed failure. */
export type SerializedAdaptiveLayoutError = Readonly<{
  name: "AdaptiveLayoutError"
  message: string
  code: "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"
  witness: AdaptiveNoLegalSideWitness
}>

/** Serializable form of a top-down DAG cycle detected before placement. */
export type SerializedTopDownLayoutError = Readonly<{
  name: "TopDownLayoutError"
  message: string
  code: "CYCLE_DETECTED"
  witness: TopDownCycleWitness
}>

/** Явная вычислительная ошибка без main-thread fallback. */
export type WorkerFailure<Failure = SerializedWorkerError> = Readonly<{
  type: "layout-error"
  requestId: number
  generation: number
  error: Failure
}>

export type WorkerResponse<
  Result = FixedLayoutResult,
  Diagnostics = never,
  Failure = SerializedWorkerError,
> = WorkerSuccess<Result, Diagnostics> | WorkerFailure<Failure>
export type WorkerInput<Graph = FixedLayoutGraph> = Omit<WorkerRequest<Graph>, "type" | "requestId">

/** Минимальная часть browser Worker API, нужная transport adapter. */
export type WorkerEndpoint<
  Request = WorkerRequest,
  Response = WorkerResponse,
> = Readonly<{
  postMessage(message: Request): void
  addEventListener(type: "message", listener: (event: MessageEvent<Response>) => void): void
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void
  removeEventListener(type: "message", listener: (event: MessageEvent<Response>) => void): void
  removeEventListener(type: "error", listener: (event: ErrorEvent) => void): void
  terminate(): void
}>

/** Fixed-policy specializations of the generic worker protocol. */
export type FixedWorkerRequest = WorkerRequest<FixedLayoutGraph>
export type FixedWorkerSuccess = WorkerSuccess<FixedLayoutResult>
export type FixedWorkerFailure = WorkerFailure<SerializedWorkerError>
export type FixedWorkerResponse = FixedWorkerSuccess | FixedWorkerFailure
export type FixedWorkerInput = WorkerInput<FixedLayoutGraph>
export type FixedWorkerEndpoint = WorkerEndpoint<FixedWorkerRequest, FixedWorkerResponse>

/** Adaptive policy contract with structured diagnostics and failure witness. */
export type AdaptiveWorkerRequest = WorkerRequest<AdaptiveLayoutGraph>
export type AdaptiveWorkerSuccess = WorkerSuccess<LayoutResult, AdaptiveLayoutDiagnostics>
export type AdaptiveWorkerFailure = WorkerFailure<
  SerializedWorkerError | SerializedAdaptiveLayoutError
>
export type AdaptiveWorkerResponse = AdaptiveWorkerSuccess | AdaptiveWorkerFailure
export type AdaptiveWorkerInput = WorkerInput<AdaptiveLayoutGraph>
export type AdaptiveWorkerEndpoint = WorkerEndpoint<
  AdaptiveWorkerRequest,
  AdaptiveWorkerResponse
>

/** Top-down policy contract with a typed cycle witness and no fallback. */
export type TopDownWorkerRequest = WorkerRequest<TopDownLayoutGraph>
export type TopDownWorkerSuccess = WorkerSuccess<TopDownLayoutResult>
export type TopDownWorkerFailure = WorkerFailure<
  SerializedWorkerError | SerializedTopDownLayoutError
>
export type TopDownWorkerResponse = TopDownWorkerSuccess | TopDownWorkerFailure
export type TopDownWorkerInput = WorkerInput<TopDownLayoutGraph>
export type TopDownWorkerEndpoint = WorkerEndpoint<
  TopDownWorkerRequest,
  TopDownWorkerResponse
>
