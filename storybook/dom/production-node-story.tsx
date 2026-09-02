import {
  Parameter as CoreParameter,
  createNodeTree,
  createNodeTreeExternalStore,
  type ExternalStore,
  type NodeJsonValue,
  type ParameterSnapshot,
  type Socket as CoreSocket,
} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import {Link, type LinkProps} from "@nodes/ui/link"
import {Node} from "@nodes/ui/node"
import {NodeEditor} from "@nodes/ui/node-editor"
import type {NodeTreeSelection} from "@nodes/ui/node-tree"
import {
  Parameter,
  type ParameterInput,
} from "@nodes/ui/parameter"
import {
  SOCKET_KINDS,
  Socket,
  socketPreset,
  type SocketDirection,
  type SocketKind,
} from "@nodes/ui/socket"
import {
  Element,
  type Document,
  type HTMLElement,
  type Node as DomNode,
  type Text,
} from "@zavx0z/dom"
import {
  createRoot,
  useState,
  type ComponentRoot,
} from "@zavx0z/react"
import type {
  NodesExternalComponentRoot,
  NodesExternalStorySource,
} from "../../../../.storybook/runtime.ts"

export type ProductionNodeStory = Readonly<{
  element: HTMLElement
  componentRoot: NodesExternalComponentRoot
  props: unknown
  source(): NodesExternalStorySource
  ready(): Promise<void>
  dispose(): void
}>

type StoryParameter = CoreParameter<NodeJsonValue, NodeJsonValue>

type EditorStoryState = Readonly<{
  kind: "editor"
  tree: ReturnType<typeof createStoryTree>
  editor: NodeTreeEditor
  store: ReturnType<typeof createNodeTreeExternalStore<StoryParameter, NodeJsonValue, NodeJsonValue, NodeJsonValue, NodeJsonValue>>
}>

type ParameterStoryState = Readonly<{
  kind: "parameter"
  parameter: StoryParameter
  store: ExternalStore<ParameterSnapshot>
  sockets: readonly CoreSocket[]
}>

type PlainStoryState = Readonly<{kind: "socket" | "link" | "comparison"}>
type StoryState = EditorStoryState | ParameterStoryState | PlainStoryState

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
  const state = createStoryState(route)
  const host = document.createElement("section")
  const root = createRoot(host)
  host.setAttribute("data-production-node-story", route)
  root.render(<ProductionNodeStoryView route={route} state={state} />)
  let disposed = false
  return Object.freeze({
    element: host,
    componentRoot: root as ComponentRoot,
    get props() { return readStoryProps(state, route) },
    source() {
      return Object.freeze({
        html: serialize(host),
        typescript: storySource(route),
      })
    },
    ready: route.startsWith("ui/comparison") ? acceptedReferenceReady : async () => {},
    dispose() {
      if (disposed) return
      disposed = true
      root.unmount()
      if (state.kind === "editor") {
        state.editor.dispose()
        state.tree.dispose()
      }
    },
  })
}

function ProductionNodeStoryView(props: Readonly<{route: string; state: StoryState}>) {
  const editor = props.state.kind === "editor" ? props.state : null
  const parameter = props.state.kind === "parameter" ? props.state : null
  return <section
    data-production-story-route={props.route}
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      min-height: 64px;
    `}
  >
    {editor !== null ? <EditorStory route={props.route} state={editor} /> : null}
    {parameter !== null ? <ParameterStory state={parameter} /> : null}
    {props.state.kind === "socket" ? <SocketStory route={props.route} /> : null}
    {props.state.kind === "link" ? <LinkStory route={props.route} /> : null}
    {props.state.kind === "comparison" ? <ComparisonStory /> : null}
  </section>
}

function EditorStory(props: Readonly<{route: string; state: EditorStoryState}>) {
  const [selection, setSelection] = useState<NodeTreeSelection>(initialSelection(props.route))
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    props.route.includes("/collapsed/") ? new Set(["noise"]) : new Set(),
  )
  const [previews, setPreviews] = useState<ReadonlySet<string>>(
    props.route.endsWith("/open") || props.route.endsWith("/alternate") || props.route.endsWith("/multiple")
      ? new Set(["noise", ...(props.route.endsWith("/multiple") ? ["output"] : [])])
      : new Set(),
  )
  const input = (change: ParameterInput) => props.state.editor.setParameterValue({
    expectedRevision: props.state.tree.revision,
    nodeId: change.nodeId,
    parameterId: change.parameterId,
    value: change.value,
  })
  return <NodeEditor
    store={props.state.store}
    title="Редактор нод"
    width={760}
    height={480}
    selection={selection}
    collapsedNodeIds={collapsed}
    previewNodeIds={previews}
    onSelectionChange={next => setSelection(next)}
    onNodeCollapseChange={(nodeId, value) => setCollapsed(updateSet(collapsed, nodeId, value))}
    onNodePreviewChange={(nodeId, value) => setPreviews(updateSet(previews, nodeId, value))}
    onParameterInput={input}
    onParameterChange={input}
  />
}

function ParameterStory(props: Readonly<{state: ParameterStoryState}>) {
  const input = (change: ParameterInput) => props.state.parameter.set(change.value)
  return <section
    data-production-owner="parameter"
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      min-width: 228px;
      min-height: 64px;
      padding: 18px;
      overflow: hidden;
      background: #1d1d1d;
      color: #d8d8d8;
    `}
  >
    <Parameter
      nodeId="parameter-story"
      snapshot={props.state.parameter.snapshot()}
      store={props.state.store}
      sockets={props.state.sockets}
      connectedSocketKeys={connectedKeys(props.state.sockets)}
      onInput={input}
      onChange={input}
    />
  </section>
}

function SocketStory(props: Readonly<{route: string}>) {
  const definition = socketDefinitionFromRoute(props.route)
  const [selected, setSelected] = useState(false)
  return <section
    data-production-owner="socket"
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      min-width: 228px;
      min-height: 64px;
      padding: 18px;
      overflow: hidden;
      background: #1d1d1d;
      color: #d8d8d8;
    `}
  >
    <Socket
      id={definition.id}
      nodeId="socket-story"
      kind={definition.kind}
      direction={definition.direction}
      side={definition.side}
      label={definition.label}
      selected={selected}
      onActivate={() => setSelected(!selected)}
    />
  </section>
}

function LinkStory(props: Readonly<{route: string}>) {
  const [selected, setSelected] = useState(
    props.route.endsWith("/selected") || props.route === "ui/link" || props.route === "ui/link/orthogonal",
  )
  const link = linkDefinition(selected)
  const sourceParameter = parameter("link-source-value", [1, 2, 3], presentation("Вектор"), "vector")
  const targetParameter = parameter("link-target-value", [1, 2, 3], presentation("Вектор"), "vector")
  const sourceSockets = Object.freeze([
    coreSocket("link-source-output", "vector", "output", "right", "link-source-value", "Vector"),
  ])
  const targetSockets = Object.freeze([
    coreSocket("link-target-input", "vector", "input", "left", "link-target-value", "Vector"),
  ])
  return <section
    data-production-owner="link"
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      min-width: 640px;
      min-height: 320px;
      padding: 18px;
      overflow: hidden;
      background: #1d1d1d;
      color: #d8d8d8;
    `}
  >
    <Link
      id={link.id}
      title={link.title}
      kind={link.kind}
      from={link.from}
      to={link.to}
      route={link.route}
      selected={selected}
      onActivate={() => setSelected(!selected)}
    />
    <Node
      id="link-source"
      label="Источник"
      headerColor="#506d8a"
      rect={Object.freeze({x: 34, y: 52, width: 206, height: 122})}
      parameters={[sourceParameter.snapshot()]}
      sockets={sourceSockets}
    />
    <Node
      id="link-target"
      label="Результат"
      headerColor="#6b557c"
      rect={Object.freeze({x: 386, y: 126, width: 206, height: 122})}
      parameters={[targetParameter.snapshot()]}
      sockets={targetSockets}
    />
  </section>
}

function ComparisonStory() {
  const source = NODE_COMPARISON_REFERENCE.sourceRect
  const data = comparisonNodeData()
  return <section
    data-production-owner="comparison"
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      min-width: 228px;
      min-height: 64px;
      padding: 0;
      overflow: hidden;
      background: #1d1d1d;
      color: #d8d8d8;
    `}
  >
    <section
      data-comparison-scope={NODE_COMPARISON_REFERENCE.scope}
      data-comparison-scale="1"
      style={css`
        box-sizing: border-box;
        display: flex;
        width: 100%;
        gap: 12px;
      `}
    >
      <figure style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 228px;
        margin: 0;
        gap: 4px;
      `}>
        <figcaption style={css`
          box-sizing: border-box;
          display: block;
          height: 20px;
          margin: 0;
          color: #a8a8a8;
          font-size: 10px;
          font-weight: 400;
        `}>Эталон · Noise Texture · 1:1</figcaption>
        <div
          data-source-rect={`${source.x} ${source.y} ${source.width} ${source.height}`}
          data-source-dpr={NODE_COMPARISON_REFERENCE.sourceViewport.dpr}
          style={css`
            box-sizing: border-box;
            position: relative;
            display: block;
            width: 228px;
            height: 385px;
            overflow: hidden;
            border: 1px solid #111111;
            background: #1d1d1d;
          `}
        >
          <img
            src={acceptedReferenceSrc()}
            alt="Exact accepted crop of the Blender Noise Texture node"
            width={NODE_COMPARISON_REFERENCE.sourceViewport.width}
            height={NODE_COMPARISON_REFERENCE.sourceViewport.height}
            style={css`
              display: block;
              width: 1920px;
              height: 1200px;
              margin-left: -498px;
              margin-top: -558px;
              max-width: none;
            `}
          />
        </div>
      </figure>
      <section style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 228px;
        margin: 0;
        gap: 4px;
      `}>
        <h3 style={css`
          box-sizing: border-box;
          display: block;
          height: 20px;
          margin: 0;
          color: #a8a8a8;
          font-size: 10px;
          font-weight: 400;
        `}>Live · @nodes/ui/node · 1:1</h3>
        <div
          data-live-owner="@nodes/ui/node"
          data-live-scale="1"
          style={css`
            box-sizing: border-box;
            position: relative;
            display: block;
            width: 228px;
            height: 385px;
            overflow: hidden;
            border: 1px solid #111111;
            background: #1d1d1d;
          `}
        >
          <Node
            id="comparison-noise"
            label="Noise Texture"
            title="Noise Texture · accepted comparison scope"
            category="texture"
            headerColor="#79461d"
            rect={Object.freeze({x: 6, y: 0, width: 216, height: 272})}
            parameters={data.parameters}
            sockets={data.sockets}
            connectedSocketKeys={data.connectedSocketKeys}
          />
        </div>
      </section>
    </section>
  </section>
}

function createStoryState(route: string): StoryState {
  if (route === "ui" || route === "ui/node-editor" || route.startsWith("ui/node-editor/") ||
    route === "ui/frame" || route.startsWith("ui/frame/")) {
    const tree = createStoryTree(route)
    return Object.freeze({
      kind: "editor",
      tree,
      editor: new NodeTreeEditor(tree),
      store: createNodeTreeExternalStore(tree),
    })
  }
  if (route === "ui/parameter" || route.startsWith("ui/parameter/")) {
    const fixture = parameterFromRoute(route)
    return Object.freeze({kind: "parameter", ...fixture})
  }
  if (route === "ui/socket" || route.startsWith("ui/socket/")) return Object.freeze({kind: "socket"})
  if (route === "ui/link" || route.startsWith("ui/link/")) return Object.freeze({kind: "link"})
  if (route === "ui/comparison" || route.startsWith("ui/comparison/")) return Object.freeze({kind: "comparison"})
  throw new Error(`Production Node story route is not implemented: ${route}`)
}

function createStoryTree(route: string) {
  const previewAvailable = !route.endsWith("/non-previewable")
  const previewUsable = !route.endsWith("/missing") && !route.endsWith("/zero")
  const preview = previewAvailable ? Object.freeze({
    enabled: false,
    ...(previewUsable ? previewImage : {}),
  }) : undefined
  return createNodeTree<StoryParameter>({
    frames: Object.freeze([
      Object.freeze({
        id: "shader-frame",
        metadata: Object.freeze({label: "Материал", description: "Frame материала", x: 18, y: 34, width: 716, height: 400}),
      }),
      Object.freeze({
        id: "texture-frame",
        parentFrameId: "shader-frame",
        metadata: Object.freeze({label: "Текстуры", x: 42, y: 58, width: 330, height: 338}),
      }),
    ]),
    nodes: Object.freeze([
      Object.freeze({
        id: "noise",
        frameId: "texture-frame",
        metadata: Object.freeze({
          label: "Noise Texture",
          description: "Процедурная текстура Noise",
          category: "texture",
          headerColor: "#6b557c",
          x: 70,
          y: 82,
          width: 268,
          height: 314,
          ...(preview === undefined ? {} : {preview}),
        }),
        parameters: Object.freeze([
          parameter("noise-color", colorValue(), presentation("Цвет"), "color"),
          parameter("noise-scale", 5, presentation("Масштаб", {min: 0, max: 10, step: .1}), "float"),
          parameter("noise-detail", 4, presentation("Детализация", {min: 0, max: 16, step: 1}), "integer"),
          parameter("noise-vector", [1, 2, 3], presentation("Вектор", {axes: ["X", "Y", "Z"]}), "vector"),
        ]),
        sockets: Object.freeze([
          coreSocket("noise-color-input", "color", "input", "left", "noise-color", "Color"),
          coreSocket("noise-color-output", "color", "output", "right", undefined, "Color"),
          coreSocket("noise-factor-output", "float", "output", "right", undefined, "Fac"),
          coreSocket("noise-scale-input", "float", "input", "left", "noise-scale", "Scale"),
          coreSocket("noise-scale-output", "float", "output", "right", "noise-scale", "Scale"),
          coreSocket("noise-detail-input", "integer", "input", "left", "noise-detail", "Detail"),
          coreSocket("noise-vector-input", "vector", "input", "left", "noise-vector", "Vector"),
        ]),
      }),
      Object.freeze({
        id: "output",
        frameId: "shader-frame",
        metadata: Object.freeze({
          label: "Material Output",
          description: "Выход материала",
          category: "output",
          headerColor: "#824d4d",
          x: 452,
          y: 138,
          width: 226,
          height: 188,
          ...(route.endsWith("/multiple") ? {preview: Object.freeze({enabled: true, ...previewImage})} : {}),
        }),
        parameters: Object.freeze([
          parameter("output-surface", null, presentation("Surface", {readOnly: true}), "shader"),
          parameter("output-displacement", [0, 0, 0], presentation("Displacement"), "vector"),
        ]),
        sockets: Object.freeze([
          coreSocket("output-color-input", "color", "input", "left", undefined, "Color"),
          coreSocket("output-surface-input", "shader", "input", "left", "output-surface", "Surface"),
          coreSocket("output-displacement-input", "vector", "input", "left", "output-displacement", "Displacement"),
        ]),
      }),
    ]),
    links: Object.freeze([Object.freeze({
      id: "noise-output",
      from: Object.freeze({nodeId: "noise", socketId: "noise-color-output"}),
      to: Object.freeze({nodeId: "output", socketId: "output-color-input"}),
      metadata: Object.freeze({
        label: "Noise → Output",
        kind: "color",
        route: Object.freeze({
          kind: "orthogonal",
          points: Object.freeze([
            Object.freeze({x: 338, y: 198}),
            Object.freeze({x: 394, y: 198}),
            Object.freeze({x: 394, y: 230}),
            Object.freeze({x: 452, y: 230}),
          ]),
        }),
      }),
    })]),
  })
}

function parameterFromRoute(route: string): Omit<ParameterStoryState, "kind"> {
  const segments = route.split("/")
  const kind = parameterKinds.includes(segments[2] as ParameterKind) ? segments[2] as ParameterKind : "number"
  const variant = isParameterVariant(segments[3]) ? segments[3] : "both"
  const id = `parameter-${kind}`
  const data = parameterData(kind)
  const owner = parameter(id, data.value, data.presentation, data.valueType)
  const sockets = variant === "field" ? []
    : variant === "input" || variant === "connected"
      ? [coreSocket(`${id}-input`, socketKind(kind), "input", "left", id, parameterLabel(kind))]
      : variant === "output"
        ? [coreSocket(`${id}-output`, socketKind(kind), "output", "right", id, parameterLabel(kind))]
        : [
            coreSocket(`${id}-input`, socketKind(kind), "input", "left", id, parameterLabel(kind)),
            coreSocket(`${id}-output`, socketKind(kind), "output", "right", id, parameterLabel(kind)),
          ]
  const connected = variant === "connected" ? new Set(sockets.map(socket => `parameter-story\u0000${socket.id}`)) : undefined
  let snapshot = owner.snapshot()
  const store = Object.freeze({
    subscribe: (listener: () => void) => owner.subscribe(() => {
      snapshot = owner.snapshot()
      listener()
    }),
    getSnapshot: () => snapshot,
  })
  if (connected !== undefined) connectedKeysBySockets.set(sockets, connected)
  return Object.freeze({parameter: owner, store, sockets: Object.freeze(sockets)})
}

const connectedKeysBySockets = new WeakMap<readonly CoreSocket[], ReadonlySet<string>>()

function connectedKeys(sockets: readonly CoreSocket[]): ReadonlySet<string> {
  return connectedKeysBySockets.get(sockets) ?? new Set()
}

function parameterData(kind: ParameterKind): Readonly<{
  value: NodeJsonValue
  presentation: NodeJsonValue
  valueType: string
}> {
  switch (kind) {
    case "text": return Object.freeze({value: "Output", presentation: presentation("Текст"), valueType: "string"})
    case "number": return Object.freeze({value: 5, presentation: presentation("Число", {min: 0, max: 10, step: .1}), valueType: "float"})
    case "integer": return Object.freeze({value: 4, presentation: presentation("Целое", {min: 0, max: 16, step: 1}), valueType: "integer"})
    case "boolean": return Object.freeze({value: true, presentation: presentation("Булево", {interaction: "switch"}), valueType: "boolean"})
    case "enum": return Object.freeze({
      value: "medium",
      presentation: presentation("Выбор", {options: [
        {value: "low", label: "Низкое"},
        {value: "medium", label: "Среднее"},
        {value: "high", label: "Высокое"},
      ]}),
      valueType: "menu",
    })
    case "color": return Object.freeze({value: colorValue(), presentation: presentation("Цвет"), valueType: "color"})
    case "vector": return Object.freeze({value: [1, 2, 3], presentation: presentation("Вектор", {axes: ["X", "Y", "Z"]}), valueType: "vector"})
    case "rotation": return Object.freeze({value: [0, 0, 0], presentation: presentation("Вращение", {axes: ["X", "Y", "Z"]}), valueType: "rotation"})
    case "matrix": return Object.freeze({value: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], presentation: presentation("Матрица"), valueType: "matrix"})
    case "reference": return Object.freeze({value: {id: "material", label: "Material", kind: "resource"}, presentation: presentation("Ссылка"), valueType: "material"})
    case "collection": return Object.freeze({
      value: "output",
      presentation: presentation("Коллекция", {items: [{id: "input", label: "Input"}, {id: "output", label: "Output"}]}),
      valueType: "collection",
    })
    case "path": return Object.freeze({value: "/project/output.exr", presentation: presentation("Путь"), valueType: "path"})
    case "readonly": return Object.freeze({value: {status: "Connected"}, presentation: presentation("Результат", {readOnly: true}), valueType: "custom"})
  }
}

function comparisonNodeData(): Readonly<{
  parameters: readonly ParameterSnapshot[]
  sockets: readonly CoreSocket[]
  connectedSocketKeys: ReadonlySet<string>
}> {
  const definitions = [
    comparisonParameter("noise-dimensions", "Dimensions", "3d", "menu", {options: [
      {value: "1d", label: "1D"}, {value: "2d", label: "2D"}, {value: "3d", label: "3D"}, {value: "4d", label: "4D"},
    ]}),
    comparisonParameter("noise-basis", "Noise", "fbm", "menu", {options: [
      {value: "fbm", label: "fBM"}, {value: "multifractal", label: "Multifractal"}, {value: "hybrid", label: "Hybrid Multifractal"},
    ]}),
    comparisonParameter("noise-normalize", "Normalize", true, "boolean", {interaction: "switch"}),
    comparisonParameter("noise-vector", "Vector", [0, 0, 0], "vector", {axes: ["X", "Y", "Z"]}, [socket("noise-vector-input", "vector", "input", "left", "Vector")], true),
    comparisonParameter("noise-scale", "Scale", 5, "float", {min: 0, max: 10, step: .1}, [socket("noise-scale-input", "float", "input", "left", "Scale")]),
    comparisonParameter("noise-detail", "Detail", 2, "float", {min: 0, max: 15, step: .1}, [socket("noise-detail-input", "float", "input", "left", "Detail")]),
    comparisonParameter("noise-roughness", "Roughness", .5, "float", {min: 0, max: 1, step: .01}, [socket("noise-roughness-input", "float", "input", "left", "Roughness")]),
    comparisonParameter("noise-lacunarity", "Lacunarity", 2, "float", {min: 0, max: 4, step: .1}, [socket("noise-lacunarity-input", "float", "input", "left", "Lacunarity")]),
    comparisonParameter("noise-distortion", "Distortion", 0, "float", {min: 0, max: 10, step: .1}, [socket("noise-distortion-input", "float", "input", "left", "Distortion")]),
  ]
  const sockets = definitions.flatMap(definition => definition.sockets.map(entry =>
    coreSocket(entry.id, entry.kind, entry.direction, entry.side, definition.parameter.id, entry.label)))
  const connectedSocketKeys = new Set<string>()
  for (const definition of definitions) if (definition.connected) {
    for (const entry of definition.sockets) connectedSocketKeys.add(`comparison-noise\u0000${entry.id}`)
  }
  return Object.freeze({
    parameters: Object.freeze(definitions.map(definition => definition.parameter.snapshot())),
    sockets: Object.freeze(sockets),
    connectedSocketKeys: Object.freeze(connectedSocketKeys),
  })
}

function comparisonParameter(
  id: string,
  label: string,
  value: NodeJsonValue,
  valueType: string,
  extra: Readonly<Record<string, NodeJsonValue>> = {},
  sockets: readonly ReturnType<typeof socket>[] = [],
  connected = false,
): Readonly<{
  parameter: StoryParameter
  sockets: readonly ReturnType<typeof socket>[]
  connected: boolean
}> {
  return Object.freeze({
    parameter: parameter(id, value, presentation(label, extra), valueType),
    sockets,
    connected,
  })
}

function socketDefinitionFromRoute(route: string) {
  const segments = route.split("/")
  const kind = SOCKET_KINDS.includes(segments[2] as SocketKind) ? segments[2] as SocketKind : "float"
  const direction = isSocketDirection(segments[3]) ? segments[3] : "input"
  const label = direction === "input" ? "Вход" : direction === "output" ? "Выход" : "Двунаправленный"
  return Object.freeze({
    id: `socket-${kind}-${direction}`,
    kind,
    direction,
    side: direction === "output" ? "right" as const : "left" as const,
    label: `${socketPreset(kind).label} · ${label}`,
  })
}

function linkDefinition(selected: boolean): LinkProps {
  return Object.freeze({
    id: "link-production",
    title: "Источник → Результат",
    kind: "vector",
    selected,
    from: Object.freeze({nodeId: "link-source", socketId: "link-source-output"}),
    to: Object.freeze({nodeId: "link-target", socketId: "link-target-input"}),
    route: Object.freeze({
      kind: "orthogonal",
      points: Object.freeze([
        Object.freeze({x: 240, y: 96}),
        Object.freeze({x: 300, y: 96}),
        Object.freeze({x: 300, y: 170}),
        Object.freeze({x: 386, y: 170}),
      ]),
    }),
  })
}

function parameter(id: string, value: NodeJsonValue, ownerPresentation: NodeJsonValue, valueType: string): StoryParameter {
  return new CoreParameter(id, value, ownerPresentation, Object.freeze({id: valueType, version: 1}))
}

function presentation(label: string, extra: Readonly<Record<string, NodeJsonValue>> = {}): NodeJsonValue {
  return Object.freeze({label, description: `${label} · production concrete Field`, ...extra})
}

function colorValue(): NodeJsonValue {
  return Object.freeze({r: .21, g: .56, b: .82, a: 1})
}

function coreSocket(
  id: string,
  kind: string,
  direction: SocketDirection,
  side: "left" | "right",
  parameterId: string | undefined,
  label: string,
): CoreSocket {
  return Object.freeze({
    id,
    direction,
    side,
    ...(parameterId === undefined ? {} : {parameterId}),
    valueType: Object.freeze({id: kind, version: 1}),
    metadata: Object.freeze({label, kind}),
  })
}

function socket(
  id: string,
  kind: SocketKind,
  direction: SocketDirection,
  side: "left" | "right",
  label: string,
) {
  return Object.freeze({id, kind, direction, side, label})
}

function socketKind(kind: ParameterKind): SocketKind {
  if (kind === "text" || kind === "readonly") return "string"
  if (kind === "enum") return "menu"
  return SOCKET_KINDS.includes(kind as SocketKind) ? kind as SocketKind : "custom"
}

function parameterLabel(kind: ParameterKind): string {
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

function initialSelection(route: string) {
  if (route.startsWith("ui/frame")) return Object.freeze({kind: "frame" as const, id: "shader-frame"})
  if (route.startsWith("ui/link") || route.includes("rotation-linked")) return Object.freeze({kind: "link" as const, id: "noise-output"})
  if (route.endsWith("/selected")) return Object.freeze({kind: "node" as const, id: "noise"})
  return null
}

function updateSet(source: ReadonlySet<string>, id: string, value: boolean): ReadonlySet<string> {
  const next = new Set(source)
  if (value) next.add(id)
  else next.delete(id)
  return Object.freeze(next)
}

function isParameterVariant(value: string | undefined): value is ParameterVariant {
  return value === "field" || value === "input" || value === "output" || value === "both" || value === "connected"
}

function isSocketDirection(value: string | undefined): value is SocketDirection {
  return value === "input" || value === "output" || value === "bidirectional"
}

function readStoryProps(state: StoryState, route: string): unknown {
  if (state.kind === "editor") return state.tree.getSnapshot()
  if (state.kind === "parameter") return state.parameter.snapshot()
  if (state.kind === "socket") return socketDefinitionFromRoute(route)
  if (state.kind === "link") return linkDefinition(route.endsWith("/selected"))
  return Object.freeze({route, comparison: NODE_COMPARISON_REFERENCE})
}

function storySource(route: string): string {
  const owner = route.startsWith("ui/parameter") ? "Parameter"
    : route.startsWith("ui/socket") ? "Socket"
      : route.startsWith("ui/link") ? "Link"
        : route.startsWith("ui/comparison") ? "Node"
          : "NodeEditor"
  return [
    `import {${owner}} from "@nodes/ui"`,
    'import {createRoot} from "@zavx0z/react"',
    "",
    `createRoot(container).render(<${owner} {...props} />)`,
  ].join("\n")
}

function acceptedReferenceSrc(): string {
  const nodeId = "variant:@nodes/ui/comparison/reference/default"
  return `/__storybook/resources/nodes/${encodeURIComponent(nodeId)}/?kind=reference&index=0`
}

async function acceptedReferenceReady(): Promise<void> {
  const response = await fetch(acceptedReferenceSrc())
  if (!response.ok) throw new Error(`Accepted Node reference failed to load: ${acceptedReferenceSrc()}`)
  await response.arrayBuffer()
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = new Map(element.getAttributeNames().map(name => [name, element.getAttribute(name) ?? ""]))
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
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  if (children.every(node => node.nodeType === 3)) {
    const text = children.map(node => (node as Text).data).join("")
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
