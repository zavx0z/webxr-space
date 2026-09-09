import {useEffect, useState} from "@zavx0z/component"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import {parseMermaidFlowchart, type MermaidGraph} from "./parser.ts"
import {MermaidView, layoutMermaidGraph} from "./view/src/view.tsx"

type MermaidState = Readonly<{
  source: string
  graph: MermaidGraph | null
  plan: ReturnType<typeof layoutMermaidGraph> | null
  error: string | null
}>

/** Mermaid syntax loads only when a Mermaid block is mounted. Its data feeds native components. */
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
  return <section
    data-mermaid=""
    data-mermaid-ready={String(ready)}
    aria-busy={String(pending)}
    style={css`
      display: block;
      min-width: 0;
      width: 100%;

      &[data-mermaid-ready="false"] [data-mermaid-graph] {
        visibility: hidden;
        pointer-events: none;
      }
    `}
  >
    {pending ? <MermaidLoading /> : null}
    {state.graph !== null && state.plan !== null ? <MermaidView
      graph={state.graph}
      plan={state.plan}
    /> : null}
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
