import type {TopDownLayoutGraph} from "@nodes/layout/top-down"

export const DAGRE_LAYERED_WORKER_STORY_GRAPH: TopDownLayoutGraph = Object.freeze({
  nodes: [
    {id: "source", width: 150, height: 72},
    {id: "normalize", width: 168, height: 80},
    {id: "validate", width: 168, height: 80},
    {id: "publish", width: 150, height: 72},
  ],
  ports: [
    {id: "source/out-normalize", nodeId: "source", x: 50},
    {id: "source/out-validate", nodeId: "source", x: 100},
    {id: "normalize/in", nodeId: "normalize", x: 84},
    {id: "normalize/out", nodeId: "normalize", x: 84},
    {id: "validate/in", nodeId: "validate", x: 84},
    {id: "validate/out", nodeId: "validate", x: 84},
    {id: "publish/in-normalize", nodeId: "publish", x: 50},
    {id: "publish/in-validate", nodeId: "publish", x: 100},
  ],
  edges: [
    {
      id: "source-normalize",
      sourcePortId: "source/out-normalize",
      targetPortId: "normalize/in",
    },
    {
      id: "source-validate",
      sourcePortId: "source/out-validate",
      targetPortId: "validate/in",
    },
    {
      id: "normalize-publish",
      sourcePortId: "normalize/out",
      targetPortId: "publish/in-normalize",
    },
    {
      id: "validate-publish",
      sourcePortId: "validate/out",
      targetPortId: "publish/in-validate",
    },
  ],
  layoutOptions: {nodeSpacing: 32, layerSpacing: 56, edgeSpacing: 12, padding: 24},
})
