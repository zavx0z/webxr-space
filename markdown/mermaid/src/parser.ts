/// <reference path="../types/mermaid-vendor.d.ts" />
import {parseFragment, type DefaultTreeAdapterTypes} from "parse5"
import type {NodeShape} from "@nodes/node/contracts"
import type {MermaidGraph} from "../types/graph.ts"
import type {FlowDatabase} from "../types/parser.ts"

let queue: Promise<unknown> = Promise.resolve()
let initialized = false

/**
Последовательно разбирает flowchart официальным Mermaid parser и нормализует модель для GraphView.
Библиотека загружается по первому вызову; SVG и native DOM renderer не запускаются.
Ошибка одного запроса не останавливает очередь следующих разборов.

@param source - Mermaid-код без Markdown-ограждения, не длиннее 50 000 UTF-16 code units.

@returns Promise замороженного графа с поддержанными формами и связями.

@throws Promise отклоняется при ошибке Mermaid, превышении 128 узлов,
subgraph, неподдержанном направлении, форме, подписи или стиле связи.

@example
```ts
const graph = await parseMermaidFlowchart("flowchart LR\nA --> B")
```
*/
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

/**
Переводит поддержанные формы Mermaid в контракт DiagramNode.
Отсутствующая форма, square, rect и round дают rectangle; stadium даёт oval.

@param type - Имя формы из базы Mermaid или undefined для стандартной формы.

@throws Error для форм вне поддержанного набора.

@returns rectangle для прямоугольных форм, circle для круга и oval для ellipse/stadium.
*/
function nodeShape(type: string | undefined): NodeShape {
  if (type === undefined || type === "square" || type === "rect" || type === "round") return "rectangle"
  if (type === "circle") return "circle"
  if (type === "ellipse" || type === "stadium") return "oval"
  throw new Error(`Mermaid: форма ${type} пока не поддерживается`)
}

/**
Удаляет HTML-разметку подписи Mermaid через инертный parse5, сохраняя br как перевод строки.

@param source - HTML-подобная подпись из базы Mermaid, предварительно заменённая на id при пустом значении.

@returns Текстовые узлы без тегов с переводами строк на месте br.
*/
function plainText(source: string): string {
  /**
  Рекурсивно собирает текст подписи и явные br, не создавая DOM-элементов приложения.

  @param node - Узел фрагмента parse5; текст возвращается напрямую, br даёт перевод строки, остальные узлы объединяют потомков.
  */
  const read = (node: DefaultTreeAdapterTypes.ChildNode): string => {
    if (node.nodeName === "#text") return (node as DefaultTreeAdapterTypes.TextNode).value
    if ("tagName" in node && node.tagName === "br") return "\n"
    return "childNodes" in node ? node.childNodes.map(read).join("") : ""
  }
  return parseFragment(source).childNodes.map(read).join("")
}
