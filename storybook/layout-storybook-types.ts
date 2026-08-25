import type {LayoutResult} from "@nodes/layout/types"
import type {AdaptiveLayoutGraph} from "@nodes/layout/adaptive"

export type StorybookOrientation = "RIGHT" | "DOWN"
export type StorybookPolicyId = "fixed" | "adaptive"

export type StorybookFixture = Readonly<{
  id: string
  family: string
  policyId: StorybookPolicyId
  label: string
  description: string
  expectedDirection: StorybookOrientation
  graph: AdaptiveLayoutGraph
}>

export type StorybookPolicyOutcome = Readonly<{
  result: LayoutResult
  diagnostics: unknown
}>

export type StorybookPolicy = Readonly<{
  id: StorybookPolicyId
  label: string
  description: string
  run(graph: AdaptiveLayoutGraph): StorybookPolicyOutcome
}>

export type StorybookMetrics = Readonly<{
  direction: LayoutResult["direction"]
  durationMs: number
  nodeCount: number
  compoundCount: number
  portCount: number
  edgeCount: number
  bendCount: number
  gatewayCount: number
  totalManhattan: number
  bounds: LayoutResult["bounds"]
}>

export type StorybookRun = Readonly<{
  policyId: StorybookPolicyId
  input: AdaptiveLayoutGraph
  result: LayoutResult
  policyDiagnostics: unknown
  metrics: StorybookMetrics
  svg: string
}>
