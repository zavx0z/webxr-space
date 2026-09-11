/**
Показывает {@link Mermaid}-схему через общий GraphView. Разбор, раскладка и частные
адаптеры отображения находятся в src; здесь остаётся композиция Mermaid.

@packageDocumentation
*/
import {useEffect, useMemo, useState} from "@zavx0z/component"
import {parseMermaidFlowchart} from "./src/parser.ts"
import {layoutMermaidGraph} from "./src/layout.ts"
import type {GraphInput, GraphLayoutComputer} from "@webxr/nodes/view"
import {MermaidNode} from "./src/node.tsx"
import type {MermaidInput} from "./contract/input.ts"
import type {MermaidGraph} from "./types/graph.ts"
import type {MermaidState} from "./types/state.ts"
import {MermaidError, MermaidLoading} from "./src/feedback.tsx"
import {MermaidMarker} from "./src/marker.tsx"
import {MermaidGraphView} from "./src/graph-view.tsx"

export type {MermaidInput} from "./contract/input.ts"

/**
Показывает flowchart как часть [документа Markdown](../README.md#mermaid).
Асинхронно загружает parser, сохраняет последний разобранный граф и передаёт его
общему GraphView. Результат отменённого effect не применяется.

GraphView измеряет реальные DiagramNode перед раскладкой; готовый граф
публикуется по [циклу измерения и показа](../../nodes/measurement-gap.md).
Компонент хранит готовность по ссылке графа, а направление передаёт контекстом
адаптеру наконечников. Ошибка разбора показывает исходник рядом с сообщением.

@param props - Исходный {@link Mermaid} flowchart без Markdown-ограждения согласно {@link MermaidInput}.

@remarks
[Сценарии Mermaid](../markdown/tests/mermaid.test.ts) проверяют направления,
маршруты и сохранение нод при обновлении. Интерактивная
[история смены диаграммы](../.storybook/stories/compiled/compiled-mermaid-story.tsx)
использует тот же production-компонент.
*/
export function Mermaid(props: MermaidInput) {
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
