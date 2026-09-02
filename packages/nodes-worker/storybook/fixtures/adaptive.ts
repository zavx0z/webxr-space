import type {AdaptiveLayoutGraph} from "@nodes/layout/adaptive"

export const ADAPTIVE_WORKER_STORY_GRAPH: AdaptiveLayoutGraph = Object.freeze({
  viewport: {width: 900, height: 600},
  layoutOptions: {spacing: 28, layerSpacing: 28, padding: 28, clearance: 28},
  nodes: [
    {id: "source", width: 180, height: 100},
    {id: "target", width: 180, height: 100},
  ],
  ports: [
    {
      id: "source/io",
      nodeId: "source",
      y: 50,
      capability: "inout",
      allowedSides: ["WEST", "EAST"],
    },
    {
      id: "target/io",
      nodeId: "target",
      y: 50,
      capability: "inout",
      allowedSides: ["WEST", "EAST"],
    },
  ],
  edges: [{id: "value", sourcePortId: "source/io", targetPortId: "target/io"}],
})
