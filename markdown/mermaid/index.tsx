import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Arrow} from "@webxr/nodes/markers/arrow"
import type {MarkerProps} from "@webxr/nodes/markers"
import {component, createContext, provideContext, useContext, useEffect, useMemo, useState} from "@zavx0z/component"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {parseMermaidFlowchart, type MermaidGraph} from "./src/parser.ts"
import {layoutMermaidGraph} from "./src/layout.ts"
import {GraphView, type GraphViewProps, type GraphInput, type GraphLayoutComputer} from "@webxr/nodes/view"
import {MermaidNode} from "./node/index.tsx"

type MermaidState = Readonly<{
  source: string
  graph: MermaidGraph | null
  error: string | null
}>

/** Разбор Mermaid загружается при появлении блока; граф показывает общий GraphView. */
export function Mermaid(props: Readonly<{source: string}>) {
  const [state, setState] = useState<MermaidState>({source: props.source, graph: null, error: null})
  const [readyGraph, setReadyGraph] = useState<MermaidGraph | null>(null)
  useEffect(() => {
    let active = true
    parseMermaidFlowchart(props.source).then(graph => {
      if (!active) return
      setState({source: props.source, graph, error: null})
    }).catch((error: unknown) => {
      if (active) setState(previous => ({...previous, source: props.source, error: error instanceof Error ? error.message : String(error)}))
    })
    return () => { active = false }
  }, [props.source])
  const current = state.source === props.source ? state : undefined
  const parsed = current !== undefined && current.error === null && current.graph !== null
  const ready = parsed && readyGraph === current.graph
  const pending = !ready && current?.error == null
  const input = useMemo(() => state.graph === null ? undefined : Object.freeze({
    nodes: state.graph.nodes.map(node => ({id: node.id, data: node, view: MermaidNode})),
  }) satisfies GraphInput, [state.graph])
  const layout = useMemo<GraphLayoutComputer>(() => measurements => {
    if (state.graph === null) throw new Error("Mermaid ещё не разобран")
    const plan = layoutMermaidGraph(state.graph, measurements)
    return {
      bounds: {x: 0, y: 0, width: plan.width, height: plan.height},
      nodes: plan.nodes.map(node => ({...node.rect})),
      links: plan.edges.map(edge => ({
        id: edge.id,
        title: `${edge.from} → ${edge.to}`,
        route: edge.route,
        startMarker: edge.startArrow ? MermaidMarker : undefined,
        endMarker: edge.endArrow ? MermaidMarker : undefined,
        color: "var(--diagram-link-color, currentColor)",
        strokeWidth: 1,
      })),
    }
  }, [state.graph])
  const layoutState = useMemo(() => (value: Readonly<{pending: boolean}>) => {
    setReadyGraph(value.pending ? null : state.graph)
  }, [state.graph])
  return <section
    data-mermaid=""
    data-mermaid-ready={String(ready)}
    aria-busy={String(pending)}
    style={css`
      display: block;
      min-width: 0;
      width: 100%;
      background: var(--mermaid-background, #181818);
      --diagram-node-radius: var(--mermaid-node-radius);
      --diagram-node-fill: var(--mermaid-node-fill);
      --diagram-node-border: var(--mermaid-node-border);
      --diagram-node-color: var(--mermaid-node-color);
      --diagram-node-font-family: var(--mermaid-font-family);
      --diagram-node-line-height: var(--mermaid-line-height);
      --diagram-link-color: var(--mermaid-link-color, rgba(255, 255, 255, .7));

      &[data-mermaid-ready="false"] [data-graph-view] {
        visibility: hidden;
        pointer-events: none;
      }
    `}
  >
    {pending ? <MermaidLoading /> : null}
    {input === undefined ? null : <MermaidGraphView
      horizontal={state.graph?.direction === "LR" || state.graph?.direction === "RL"}
      input={input}
      layout={layout}
      pending={!parsed}
      onLayoutStateChange={layoutState}
      navigation="scroll"
      label="Mermaid: диаграмма"
    />}
    {current?.error ? <MermaidError
      source={props.source}
      error={current.error}
    /> : null}
  </section>
}

function MermaidLoading() {
  return <p role="status">Подготовка Mermaid-диаграммы…</p>
}

function MermaidError(props: Readonly<{source: string; error: string}>) {
  return <div>
    <p role="alert">{props.error}</p>
    <CodeEditor
      value={props.source}
      languageId="mermaid"
      readOnly={true}
      style={css`
        width: 100%;
        height: auto;
      `}
    />
  </div>
}

/** Только различающиеся размеры/refX reference Mermaid; placement и рисование принадлежат Link/Arrow. */
function MermaidMarker(props: MarkerProps) {
  const horizontal = useContext(MermaidHorizontal)
  const start = props.context.side === "start"
  return <Arrow
    context={props.context}
    variant={horizontal ? "open" : "filled"}
    length={horizontal ? 9 : start ? 11.5 : 10.5}
    width={horizontal ? 8 : start ? 14 : 14 * 10.5 / 11.5}
    offset={horizontal ? 0 : start ? 3 : 4 * 10.5 / 11.5}
  />
}

const MermaidHorizontal = createContext(false)
type GraphChildren = JsxSourceElement | readonly JsxSourceElement[] | null | undefined

/** Контекст оформления сохраняет один тип Marker/Arrow при смене LR↔TD без второго состояния графа. */
function MermaidGraphView(props: GraphViewProps & Readonly<{horizontal: boolean}>) {
  const content: GraphChildren = renderMermaidGraph(props)
  return <MermaidGraphContent>{content}</MermaidGraphContent>
}

function renderMermaidGraph(props: GraphViewProps & Readonly<{horizontal: boolean}>): GraphChildren {
  return provideContext(MermaidHorizontal, props.horizontal,
    component(GraphView as unknown as CompiledTemplate<GraphViewProps>, props, "graph")) as unknown as JsxSourceElement
}

function MermaidGraphContent(props: Readonly<{children: GraphChildren}>) {
  return <>{props.children}</>
}
