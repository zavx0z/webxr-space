import type {TopDownLayoutGraph} from "@nodes/layout/top-down"

export const TOP_DOWN_REFERENCE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "scr-area": "ScrArea\nArea — место под Editor",
  "space-type": "SpaceType\nтип редактора",
  "a-region": "ARegion",
  "space-link": "SpaceLink / SpaceNode\nсостояние экземпляра Editor",
  "header": "HEADER",
  "tools": "TOOLS — Toolbar",
  "ui-sidebar": "UI — Sidebar",
  "window": "WINDOW — основная область",
  "panel-type": "PanelType\nрегистрация и callbacks",
  "panel": "Panel\nruntime-экземпляр секции",
  "ui-block-panel": "ui::Block",
  "ui-layout-panel": "ui::Layout\nrow · column · box · grid · split",
  "node-draw-space": "node_draw_space()",
  "b-node-tree": "bNodeTree",
  "b-node": "bNode",
  "b-node-socket-link": "bNodeSocket / bNodeLink",
  "ui-block-node": "ui::Block каждого видимого node",
  "ui-layout-node": "ui::Layout controls и sockets",
  "ui-button": "ui::Button\ninput · toggle · menu",
})

const nodes = [
  {id: "scr-area", width: 300, height: 86},
  {id: "space-type", width: 220, height: 76},
  {id: "a-region", width: 150, height: 68},
  {id: "space-link", width: 320, height: 92},
  {id: "header", width: 140, height: 62},
  {id: "tools", width: 230, height: 62},
  {id: "ui-sidebar", width: 190, height: 62},
  {id: "window", width: 280, height: 76},
  {id: "panel-type", width: 280, height: 82},
  {id: "panel", width: 250, height: 82},
  {id: "ui-block-panel", width: 160, height: 62},
  {id: "ui-layout-panel", width: 310, height: 86},
  {id: "node-draw-space", width: 230, height: 62},
  {id: "b-node-tree", width: 170, height: 62},
  {id: "b-node", width: 130, height: 62},
  {id: "b-node-socket-link", width: 300, height: 62},
  {id: "ui-block-node", width: 270, height: 76},
  {id: "ui-layout-node", width: 270, height: 76},
  {id: "ui-button", width: 260, height: 76},
] as const

const links = [
  ["scr-area", "space-type"],
  ["scr-area", "a-region"],
  ["scr-area", "space-link"],
  ["space-type", "header"],
  ["a-region", "tools"],
  ["a-region", "ui-sidebar"],
  ["a-region", "window"],
  ["ui-sidebar", "panel-type"],
  ["panel-type", "panel"],
  ["panel", "ui-block-panel"],
  ["ui-block-panel", "ui-layout-panel"],
  ["ui-layout-panel", "ui-button"],
  ["window", "node-draw-space"],
  ["node-draw-space", "b-node-tree"],
  ["space-link", "b-node-tree"],
  ["b-node-tree", "b-node"],
  ["b-node-tree", "b-node-socket-link"],
  ["b-node", "ui-block-node"],
  ["ui-block-node", "ui-layout-node"],
  ["ui-layout-node", "ui-button"],
] as const

const widthById = new Map<string, number>(nodes.map(({id, width}) => [id, width]))
const portById = new Map<string, TopDownLayoutGraph["ports"][number]>()
const edges = links.map(([source, target], index) => {
  const sourcePortId = sourcePort(index, source)
  const targetPortId = targetPort(index, target)
  registerPort(sourcePortId, source, sourceRatio(index))
  registerPort(targetPortId, target, targetRatio(index))
  return {
    id: `flow-${String(index + 1).padStart(2, "0")}-${source}-${target}`,
    sourcePortId,
    targetPortId,
  }
})

export const TOP_DOWN_REFERENCE_GRAPH: TopDownLayoutGraph = Object.freeze({
  nodes,
  ports: [...portById.values()],
  edges,
  layoutOptions: {nodeSpacing: 50, layerSpacing: 50, edgeSpacing: 20, padding: 8},
})

function sourcePort(index: number, nodeId: string): string {
  return [0, 1, 2, 4, 5, 6, 15, 16].includes(index) ? `${nodeId}/out/${index}` : `${nodeId}/out`
}

function targetPort(index: number, nodeId: string): string {
  return [11, 13, 14, 19].includes(index) ? `${nodeId}/in/${index}` : `${nodeId}/in`
}

function sourceRatio(index: number): number {
  return ({0: 0.2, 1: 0.5, 2: 0.74, 4: 0.2, 5: 0.5, 6: 0.8, 15: 0.35, 16: 0.65} as Record<number, number>)[index] ?? 0.5
}

function targetRatio(index: number): number {
  return ({11: 0.35, 13: 0.8, 14: 0.2, 19: 0.65} as Record<number, number>)[index] ?? 0.5
}

function registerPort(id: string, nodeId: string, ratio: number): void {
  if (portById.has(id)) return
  portById.set(id, {id, nodeId, x: widthById.get(nodeId)! * ratio})
}
