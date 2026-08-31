import {
  Element,
  type Document,
  type Event,
  type HTMLElement,
  type Node as DomNode,
  type Text,
} from "@zavx0z/dom"
import type {
  NodesExternalComponentRoot,
  NodesExternalStorySource,
} from "../../../../.storybook/runtime.ts"
import {
  createLink,
  type LinkController,
  type LinkDefinition,
} from "@nodes/ui/link"
import {
  createNode,
  type NodeController,
  type NodeDefinition,
} from "@nodes/ui/node"
import {
  createNodeEditor,
  type NodeEditorController,
  type NodeEditorProps,
} from "@nodes/ui/node-editor"
import {
  createParameter,
  type ParameterController,
  type ParameterDefinition,
} from "@nodes/ui/parameter"
import {
  createSocket,
  SOCKET_KINDS,
  socketPreset,
  type SocketController,
  type SocketDefinition,
  type SocketDirection,
  type SocketKind,
} from "@nodes/ui/socket"
import {createRoot} from "@zavx0z/react"
import {mountedFieldStyleSheetRoot} from "../../dom/field-mount.ts"

export type ProductionNodeStory = Readonly<{
  element: HTMLElement
  componentRoot: NodesExternalComponentRoot
  props: unknown
  source(): NodesExternalStorySource
  ready(): Promise<void>
  dispose(): void
}>

const parameterKinds = Object.freeze([
  "text",
  "number",
  "integer",
  "boolean",
  "enum",
  "color",
  "vector",
  "rotation",
  "matrix",
  "reference",
  "collection",
  "path",
  "readonly",
] as const)
type ParameterKind = typeof parameterKinds[number]
type ParameterVariant = "field" | "input" | "output" | "both" | "connected"

const previewImage = Object.freeze({
  src: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128"><defs><linearGradient id="g"><stop stop-color="#18233b"/><stop offset="1" stop-color="#bd5a74"/></linearGradient></defs><rect width="256" height="128" fill="url(#g)"/><circle cx="88" cy="64" r="34" fill="#e9ca54"/><circle cx="164" cy="56" r="22" fill="#6ab0d8"/></svg>')}`,
  width: 256,
  height: 128,
  alt: "Предпросмотр Noise",
})

export const NODE_COMPARISON_REFERENCE = Object.freeze({
  id: "accepted-node-editor-4-5-5",
  scope: "noise-texture-node",
  sourceViewport: Object.freeze({width: 1920, height: 1200, dpr: 2}),
  sourceRect: Object.freeze({x: 498, y: 558, width: 228, height: 385}),
  liveViewport: Object.freeze({width: 228, height: 385, scale: 1}),
})

export function createProductionNodeStory(document: Document, route: string): ProductionNodeStory {
  if (route === "ui" || route === "ui/node-editor" || route.startsWith("ui/node-editor/")) {
    return createNodeEditorStory(document, route)
  }
  if (route === "ui/parameter" || route.startsWith("ui/parameter/")) {
    return createParameterStory(document, route)
  }
  if (route === "ui/socket" || route.startsWith("ui/socket/")) {
    return createSocketStory(document, route)
  }
  if (route === "ui/frame" || route.startsWith("ui/frame/")) {
    return createNodeEditorStory(document, route)
  }
  if (route === "ui/link" || route.startsWith("ui/link/")) {
    return createLinkStory(document, route)
  }
  if (route === "ui/comparison" || route.startsWith("ui/comparison/")) {
    return createComparisonStory(document, route)
  }
  throw new Error(`Production Node story route is not implemented: ${route}`)
}

function createNodeEditorStory(document: Document, route: string): ProductionNodeStory {
  let controller: NodeEditorController
  const onCollapse = (nodeId: string, collapsed: boolean): void => {
    controller.update({
      ...controller.props,
      nodes: controller.props.nodes.map((node) => node.id === nodeId ? {...node, collapsed} : node),
    })
  }
  const onPreview = (nodeId: string, enabled: boolean): void => {
    controller.update({
      ...controller.props,
      nodes: controller.props.nodes.map((node) => node.id === nodeId && node.preview
        ? {...node, preview: {...node.preview, enabled}}
        : node),
    })
  }
  controller = createNodeEditor(document, nodeEditorProps(route, onCollapse, onPreview))
  return result({
    element: controller.element,
    readProps: () => controller.props,
    typescript: () => ownerSource("node-editor", "createNodeEditor", "editor", controller.props),
    dispose: () => controller.dispose(),
  })
}

function createParameterStory(document: Document, route: string): ProductionNodeStory {
  const definition = parameterDefinitionFromRoute(route)
  const controller = createParameter(document, definition)
  const onClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return
    const id = event.target.closest(".node-socket")?.getAttribute("data-socket-id")
    if (!id) return
    const sockets = controller.definition.sockets?.map((socket) => ({...socket, selected: socket.id === id}))
    controller.update({
      ...controller.definition,
      ...(sockets === undefined ? {} : {sockets}),
    })
  }
  controller.element.addEventListener("click", onClick)
  const frame = storyFrame(document, "parameter")
  frame.appendChild(controller.element)
  return result({
    element: frame,
    readProps: () => controller.definition,
    typescript: () => ownerSource("parameter", "createParameter", "parameter", controller.definition),
    dispose: () => {
      controller.element.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

function createSocketStory(document: Document, route: string): ProductionNodeStory {
  const definition = socketDefinitionFromRoute(route)
  const controller = createSocket(document, definition)
  const onClick = (): void => controller.update({...controller.definition, selected: !controller.definition.selected})
  controller.element.addEventListener("click", onClick)
  const frame = storyFrame(document, "socket")
  frame.appendChild(controller.element)
  return result({
    element: frame,
    readProps: () => controller.definition,
    typescript: () => ownerSource("socket", "createSocket", "socket", controller.definition),
    dispose: () => {
      controller.element.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

function createLinkStory(document: Document, route: string): ProductionNodeStory {
  const frame = storyFrame(document, "link")
  const left = createNode(document, compactNode("link-source", "Источник", 34, 52, "#506d8a"))
  const right = createNode(document, compactNode("link-target", "Результат", 386, 126, "#6b557c"))
  const linkDefinition: LinkDefinition = Object.freeze({
    id: "link-production",
    title: "Источник → Результат",
    kind: "vector",
    selected: route.endsWith("/selected") || route === "ui/link" || route === "ui/link/orthogonal",
    from: {nodeId: "link-source", socketId: "link-source-output"},
    to: {nodeId: "link-target", socketId: "link-target-input"},
    segments: Object.freeze([
      Object.freeze({x1: 240, y1: 96, x2: 300, y2: 96}),
      Object.freeze({x1: 300, y1: 96, x2: 300, y2: 170}),
      Object.freeze({x1: 300, y1: 170, x2: 386, y2: 170}),
    ]),
  })
  const link = createLink(document, linkDefinition)
  const onClick = (): void => link.update({...link.definition, selected: !link.definition.selected})
  link.element.addEventListener("click", onClick)
  frame.append(link.element, left.element, right.element)
  return result({
    element: frame,
    readProps: () => link.definition,
    typescript: () => [
      'import {createLink} from "@nodes/ui/link"',
      'import {createNode} from "@nodes/ui/node"',
      'import {createDocument} from "@zavx0z/dom"',
      "",
      "const document = createDocument()",
      'const scene = document.createElement("section")',
      `const link = createLink(document, ${literal(link.definition)})`,
      `const source = createNode(document, ${literal(left.definition)})`,
      `const target = createNode(document, ${literal(right.definition)})`,
      "scene.append(link.element, source.element, target.element)",
      "document.appendChild(scene)",
    ].join("\n"),
    dispose: () => {
      link.element.removeEventListener("click", onClick)
      link.dispose()
      left.dispose()
      right.dispose()
    },
  })
}

function createComparisonStory(document: Document, route: string): ProductionNodeStory {
  const frame = storyFrame(document, "comparison")
  const reference = document.createElement("figure")
  const referenceLabel = document.createElement("figcaption")
  const referenceStage = document.createElement("div")
  const referenceImage = document.createElement("img")
  const live = document.createElement("section")
  const liveLabel = document.createElement("h3")
  const liveStage = document.createElement("div")
  const node = createNode(document, comparisonNoiseNode())
  const sourceRect = NODE_COMPARISON_REFERENCE.sourceRect
  frame.setAttribute("data-comparison-scope", NODE_COMPARISON_REFERENCE.scope)
  frame.setAttribute("data-comparison-scale", String(NODE_COMPARISON_REFERENCE.liveViewport.scale))
  reference.className = "nodes-production-story__comparison-panel"
  referenceLabel.className = "nodes-production-story__comparison-label"
  referenceLabel.appendChild(document.createTextNode("Эталон · Noise Texture · 1:1"))
  referenceStage.className = "nodes-production-story__comparison-stage nodes-production-story__reference-stage"
  referenceStage.setAttribute("data-source-rect", `${sourceRect.x} ${sourceRect.y} ${sourceRect.width} ${sourceRect.height}`)
  referenceStage.setAttribute("data-source-dpr", String(NODE_COMPARISON_REFERENCE.sourceViewport.dpr))
  referenceImage.className = "nodes-production-story__reference"
  referenceImage.src = acceptedReferenceSrc()
  referenceImage.alt = "Exact accepted crop of the Blender Noise Texture node"
  referenceImage.width = NODE_COMPARISON_REFERENCE.sourceViewport.width
  referenceImage.height = NODE_COMPARISON_REFERENCE.sourceViewport.height
  referenceStage.appendChild(referenceImage)
  referenceStage.scrollLeft = sourceRect.x
  referenceStage.scrollTop = sourceRect.y
  reference.append(referenceLabel, referenceStage)
  live.className = "nodes-production-story__comparison-panel"
  liveLabel.className = "nodes-production-story__comparison-label"
  liveLabel.appendChild(document.createTextNode("Live · @nodes/ui/node · 1:1"))
  liveStage.className = "nodes-production-story__comparison-stage nodes-production-story__live-stage"
  liveStage.setAttribute("data-live-owner", "@nodes/ui/node")
  liveStage.setAttribute("data-live-scale", String(NODE_COMPARISON_REFERENCE.liveViewport.scale))
  liveStage.appendChild(node.element)
  live.append(liveLabel, liveStage)
  frame.append(reference, live)
  return result({
    element: frame,
    readProps: () => Object.freeze({
      route,
      comparison: NODE_COMPARISON_REFERENCE,
      reference: Object.freeze({src: referenceImage.src, rect: sourceRect}),
      live: Object.freeze({owner: "@nodes/ui/node", scale: 1, node: node.definition}),
    }),
    typescript: () => [
      'import {createNode} from "@nodes/ui/node"',
      'import {createDocument} from "@zavx0z/dom"',
      "",
      "const document = createDocument()",
      'const comparison = document.createElement("section")',
      `const node = createNode(document, ${literal(node.definition)})`,
      'const referenceStage = document.createElement("div")',
      'const liveStage = document.createElement("div")',
      'const reference = document.createElement("img")',
      `reference.src = ${JSON.stringify(referenceImage.src)}`,
      `reference.width = ${NODE_COMPARISON_REFERENCE.sourceViewport.width}`,
      `reference.height = ${NODE_COMPARISON_REFERENCE.sourceViewport.height}`,
      `const sourceRect = ${literal(sourceRect)}`,
      'comparison.setAttribute("data-comparison-scale", "1")',
      'referenceStage.className = "nodes-production-story__comparison-stage nodes-production-story__reference-stage"',
      'referenceStage.setAttribute("data-source-rect", `${sourceRect.x} ${sourceRect.y} ${sourceRect.width} ${sourceRect.height}`)',
      'liveStage.className = "nodes-production-story__comparison-stage nodes-production-story__live-stage"',
      "referenceStage.append(reference)",
      "referenceStage.scrollLeft = sourceRect.x",
      "referenceStage.scrollTop = sourceRect.y",
      "liveStage.append(node.element)",
      "comparison.append(referenceStage, liveStage)",
      "document.appendChild(comparison)",
    ].join("\n"),
    ready: async () => {
      const response = await fetch(referenceImage.src)
      if (!response.ok) throw new Error(`Accepted Node reference failed to load: ${referenceImage.src}`)
      await response.arrayBuffer()
    },
    dispose: () => node.dispose(),
  })
}

function comparisonNoiseNode(): NodeDefinition {
  const number = (id: string, label: string, value: number, min: number, max: number, step: number): ParameterDefinition => Object.freeze({
    id,
    field: Object.freeze({id, label, description: `${label} · accepted comparison`, kind: "number", value, min, max, step}),
    sockets: Object.freeze([socket(`${id}-input`, "float", "input", "left", label)]),
  })
  return Object.freeze({
    id: "comparison-noise",
    label: "Noise Texture",
    title: "Noise Texture · accepted comparison scope",
    category: "texture",
    headerColor: "#79461d",
    x: 6,
    y: 0,
    width: 216,
    selected: false,
    collapsed: false,
    properties: Object.freeze([
      Object.freeze({
        id: "noise-dimensions",
        label: "Dimensions",
        description: "Noise dimensions",
        kind: "enum",
        value: "3d",
        options: Object.freeze([
          Object.freeze({value: "1d", label: "1D"}),
          Object.freeze({value: "2d", label: "2D"}),
          Object.freeze({value: "3d", label: "3D"}),
          Object.freeze({value: "4d", label: "4D"}),
        ]),
      }),
      Object.freeze({
        id: "noise-basis",
        label: "Noise",
        description: "Noise basis",
        kind: "enum",
        value: "fbm",
        options: Object.freeze([
          Object.freeze({value: "fbm", label: "fBM"}),
          Object.freeze({value: "multifractal", label: "Multifractal"}),
          Object.freeze({value: "hybrid", label: "Hybrid Multifractal"}),
        ]),
      }),
      Object.freeze({
        id: "noise-normalize",
        label: "Normalize",
        description: "Normalize Noise output",
        kind: "boolean",
        value: true,
      }),
    ]),
    parameters: Object.freeze([
      Object.freeze({
        id: "noise-vector",
        field: Object.freeze({
          id: "noise-vector",
          label: "Vector",
          description: "Connected vector input",
          kind: "vector",
          value: Object.freeze([0, 0, 0]),
          axes: Object.freeze(["X", "Y", "Z"]),
        }),
        sockets: Object.freeze([socket("noise-vector-input", "vector", "input", "left", "Vector")]),
        connected: true,
      }),
      number("noise-scale", "Scale", 5, 0, 10, .1),
      number("noise-detail", "Detail", 2, 0, 15, .1),
      number("noise-roughness", "Roughness", .5, 0, 1, .01),
      number("noise-lacunarity", "Lacunarity", 2, 0, 4, .1),
      number("noise-distortion", "Distortion", 0, 0, 10, .1),
    ]),
    sockets: Object.freeze([
      socket("noise-factor-output", "float", "output", "right", "Fac"),
      socket("noise-color-output", "color", "output", "right", "Color"),
    ]),
  })
}

function nodeEditorProps(
  route: string,
  collapse: (nodeId: string, collapsed: boolean) => void,
  preview: (nodeId: string, enabled: boolean) => void,
): NodeEditorProps {
  const collapsed = route.includes("/collapsed/")
  const selected = route.endsWith("/selected") && !route.startsWith("ui/frame")
  const previewRoute = route.includes("/preview/")
  const previewEnabled = route.endsWith("/open") || route.endsWith("/alternate") || route.endsWith("/multiple")
  const previewAvailable = !route.endsWith("/non-previewable")
  const previewUsable = !route.endsWith("/missing") && !route.endsWith("/zero")
  const noise = richNoiseNode("noise", selected, collapsed, collapse, preview)
  const output = outputNode("output", route.endsWith("/multiple"), collapse, preview)
  const noisePreview = previewAvailable ? {
    enabled: previewRoute ? previewEnabled : false,
    ...(previewUsable ? {image: previewImage} : {}),
    onToggle: (enabled: boolean) => preview("noise", enabled),
  } : undefined
  const outputPreview = route.endsWith("/multiple") ? {
    enabled: true,
    image: previewImage,
    onToggle: (enabled: boolean) => preview("output", enabled),
  } : undefined
  const nodes = [
    Object.freeze({...noise, ...(noisePreview === undefined ? {} : {preview: noisePreview})}),
    Object.freeze({...output, ...(outputPreview === undefined ? {} : {preview: outputPreview})}),
  ]
  return Object.freeze({
    title: "Редактор нод",
    width: 760,
    height: 480,
    interactive: true,
    gridSize: 24,
    scene: Object.freeze({translateX: 0, translateY: 0, scale: 1}),
    frames: Object.freeze([Object.freeze({
      id: "shader-frame",
      label: "Материал",
      title: "Frame материала",
      x: 18,
      y: 34,
      width: 716,
      height: 400,
      selected: route.startsWith("ui/frame"),
    })]),
    links: Object.freeze([Object.freeze({
      id: "noise-output",
      title: "Noise → Output",
      kind: "color",
      selected: route.includes("rotation-linked") || route.startsWith("ui/link"),
      from: {nodeId: "noise", socketId: "noise-color-output"},
      to: {nodeId: "output", socketId: "output-color-input"},
      segments: Object.freeze([
        Object.freeze({x1: 338, y1: 198, x2: 394, y2: 198}),
        Object.freeze({x1: 394, y1: 198, x2: 394, y2: 230}),
        Object.freeze({x1: 394, y1: 230, x2: 452, y2: 230}),
      ]),
    })]),
    nodes: Object.freeze(nodes),
  })
}

function richNoiseNode(
  id: string,
  selected: boolean,
  collapsed: boolean,
  collapse: (nodeId: string, collapsed: boolean) => void,
  preview: (nodeId: string, enabled: boolean) => void,
): NodeDefinition & Readonly<{x: number; y: number; width: number; height: number; selected: boolean}> {
  return Object.freeze({
    id,
    label: "Noise Texture",
    title: "Процедурная текстура Noise",
    category: "texture",
    headerColor: "#6b557c",
    x: 70,
    y: 82,
    width: 268,
    height: 314,
    selected,
    collapsed,
    properties: Object.freeze([
      field("noise-color", "color", "Цвет"),
    ]),
    parameters: Object.freeze([
      parameter("noise-scale", "number", "Масштаб", "both"),
      parameter("noise-detail", "integer", "Детализация", "input"),
      parameter("noise-vector", "vector", "Вектор", "input"),
    ]),
    sockets: Object.freeze([
      socket("noise-color-output", "color", "output", "right", "Color"),
      socket("noise-factor-output", "float", "output", "right", "Fac"),
    ]),
    onCollapseChange: (next: boolean) => collapse(id, next),
    preview: {
      enabled: false,
      image: previewImage,
      onToggle: (enabled: boolean) => preview(id, enabled),
    },
  })
}

function outputNode(
  id: string,
  previewEnabled: boolean,
  collapse: (nodeId: string, collapsed: boolean) => void,
  preview: (nodeId: string, enabled: boolean) => void,
): NodeDefinition & Readonly<{x: number; y: number; width: number; height: number; selected: boolean}> {
  return Object.freeze({
    id,
    label: "Material Output",
    title: "Выход материала",
    category: "output",
    headerColor: "#824d4d",
    x: 452,
    y: 138,
    width: 226,
    height: 188,
    selected: false,
    collapsed: false,
    parameters: Object.freeze([
      parameter("output-surface", "readonly", "Surface", "input"),
      parameter("output-displacement", "vector", "Displacement", "input"),
    ]),
    sockets: Object.freeze([
      socket("output-color-input", "color", "input", "left", "Color"),
    ]),
    ...(previewEnabled ? {preview: {
      enabled: true,
      image: previewImage,
      onToggle: (enabled: boolean) => preview(id, enabled),
    }} : {}),
    onCollapseChange: (next: boolean) => collapse(id, next),
  })
}

function compactNode(id: string, label: string, x: number, y: number, headerColor: string): NodeDefinition {
  return Object.freeze({
    id,
    label,
    title: label,
    headerColor,
    x,
    y,
    width: 206,
    height: 122,
    parameters: Object.freeze([
      parameter(`${id}-value`, "vector", "Вектор", id.endsWith("source") ? "output" : "input"),
    ]),
    sockets: Object.freeze([
      socket(`${id}-${id.endsWith("source") ? "output" : "input"}`, "vector", id.endsWith("source") ? "output" : "input", id.endsWith("source") ? "right" : "left", "Vector"),
    ]),
  })
}

function parameterDefinitionFromRoute(route: string): ParameterDefinition {
  const segments = route.split("/")
  const kindCandidate = segments[2]
  const variantCandidate = segments[3]
  const kind = parameterKinds.includes(kindCandidate as ParameterKind) ? kindCandidate as ParameterKind : "number"
  const variant = isParameterVariant(variantCandidate) ? variantCandidate : "both"
  return parameter(`parameter-${kind}`, kind, fieldLabel(kind), variant)
}

function parameter(id: string, kind: ParameterKind, label: string, variant: ParameterVariant): ParameterDefinition {
  const sockets = variant === "field" ? []
    : variant === "input" || variant === "connected"
      ? [socket(`${id}-input`, socketKind(kind), "input", "left", label)]
      : variant === "output"
        ? [socket(`${id}-output`, socketKind(kind), "output", "right", label)]
        : [
            socket(`${id}-input`, socketKind(kind), "input", "left", label),
            socket(`${id}-output`, socketKind(kind), "output", "right", label),
          ]
  return Object.freeze({
    id,
    field: field(id, kind, label),
    sockets: Object.freeze(sockets),
    connected: variant === "connected",
  })
}

function field(id: string, kind: ParameterKind, label: string): ParameterDefinition["field"] {
  const base = {id, label, description: `${label} · production Field`}
  switch (kind) {
    case "text": return Object.freeze({...base, kind, value: "Output"})
    case "number": return Object.freeze({...base, kind, value: 5, min: 0, max: 10, step: .1})
    case "integer": return Object.freeze({...base, kind, value: 4, min: 0, max: 16, step: 1})
    case "boolean": return Object.freeze({...base, kind, value: true, presentation: "switch"})
    case "enum": return Object.freeze({...base, kind, value: "medium", options: Object.freeze([
      Object.freeze({value: "low", label: "Низкое"}),
      Object.freeze({value: "medium", label: "Среднее"}),
      Object.freeze({value: "high", label: "Высокое"}),
    ])})
    case "color": return Object.freeze({...base, kind, value: Object.freeze({r: .21, g: .56, b: .82, a: 1})})
    case "vector": return Object.freeze({...base, kind, value: Object.freeze([1, 2, 3]), axes: Object.freeze(["X", "Y", "Z"])})
    case "rotation": return Object.freeze({...base, kind, value: Object.freeze([0, 0, 0]), axes: Object.freeze(["X", "Y", "Z"])})
    case "matrix": return Object.freeze({...base, kind, value: Object.freeze([
      Object.freeze([1, 0, 0]),
      Object.freeze([0, 1, 0]),
      Object.freeze([0, 0, 1]),
    ])})
    case "reference": return Object.freeze({...base, kind, value: Object.freeze({id: "material", label: "Material", kind: "resource"})})
    case "collection": return Object.freeze({...base, kind, selectedId: "output", items: Object.freeze([
      Object.freeze({id: "input", label: "Input"}),
      Object.freeze({id: "output", label: "Output"}),
    ])})
    case "path": return Object.freeze({...base, kind, value: "/project/output.exr"})
    case "readonly": return Object.freeze({...base, kind, value: "Connected"})
  }
}

function socketDefinitionFromRoute(route: string): SocketDefinition {
  const segments = route.split("/")
  const kindCandidate = segments[2]
  const directionCandidate = segments[3]
  const kind = SOCKET_KINDS.includes(kindCandidate as SocketKind) ? kindCandidate as SocketKind : "float"
  const direction = isSocketDirection(directionCandidate) ? directionCandidate : "input"
  const directionLabel = direction === "input" ? "Вход" : direction === "output" ? "Выход" : "Двунаправленный"
  return socket(`socket-${kind}-${direction}`, kind, direction, direction === "output" ? "right" : "left", `${socketPreset(kind).label} · ${directionLabel}`)
}

function socket(
  id: string,
  kind: SocketKind,
  direction: SocketDirection,
  side: "left" | "right",
  label: string,
): SocketDefinition {
  return Object.freeze({id, kind, direction, side, label, title: label, selected: false})
}

function socketKind(kind: ParameterKind): SocketKind {
  if (kind === "text" || kind === "readonly") return "string"
  if (kind === "enum") return "menu"
  return SOCKET_KINDS.includes(kind as SocketKind) ? kind as SocketKind : "custom"
}

function fieldLabel(kind: ParameterKind): string {
  return ({
    text: "Текст",
    number: "Число",
    integer: "Целое",
    boolean: "Булево",
    enum: "Выбор",
    color: "Цвет",
    vector: "Вектор",
    rotation: "Вращение",
    matrix: "Матрица",
    reference: "Ссылка",
    collection: "Коллекция",
    path: "Путь",
    readonly: "Результат",
  } as const)[kind]
}

function isParameterVariant(value: string | undefined): value is ParameterVariant {
  return value === "field" || value === "input" || value === "output" || value === "both" || value === "connected"
}

function isSocketDirection(value: string | undefined): value is SocketDirection {
  return value === "input" || value === "output" || value === "bidirectional"
}

function storyFrame(document: Document, kind: "parameter" | "socket" | "link" | "comparison"): HTMLElement {
  const element = document.createElement("section")
  element.className = `nodes-production-story nodes-production-story--${kind}`
  element.setAttribute("data-production-owner", kind)
  return element
}

function result(options: Readonly<{
  element: HTMLElement
  readProps(): unknown
  typescript(): string
  ready?: () => Promise<void>
  dispose(): void
}>): ProductionNodeStory {
  const ownerDocument = options.element.ownerDocument
  if (ownerDocument === null) throw new Error("Production Node story element has no owner Document")
  const lifecycleRoot = createRoot(ownerDocument.createDocumentFragment())
  const fieldRoot = mountedFieldStyleSheetRoot(options.element)
  const componentRoot = Object.freeze({
    readStyleSheets() {
      const lifecycle = lifecycleRoot.readStyleSheets()
      const fields = fieldRoot.readStyleSheets() as Readonly<{
        revision: number
        styleSheets: readonly unknown[]
      }>
      return Object.freeze({
        revision: Math.max(lifecycle.revision, fields.revision),
        styleSheets: Object.freeze([...lifecycle.styleSheets, ...fields.styleSheets]),
      })
    },
  })
  let disposed = false
  return Object.freeze({
    element: options.element,
    componentRoot,
    get props() { return options.readProps() },
    source() {
      return Object.freeze({
        html: serialize(options.element),
        typescript: options.typescript(),
      })
    },
    ready: options.ready ?? (async () => {}),
    dispose() {
      if (disposed) return
      disposed = true
      lifecycleRoot.unmount()
      options.dispose()
    },
  })
}

function ownerSource(owner: string, factory: string, variable: string, props: unknown): string {
  return [
    `import {${factory}} from "@nodes/ui/${owner}"`,
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    `const ${variable} = ${factory}(document, ${literal(props)})`,
    `document.appendChild(${variable}.element)`,
  ].join("\n")
}

function acceptedReferenceSrc(): string {
  const nodeId = "variant:@nodes/ui/comparison/reference/default"
  return `/__storybook/resources/nodes/${encodeURIComponent(nodeId)}/?kind=reference&index=0`
}

function literal(value: unknown): string {
  return JSON.stringify(value, (_key, candidate) => typeof candidate === "function" ? undefined : candidate, 2)
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = new Map(element.getAttributeNames().map((name) => [name, element.getAttribute(name) ?? ""]))
  const live = element as Element & Readonly<{value?: unknown; checked?: unknown; indeterminate?: unknown}>
  if (["input", "select", "textarea"].includes(element.localName) && typeof live.value === "string") {
    attributes.set("value", live.value)
  }
  if (live.checked === true) attributes.set("checked", "")
  if (live.indeterminate === true) attributes.set("aria-checked", "mixed")
  const attrs = [...attributes].sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) =>
    ` ${name}="${escapeHtml(value)}"`
  ).join("")
  if (["img", "input"].includes(element.localName)) return `${indent}<${element.localName}${attrs}>`
  const children = [...element.childNodes].filter((node) => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) {
    const text = children.map((node) => (node as Text).data).join("")
    return `${indent}<${element.localName}${attrs}>${escapeHtml(text)}</${element.localName}>`
  }
  const body = children.map((node: DomNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml((node as Text).data)}`
    : serialize(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
