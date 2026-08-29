import {
  graphCanvasDefaultProps,
  type GraphCanvasProps,
} from "../../dom/graph-canvas.ts"
import {
  nodeTreeEditorDefaultProps,
  type NodeTreeEditorProps,
} from "../../dom/node-tree-editor.ts"
import type {
  NodeWorkbenchImage,
  NodeWorkbenchProps,
  NodeWorkbenchPopup,
} from "../../dom/node-workbench.ts"
import type {ParameterSocketProps} from "../../dom/parameter-socket.ts"
import {createParameterDomProps} from "./parameter-dom-data.ts"
import type {RemainingDomRoute} from "./remaining-route-catalog.ts"

const EMPTY_POPUP: NodeWorkbenchPopup = Object.freeze({visible: false, label: "", items: Object.freeze([])})
const EMPTY_PARAMETERS: ParameterSocketProps = Object.freeze({
  title: "Parameters",
  width: 420,
  parameters: Object.freeze([]),
})

export function createRemainingDomProps(route: RemainingDomRoute): NodeWorkbenchProps {
  const mode = route === "" || route === "ui" ? "aggregate"
    : route.startsWith("ui/frame") ? "frame"
      : route.startsWith("ui/link") ? "link"
        : route.startsWith("ui/comparison") ? "comparison"
          : "node-editor"
  const graph = graphFor(route)
  const parameters = parametersFor(route)
  const images = imagesFor(route)
  const popup = popupFor(route)
  return Object.freeze({
    title: titleFor(route),
    mode,
    showTree: route === "",
    showGraph: route !== "",
    showParameters: route === "ui" || route.startsWith("ui/node-editor/scene") || route.startsWith("ui/node-editor/popup") || route.startsWith("ui/comparison"),
    tree: treeFor(route),
    graph,
    parameters,
    images,
    popup,
  })
}

function graphFor(route: RemainingDomRoute): GraphCanvasProps {
  if (route.startsWith("ui/frame")) return frameGraph(route)
  if (route.startsWith("ui/link")) return linkGraph(route)
  if (route.startsWith("ui/comparison")) return comparisonGraph(route)
  const collapsed = route.startsWith("ui/node-editor/collapsed")
  const selected = route === "ui/node-editor/collapsed/selected"
  const preview = route.startsWith("ui/node-editor/preview")
  const previewNodeIds = route.endsWith("/multiple") ? ["scalar", "shader"]
    : route.endsWith("/non-previewable") ? [] : ["scalar"]
  const nodes = nodeEditorNodes().map((node) => ({
    ...node,
    label: preview && previewNodeIds.includes(node.id)
      ? `${node.label} · preview`
      : preview && route.endsWith("/non-previewable") && node.id === "transform"
        ? `${node.label} · no preview capability`
        : node.label,
    selected: selected && node.id === "collapsed",
  }))
  const removedLinkId = route.includes("translation-unlinked") ? "scalar-transform"
    : route.includes("color-unlinked") ? "transform-shader" : null
  const links = nodeEditorLinks().filter(({id}) => id !== removedLinkId).map((link) => ({
    ...link,
    selected: false,
    segments: link.segments.map((segment) => ({...segment})),
  }))
  if (route.includes("rotation-linked")) links.push({
    id: "scalar-transform-rotation",
    title: "Shifted Rotation Link",
    selected: false,
    segments: [
      {x1: 300, y1: 150, x2: 330, y2: 150},
      {x1: 330, y1: 150, x2: 330, y2: 190},
      {x1: 330, y1: 190, x2: 340, y2: 190},
    ],
  })
  return Object.freeze({
    title: titleFor(route),
    width: 700,
    height: 500,
    scene: Object.freeze({translateX: 12, translateY: 16, scale: 0.56}),
    frames: Object.freeze([
      Object.freeze({id: "catalog-frame", label: "Система компонентов нод", title: "Catalog Frame", x: 10, y: 10, width: 1080, height: 700, selected: false}),
      Object.freeze({id: "data-frame", label: "Обработка данных", title: "Data Frame", x: 80, y: 320, width: 950, height: 330, selected: false}),
    ]),
    links: Object.freeze(links.map((link) => Object.freeze({...link, segments: Object.freeze(link.segments.map((segment) => Object.freeze(segment)))}))),
    nodes: Object.freeze(nodes.map((node) => Object.freeze(node))),
  })
}

function nodeEditorNodes(): GraphCanvasProps["nodes"] {
  return Object.freeze([
    Object.freeze({id: "scalar", label: "Скалярная математика", title: "Scalar", x: 40, y: 70, width: 260, height: 190, selected: false}),
    Object.freeze({id: "transform", label: "Преобразование", title: "Transform", x: 340, y: 60, width: 250, height: 190, selected: false}),
    Object.freeze({id: "shader", label: "Principled", title: "Shader", x: 720, y: 65, width: 330, height: 210, selected: false}),
    Object.freeze({id: "asset", label: "Ввод ресурса", title: "Asset", x: 130, y: 360, width: 300, height: 210, selected: false}),
    Object.freeze({id: "collapsed", label: "Компактное смешивание", title: "Collapsed", x: 450, y: 420, width: 120, height: 34, selected: false}),
    Object.freeze({id: "matrix", label: "Матричная математика", title: "Matrix", x: 590, y: 350, width: 390, height: 220, selected: false}),
  ])
}

function nodeEditorLinks(): GraphCanvasProps["links"] {
  return Object.freeze([
    link("scalar-transform", "Scalar → Transform", [[300, 150, 340, 150]]),
    link("transform-shader", "Transform → Shader", [[590, 160, 655, 160], [655, 160, 655, 180], [655, 180, 720, 180]]),
    link("asset-matrix", "Asset → Matrix", [[430, 470, 510, 470], [510, 470, 510, 450], [510, 450, 590, 450]]),
    link("matrix-shader", "Matrix → Shader", [[980, 440, 1040, 440], [1040, 440, 1040, 220], [1040, 220, 1050, 220]]),
  ])
}

function link(
  id: string,
  title: string,
  segments: readonly (readonly [number, number, number, number])[],
): GraphCanvasProps["links"][number] {
  return Object.freeze({
    id,
    title,
    selected: false,
    segments: Object.freeze(segments.map(([x1, y1, x2, y2]) => Object.freeze({x1, y1, x2, y2}))),
  })
}

function comparisonGraph(route: RemainingDomRoute): GraphCanvasProps {
  return Object.freeze({
    title: titleFor(route),
    width: 520,
    height: 480,
    scene: Object.freeze({translateX: 20, translateY: 26, scale: 1}),
    frames: Object.freeze([]),
    links: Object.freeze([]),
    nodes: Object.freeze([
      Object.freeze({
        id: "comparison-noise",
        label: "Noise Texture",
        title: "Noise Texture · live DOM",
        x: 120,
        y: 34,
        width: 260,
        height: 350,
        selected: false,
      }),
    ]),
  })
}

function frameGraph(route: RemainingDomRoute): GraphCanvasProps {
  const selected = route.endsWith("/default")
  return Object.freeze({
    title: titleFor(route),
    width: 640,
    height: 480,
    scene: Object.freeze({translateX: 8, translateY: 8, scale: 1}),
    frames: Object.freeze([
      Object.freeze({id: "catalog-frame", label: "Система компонентов нод", title: "Outer Frame", x: 24, y: 24, width: 570, height: 390, selected: false}),
      Object.freeze({id: "data-frame", label: "Обработка данных", title: "Nested Frame", x: 128, y: 92, width: 360, height: 230, selected}),
    ]),
    links: Object.freeze([]),
    nodes: Object.freeze([
      Object.freeze({id: "frame-node", label: "Matrix", title: "Nested Node", x: 220, y: 158, width: 170, height: 90, selected: false}),
    ]),
  })
}

function linkGraph(route: RemainingDomRoute): GraphCanvasProps {
  const base = graphCanvasDefaultProps
  return Object.freeze({
    title: titleFor(route),
    width: 640,
    height: 480,
    scene: Object.freeze({translateX: 12, translateY: 18, scale: 1}),
    frames: Object.freeze([]),
    links: Object.freeze(base.links.map((link) => Object.freeze({
      ...link,
      selected: false,
      segments: Object.freeze(link.segments.map((segment) => Object.freeze({...segment}))),
    }))),
    nodes: Object.freeze(base.nodes.map((node) => Object.freeze({...node, selected: false}))),
  })
}

function parametersFor(route: RemainingDomRoute): ParameterSocketProps {
  if (route === "" || route === "ui" || route === "ui/node-editor" || route === "ui/node-editor/scene") {
    return mergeParameters("Node parameters", [
      createParameterDomProps("ui/parameter/text/both"),
      createParameterDomProps("ui/parameter/number/input"),
    ])
  }
  if (route.includes("rotation-linked") || route.includes("output-only")) {
    return createParameterDomProps(route.includes("output-only")
      ? "ui/parameter/rotation/output"
      : "ui/parameter/rotation/connected")
  }
  if (route.includes("translation-unlinked")) return createParameterDomProps("ui/parameter/vector/input")
  if (route.includes("mixed-sides")) return createParameterDomProps("ui/parameter/matrix/both")
  if (route.includes("color-unlinked")) return createParameterDomProps("ui/parameter/color/input")
  if (route.includes("inventory")) {
    return mergeParameters("Field inventory", [
      createParameterDomProps("ui/parameter/path/field"),
      createParameterDomProps("ui/parameter/collection/field"),
      createParameterDomProps("ui/parameter/reference/field"),
    ])
  }
  if (route.startsWith("ui/node-editor/popup")) return createParameterDomProps("ui/parameter/enum/both")
  if (route.startsWith("ui/comparison")) return noiseParameters()
  return EMPTY_PARAMETERS
}

function noiseParameters(): ParameterSocketProps {
  const vector = createParameterDomProps("ui/parameter/vector/input").parameters[0]!
  const number = createParameterDomProps("ui/parameter/number/input").parameters[0]!
  const labels = ["Scale", "Detail", "Roughness", "Lacunarity", "Distortion"] as const
  return Object.freeze({
    title: "Noise Texture parameters",
    width: 620,
    parameters: Object.freeze([
      Object.freeze({...vector, id: "noise-vector", label: "Vector", sockets: Object.freeze(vector.sockets.map((socket) => Object.freeze({...socket, id: `noise-vector-${socket.direction}`})))}),
      ...labels.map((label, index) => Object.freeze({
        ...number,
        id: `noise-${label.toLowerCase()}`,
        label,
        value: ["5", "2", "0.5", "2", "0"][index]!,
        sockets: Object.freeze(number.sockets.map((socket) => Object.freeze({...socket, id: `noise-${label.toLowerCase()}-${socket.direction}`}))),
      })),
    ]),
  })
}

function treeFor(route: RemainingDomRoute): NodeTreeEditorProps {
  return Object.freeze({
    ...nodeTreeEditorDefaultProps,
    title: route === "" ? "NodeTree" : "Node UI owners",
    query: "",
    editable: false,
    nodes: Object.freeze(nodeTreeEditorDefaultProps.nodes.map((node) => Object.freeze({
      ...node,
      parameters: Object.freeze(node.parameters.map((parameter) => Object.freeze({...parameter}))),
    }))),
  })
}

function imagesFor(route: RemainingDomRoute): readonly NodeWorkbenchImage[] {
  if (route === "ui") return Object.freeze([
    image("ui-reference", acceptedReferenceSrc(), "Accepted comparison reference", 640, 480),
  ])
  if (route.startsWith("ui/comparison")) return Object.freeze([
    image("reference", acceptedReferenceSrc(), "Accepted Node reference", 640, 480),
  ])
  if (!route.startsWith("ui/node-editor/preview")) return Object.freeze([])
  if (route.endsWith("/closed") || route.endsWith("/global-hidden") || route.endsWith("/zero") || route.endsWith("/non-previewable")) return Object.freeze([])
  if (route.endsWith("/missing")) return Object.freeze([
    image("missing", "", "Missing preview buffer", 0, 0),
  ])
  if (route.endsWith("/multiple")) return Object.freeze([
    image("primary", previewData("Primary", "#2d6880"), "Primary preview", 320, 180),
    image("secondary", previewData("Secondary", "#804c68"), "Secondary preview", 320, 180),
  ])
  const alternate = route.endsWith("/alternate")
  return Object.freeze([
    image("preview", previewData(alternate ? "Updated" : "Preview", alternate ? "#80652d" : "#2d6880"), alternate ? "Updated preview buffer" : "Node preview", 320, 180),
  ])
}

function acceptedReferenceSrc(): string {
  const nodeId = "variant:@nodes/ui/comparison/reference/default"
  return `/__storybook/resources/nodes/${encodeURIComponent(nodeId)}/?kind=reference&index=0`
}

function popupFor(route: RemainingDomRoute): NodeWorkbenchPopup {
  if (!route.startsWith("ui/node-editor/popup")) return EMPTY_POPUP
  return Object.freeze({
    visible: true,
    label: "Operation",
    items: Object.freeze([
      Object.freeze({id: "add", label: "Сложение", selected: false}),
      Object.freeze({id: "multiply", label: "Умножение", selected: true}),
      Object.freeze({id: "power", label: "Степень", selected: false}),
    ]),
  })
}

function mergeParameters(title: string, sources: readonly ParameterSocketProps[]): ParameterSocketProps {
  return Object.freeze({
    title,
    width: 620,
    parameters: Object.freeze(sources.flatMap(({parameters}) => parameters)),
  })
}
function image(id: string, src: string, title: string, width: number, height: number): NodeWorkbenchImage {
  return Object.freeze({id, src, alt: title, title, width, height})
}
function previewData(label: string, color: string): string {
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="${color}"/><circle cx="160" cy="90" r="48" fill="#d8d8d8" fill-opacity=".35"/><text x="160" y="96" text-anchor="middle" fill="#fff" font-size="20">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(source)}`
}

function titleFor(route: RemainingDomRoute): string {
  if (route === "") return "NodeTree · Обзор"
  if (route === "ui") return "Node UI · production DOM owners"
  if (route === "ui/node-editor") return "NodeEditor · overview"
  if (route === "ui/node-editor/scene") return "NodeEditor · scene variants"
  if (route === "ui/node-editor/preview") return "NodeEditor · preview variants"
  if (route === "ui/node-editor/collapsed") return "NodeEditor · collapsed variants"
  if (route === "ui/node-editor/popup") return "NodeEditor · popup variants"
  if (route === "ui/frame") return "Frame · overview"
  if (route === "ui/frame/nested") return "Frame · nested variants"
  if (route === "ui/frame/nested/default") return "Frame · Вложенность"
  if (route === "ui/link") return "Link · overview"
  if (route === "ui/link/orthogonal") return "Link · orthogonal variants"
  if (route === "ui/comparison") return "Comparison · overview"
  if (route === "ui/comparison/reference") return "Comparison · reference variants"
  if (route === "ui/comparison/reference/default") return "Сравнение с эталоном"
  return route.split("/").slice(2).join(" · ")
}
