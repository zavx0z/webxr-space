import type {FixedLayoutGraph} from "@nodes/layout/fixed"

export const FIXED_WORKER_STORY_GRAPH: FixedLayoutGraph = Object.freeze({
  viewport: {width: 900, height: 600},
  layoutOptions: {spacing: 28, layerSpacing: 28, padding: 28, clearance: 28},
  nodes: [
    {id: "source", width: 180, height: 100},
    {id: "target", width: 180, height: 100},
  ],
  ports: [
    {id: "source/out", nodeId: "source", y: 50},
    {id: "target/in", nodeId: "target", y: 50},
  ],
  edges: [{id: "value", sourcePortId: "source/out", targetPortId: "target/in"}],
})
