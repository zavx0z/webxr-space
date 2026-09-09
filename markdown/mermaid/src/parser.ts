/// <reference path="./mermaid-vendor.d.ts" />
import {parseFragment, type DefaultTreeAdapterTypes} from "parse5"
import type {NodeShape} from "@nodes/node/contracts"

export type MermaidGraph = Readonly<{
  direction: "LR" | "RL" | "TB" | "BT"
  nodes: readonly Readonly<{id: string; label: string; shape: NodeShape}>[]
  edges: readonly Readonly<{id: string; from: string; to: string; startArrow: boolean; endArrow: boolean}>[]
}>

type FlowDatabase = Readonly<{
  getVertices(): Map<string, Readonly<{id: string; text: string; type?: string}>>
  getEdges(): readonly Readonly<{start: string; end: string; type: string; text?: string; stroke?: string}>[]
  getDirection(): string
  getSubGraphs(): readonly unknown[]
}>

let queue: Promise<unknown> = Promise.resolve()
let initialized = false

/** Uses Mermaid's own flowchart parser. No Mermaid SVG or native DOM renderer is invoked. */
export function parseMermaidFlowchart(source: string): Promise<MermaidGraph> {
  const result = queue.then(async () => {
    if (source.length > 50_000) throw new Error("Mermaid: диаграмма превышает 50 000 символов")
    const {default: mermaid} = await import("mermaid/dist/mermaid.esm.mjs")
    if (!initialized) {
      mermaid.initialize({startOnLoad: false, securityLevel: "strict", maxTextSize: 50_000, maxEdges: 128, flowchart: {htmlLabels: false}})
      initialized = true
    }
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(source)
    if (!diagram.type.startsWith("flowchart")) throw new Error(`Mermaid: пока поддерживаются flowchart, получено ${diagram.type}`)
    const db = diagram.db as unknown as FlowDatabase
    if (db.getSubGraphs().length) throw new Error("Mermaid: отображение subgraph пока не поддерживается")
    const direction = db.getDirection() === "TD" ? "TB" : db.getDirection()
    if (direction !== "LR" && direction !== "RL" && direction !== "TB" && direction !== "BT") {
      throw new Error(`Mermaid: направление ${direction} не поддерживается`)
    }
    const nodes = [...db.getVertices().values()].map(vertex => Object.freeze({id: vertex.id, label: plainText(vertex.text || vertex.id), shape: nodeShape(vertex.type)}))
    if (nodes.length > 128) throw new Error("Mermaid: поддерживается до 128 нод")
    const edges = db.getEdges().map((edge, index) => {
      if (edge.text) throw new Error("Mermaid: подписи связей пока не поддерживаются")
      if (edge.stroke && edge.stroke !== "normal") throw new Error(`Mermaid: стиль связи ${edge.stroke} пока не поддерживается`)
      if (!["arrow_point", "double_arrow_point", "arrow_open"].includes(edge.type)) throw new Error(`Mermaid: наконечник ${edge.type} пока не поддерживается`)
      return Object.freeze({id: `edge-${index}`, from: edge.start, to: edge.end, startArrow: edge.type === "double_arrow_point", endArrow: edge.type !== "arrow_open"})
    })
    return Object.freeze({direction, nodes: Object.freeze(nodes), edges: Object.freeze(edges)})
  })
  queue = result.catch(() => undefined)
  return result
}

function nodeShape(type: string | undefined): NodeShape {
  if (type === undefined || type === "square" || type === "rect" || type === "round") return "rectangle"
  if (type === "circle") return "circle"
  if (type === "ellipse" || type === "stadium") return "oval"
  throw new Error(`Mermaid: форма ${type} пока не поддерживается`)
}

function plainText(source: string): string {
  const read = (node: DefaultTreeAdapterTypes.ChildNode): string => {
    if (node.nodeName === "#text") return (node as DefaultTreeAdapterTypes.TextNode).value
    if ("tagName" in node && node.tagName === "br") return "\n"
    return "childNodes" in node ? node.childNodes.map(read).join("") : ""
  }
  return parseFragment(source).childNodes.map(read).join("")
}
