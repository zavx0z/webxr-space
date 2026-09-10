import {useEffect, useMemo, useState} from "@zavx0z/component"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {parseMermaidFlowchart, type MermaidGraph} from "./src/parser.ts"
import {layoutMermaidGraph} from "./src/layout.ts"
import {GraphView, type GraphScene} from "@webxr/nodes/view"
import {MermaidNode} from "./node/index.tsx"

type MermaidState = Readonly<{
  source: string
  graph: MermaidGraph | null
  plan: ReturnType<typeof layoutMermaidGraph> | null
  error: string | null
}>

/** Разбор Mermaid загружается при появлении блока; граф показывает общий GraphView. */
export function Mermaid(props: Readonly<{source: string}>) {
  const [state, setState] = useState<MermaidState>({source: props.source, graph: null, plan: null, error: null})
  useEffect(() => {
    let active = true
    parseMermaidFlowchart(props.source).then(graph => {
      if (!active) return
      const plan = layoutMermaidGraph(graph)
      setState({source: props.source, graph, plan, error: null})
    }).catch((error: unknown) => {
      if (active) setState(previous => ({...previous, source: props.source, error: error instanceof Error ? error.message : String(error)}))
    })
    return () => { active = false }
  }, [props.source])
  const current = state.source === props.source ? state : undefined
  const pending = current === undefined || current.graph === null && current.error === null
  const ready = current !== undefined && current.error === null && current.graph !== null
  const scene = useMemo(() => state.plan === null ? null : Object.freeze({
    bounds: {x: 0, y: 0, width: state.plan.width, height: state.plan.height},
    frames: [],
    nodes: state.plan.nodes.map(node => ({id: node.id, rect: node.rect, data: node, view: MermaidNode})),
    links: state.plan.edges.map(edge => ({id: edge.id, title: `${edge.from} → ${edge.to}`, route: edge.route, startArrow: edge.startArrow, endArrow: edge.endArrow})),
  }) satisfies GraphScene, [state.plan])
  return <section
    data-mermaid=""
    data-mermaid-ready={String(ready)}
    aria-busy={String(pending)}
    style={css`
      display: block;
      min-width: 0;
      width: 100%;

      &[data-mermaid-ready="false"] [data-graph-view] {
        visibility: hidden;
        pointer-events: none;
      }
    `}
  >
    {pending ? <MermaidLoading /> : null}
    {scene === null ? null : <GraphView
      scene={scene}
      pending={!ready}
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
