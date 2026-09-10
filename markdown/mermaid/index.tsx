import {useEffect, useMemo, useState} from "@zavx0z/component"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {parseMermaidFlowchart, type MermaidGraph} from "./src/parser.ts"
import {layoutMermaidGraph} from "./src/layout.ts"
import {GraphView, type GraphInput, type GraphLayoutComputer} from "@webxr/nodes/view"
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
        startArrow: edge.startArrow,
        endArrow: edge.endArrow,
        color: "var(--diagram-link-color, currentColor)",
        strokeWidth: 1,
        markers: edge.markers,
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
      --diagram-node-radius: var(--mermaid-node-radius, 10px);
      --diagram-node-fill: var(--mermaid-node-fill, rgba(54, 54, 54, .96));
      --diagram-node-border: var(--mermaid-node-border, rgba(255, 255, 255, .156));
      --diagram-node-color: var(--mermaid-node-color, #ffffff);
      --diagram-link-color: var(--mermaid-link-color, rgba(255, 255, 255, .7));

      &[data-mermaid-ready="false"] [data-graph-view] {
        visibility: hidden;
        pointer-events: none;
      }
    `}
  >
    {pending ? <MermaidLoading /> : null}
    {input === undefined ? null : <GraphView
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
