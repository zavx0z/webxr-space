import type {LayoutPort, LayoutPortSide} from "../../../protocol/types/src/protocol.ts"

/** Семантическая возможность сокета относительно ролей связи. */
export type AdaptivePortCapability = "in" | "out" | "inout"

/** Измеренный сокет и стороны, которые может выбрать adaptive policy. */
export type AdaptiveLayoutPort = Readonly<LayoutPort & {
  capability: AdaptivePortCapability
  allowedSides: readonly LayoutPortSide[]
}>

export type AdaptiveSideAssignment = Readonly<{
  portId: string
  side: LayoutPortSide
}>

export type AdaptiveLayoutDiagnostics = Readonly<{
  candidateBudget: number
  theoreticalCandidateCount: string
  fixedPortCount: number
  dynamicPortCount: number
  generatedCandidates: number
  attemptedCandidates: number
  routableCandidates: number
  rejectedCandidates: number
  selectedSides: readonly AdaptiveSideAssignment[]
}>

export type AdaptiveCandidateFailure = Readonly<{
  sides: readonly AdaptiveSideAssignment[]
  error: string
}>

export type AdaptiveNoLegalSideWitness = Readonly<{
  code: "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"
  reason: "PORT_HAS_NO_ALLOWED_SIDE" | "CAPABILITY_ROLE_CONFLICT" | "NO_ROUTABLE_ASSIGNMENT"
  candidateBudget: number
  theoreticalCandidateCount: string
  dynamicPortIds: readonly string[]
  portId?: string
  edgeId?: string
  role?: "source" | "target"
  attempts: readonly AdaptiveCandidateFailure[]
}>
