import type {FixedLayoutGraph} from "@zavx0z/layout/fixed"
import type {AdaptiveLayoutGraph} from "@zavx0z/layout/adaptive"
import type {TopDownLayoutGraph} from "@zavx0z/layout/top-down"
import type {CoffmanGrahamLayoutGraph} from "@zavx0z/layout/coffman-graham"

export function fixedGraph(direction: "RIGHT" | "DOWN" = "RIGHT", compound = false): FixedLayoutGraph {
  return {
    viewport: direction === "RIGHT" ? {width: 1100, height: 500} : {width: 420, height: 900},
    nodes: [
      ...(compound ? [{id: "group", width: 180, height: 44, contentHeight: 32}] : []),
      {id: "source", width: 180, height: 100, ...(compound ? {parentId: "group"} : {})},
      {id: "target", width: 180, height: 100},
    ],
    ports: [
      {id: "source/out", nodeId: "source", y: 64},
      {id: "target/in", nodeId: "target", y: 64},
    ],
    edges: [{id: "flow", sourcePortId: "source/out", targetPortId: "target/in"}],
    layoutOptions: {spacing: 24, padding: 24, clearance: 24},
  }
}

export function conflictingFixedGraph(): FixedLayoutGraph {
  const graph = fixedGraph()
  return {
    ...graph,
    edges: [
      ...graph.edges,
      {id: "return", sourcePortId: "target/in", targetPortId: "source/out"},
    ],
  }
}

export function adaptiveGraph(compound = false, direction: "RIGHT" | "DOWN" = "RIGHT"): AdaptiveLayoutGraph {
  return {
    viewport: direction === "RIGHT" ? {width: 960, height: 560} : {width: 480, height: 820},
    nodes: [
      ...(compound ? [{id: "group", width: 176, height: 58, contentHeight: 38}] : []),
      {id: "source", width: 168, height: 94},
      {id: "target-a", width: 176, height: 94, ...(compound ? {parentId: "group"} : {})},
      {id: "target-b", width: 160, height: 94, ...(compound ? {parentId: "group"} : {})},
    ],
    ports: [
      {id: "source/shared", nodeId: "source", y: 66, capability: "inout", allowedSides: ["WEST", "EAST"]},
      {id: "target-a/in", nodeId: "target-a", y: 66, capability: "in", allowedSides: ["WEST"]},
      {id: "target-b/in", nodeId: "target-b", y: 66, capability: "in", allowedSides: ["WEST"]},
    ],
    edges: [
      {id: "to-a", sourcePortId: "source/shared", targetPortId: "target-a/in"},
      {id: "to-b", sourcePortId: "source/shared", targetPortId: "target-b/in"},
    ],
    layoutOptions: {spacing: 24, padding: 24, clearance: 24},
  }
}

export function invalidAdaptiveGraph(): AdaptiveLayoutGraph {
  const graph = adaptiveGraph()
  return {...graph, ports: graph.ports.map((port, index) => index === 0 ? {...port, allowedSides: []} : port)}
}

export function topDownGraph(cycle = false): TopDownLayoutGraph {
  return {
    nodes: [
      {id: "source", width: 180, height: 80},
      {id: "left", width: 160, height: 72},
      {id: "right", width: 160, height: 72},
    ],
    ports: [
      {id: "source/out-left", nodeId: "source", x: 60},
      {id: "source/out-right", nodeId: "source", x: 120},
      {id: "left/in", nodeId: "left", x: 80},
      {id: "right/in", nodeId: "right", x: 80},
      ...(cycle ? [
        {id: "left/out", nodeId: "left", x: 80},
        {id: "source/in", nodeId: "source", x: 90},
      ] : []),
    ],
    edges: [
      {id: "to-left", sourcePortId: "source/out-left", targetPortId: "left/in"},
      {id: "to-right", sourcePortId: "source/out-right", targetPortId: "right/in"},
      ...(cycle ? [{id: "return", sourcePortId: "left/out", targetPortId: "source/in"}] : []),
    ],
    layoutOptions: {nodeSpacing: 32, layerSpacing: 64, edgeSpacing: 16, padding: 24},
  }
}

export function coffmanGrahamGraph(maxNodesPerLayer = 3, cycle = false): CoffmanGrahamLayoutGraph {
  const graph = topDownGraph(cycle)
  return {
    ...graph,
    nodes: [...graph.nodes, {id: "middle", width: 160, height: 72}],
    ports: [
      ...graph.ports,
      {id: "source/out-middle", nodeId: "source", x: 90},
      {id: "middle/in", nodeId: "middle", x: 80},
    ],
    edges: [...graph.edges, {id: "to-middle", sourcePortId: "source/out-middle", targetPortId: "middle/in"}],
    layoutOptions: {...graph.layoutOptions, maxNodesPerLayer},
  }
}
