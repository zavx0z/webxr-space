import {component, provideContext} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {GraphView, type GraphViewProps} from "@webxr/nodes/view"
import {MermaidHorizontal} from "./graph-context.ts"
import type {GraphChildren} from "../types/graph-view.ts"

/**
Передаёт направление Mermaid через {@link MermaidHorizontal} в один {@link GraphView}.
Смена направления обновляет контекст адаптера наконечников при том же типе компонента.

@param props - Параметры {@link GraphViewProps} и признак `horizontal`.
Он равен `true` для LR/RL и `false` для TB/BT; собственный lifecycle графа не создаётся.

@returns JSX-мост через {@link MermaidGraphContent}, сохраняющий контекст потомков.
*/
export function MermaidGraphView(props: GraphViewProps & Readonly<{horizontal: boolean}>) {
  const content: GraphChildren = renderMermaidGraph(props)
  return <MermaidGraphContent>{content}</MermaidGraphContent>
}

/**
Создаёт скомпилированный {@link GraphView} под контекстом направления Mermaid.
Контекст используется адаптером наконечников; lifecycle остаётся у текущего component root.

@param props - {@link GraphViewProps} с дополнительным horizontal для {@link MermaidHorizontal}; остальные поля передаются GraphView.

@returns {@link GraphChildren}, созданные внутри выбранного контекста направления.
*/
function renderMermaidGraph(props: GraphViewProps & Readonly<{horizontal: boolean}>): GraphChildren {
  return provideContext(MermaidHorizontal, props.horizontal,
    component(GraphView as unknown as CompiledTemplate<GraphViewProps>, props, "graph")) as unknown as JsxSourceElement
}

/**
Передаёт подготовленный {@link GraphView} через JSX children без дополнительного DOM-элемента.

@param props - Подготовленные {@link GraphChildren}; используется прямой children transport JSX runtime.
*/
function MermaidGraphContent(props: Readonly<{children: GraphChildren}>) {
  return <>{props.children}</>
}
