import type {
  TopDownCycleWitness,
  TopDownCurveSegment,
  TopDownEdgeGeometry,
  TopDownLayoutErrorCode,
  TopDownLayoutEdge,
  TopDownLayoutGraph,
  TopDownLayoutResult,
} from "../types/top-down.ts"
import {solveTopDownCurves} from "./top-down/curve-solver.ts"

export type {
  TopDownCycleWitness,
  TopDownCurveSegment,
  TopDownEdgeGeometry,
  TopDownLayoutEdge,
  TopDownLayoutErrorCode,
  TopDownLayoutGraph,
  TopDownLayoutNode,
  TopDownLayoutOptions,
  TopDownLayoutPort,
  TopDownLayoutResult,
  TopDownPortGeometry,
  TopDownPortSide,
} from "../types/top-down.ts"

/**
Typed structural failure detected before top-down placement starts.

The policy has no fallback solver. `witness` identifies the unresolved cycle
without exposing internal ranking or routing state.
*/
export class TopDownLayoutError extends Error {
  override readonly name = "TopDownLayoutError"

  constructor(
    readonly code: TopDownLayoutErrorCode,
    readonly witness: TopDownCycleWitness,
  ) {
    super(`TOP_DOWN_CYCLE_DETECTED: ${witness.nodeIds.join(", ")}`)
  }
}

/**
Calculates one intrinsic flat-DAG scene from top to bottom.

The call is synchronous, deterministic and independent of viewport state.
Source ports leave through `SOUTH`; target ports enter through `NORTH`.

@param graph - Measured leaf rectangles, exact port offsets and semantic edges.

@returns Geometry-only rectangles, endpoints and cubic spline chains.

@throws {@link TopDownLayoutError} when the directed node graph contains a cycle.
@throws `Error` when IDs, dimensions, port offsets or endpoints are invalid.

@example
```ts
const result = layoutTopDown({
  nodes: [
    {id: "root", width: 180, height: 72},
    {id: "leaf", width: 160, height: 64},
  ],
  ports: [
    {id: "root/out", nodeId: "root", x: 90},
    {id: "leaf/in", nodeId: "leaf", x: 80},
  ],
  edges: [{constraint: true, id: "flow", sourcePortId: "root/out", targetPortId: "leaf/in"}],
})
```
*/
export function layoutTopDown(graph: TopDownLayoutGraph): TopDownLayoutResult {
  return solveTopDownCurves(graph, (witness) => new TopDownLayoutError("CYCLE_DETECTED", witness))
}
