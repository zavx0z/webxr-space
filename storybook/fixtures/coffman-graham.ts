import type {CoffmanGrahamLayoutGraph} from "@nodes/layout/coffman-graham"

export const COFFMAN_GRAHAM_WORKER_STORY_GRAPH: CoffmanGrahamLayoutGraph = Object.freeze({
  nodes: [
    {id: "ingest", width: 144, height: 68},
    {id: "parse", width: 136, height: 68},
    {id: "validate", width: 152, height: 68},
    {id: "index", width: 136, height: 68},
    {id: "rank", width: 136, height: 68},
    {id: "publish", width: 144, height: 68},
  ],
  ports: [
    {id: "ingest/out-parse", nodeId: "ingest", x: 48},
    {id: "ingest/out-validate", nodeId: "ingest", x: 96},
    {id: "parse/in", nodeId: "parse", x: 68},
    {id: "parse/out", nodeId: "parse", x: 68},
    {id: "validate/in", nodeId: "validate", x: 76},
    {id: "validate/out", nodeId: "validate", x: 76},
    {id: "index/in-parse", nodeId: "index", x: 46},
    {id: "index/in-validate", nodeId: "index", x: 90},
    {id: "index/out", nodeId: "index", x: 68},
    {id: "rank/in", nodeId: "rank", x: 68},
    {id: "rank/out", nodeId: "rank", x: 68},
    {id: "publish/in", nodeId: "publish", x: 72},
  ],
  edges: [
    {id: "ingest-parse", sourcePortId: "ingest/out-parse", targetPortId: "parse/in"},
    {id: "ingest-validate", sourcePortId: "ingest/out-validate", targetPortId: "validate/in"},
    {id: "parse-index", sourcePortId: "parse/out", targetPortId: "index/in-parse"},
    {id: "validate-index", sourcePortId: "validate/out", targetPortId: "index/in-validate"},
    {id: "index-rank", sourcePortId: "index/out", targetPortId: "rank/in"},
    {id: "rank-publish", sourcePortId: "rank/out", targetPortId: "publish/in"},
  ],
  layoutOptions: {
    maxNodesPerLayer: 2,
    nodeSpacing: 28,
    layerSpacing: 48,
    edgeSpacing: 10,
    padding: 24,
  },
})
