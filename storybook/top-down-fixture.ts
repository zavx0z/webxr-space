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

const sourceIds = new Set<string>(links.map(([source]) => source))
const targetIds = new Set<string>(links.map(([, target]) => target))
const widthById = new Map(nodes.map(({id, width}) => [id, width]))

export const TOP_DOWN_REFERENCE_GRAPH: TopDownLayoutGraph = Object.freeze({
  nodes,
  ports: nodes.flatMap(({id}) => [
    ...(targetIds.has(id) ? [{id: `${id}/in`, nodeId: id, x: widthById.get(id)! / 2}] : []),
    ...(sourceIds.has(id) ? [{id: `${id}/out`, nodeId: id, x: widthById.get(id)! / 2}] : []),
  ]),
  edges: links.map(([source, target], index) => ({
    id: `flow-${String(index + 1).padStart(2, "0")}-${source}-${target}`,
    sourcePortId: `${source}/out`,
    targetPortId: `${target}/in`,
  })),
  layoutOptions: {nodeSpacing: 44, layerSpacing: 64, edgeSpacing: 14, padding: 28},
})
