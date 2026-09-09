import {useState} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {Document} from "@zavx0z/dom"
import {createNodeTree, createNodeTreeExternalStore} from "@nodes/tree"
import {NodeTree, type NodeTreeSelection, type NodeTreeStore} from "@webxr/nodes/node-tree"
import {layoutFixed} from "@nodes/layout/fixed"
import type {LayoutResult} from "@nodes/layout/types"
import type {NodeKind} from "@nodes/node/contracts"
import {Markdown} from "@webxr/markdown"
import {mountOwnerStory} from "./story-types.ts"
import {dependencyComponents, dependencyGraph, ownerNames, type DependencyScope} from "./dependencies-data.ts"

export function createDependencyStory(document: Document, scope: DependencyScope) {
  const graph = dependencyGraph(scope)
  const tree = createNodeTree({
    nodes: graph.components.map(component => ({
      id: component.id,
      metadata: {description: component.id},
      sockets: [
        ...(graph.relations.some(relation => relation.to === component.id) ? [{id: "in", direction: "input" as const}] : []),
        ...(graph.relations.some(relation => relation.from === component.id) ? [{id: "out", direction: "output" as const}] : []),
      ],
    })),
    links: graph.relations.map(relation => ({
      id: relation.id,
      metadata: {label: `${relation.from} использует ${relation.to}`},
      from: {nodeId: relation.from, socketId: "out"},
      to: {nodeId: relation.to, socketId: "in"},
    })),
  })
  const store = createNodeTreeExternalStore(tree)
  const layout = layoutFixed({
    viewport: {width: 1400, height: 700},
    nodes: tree.snapshot().nodes.map(node => ({id: node.id, width: 210, height: 62})),
    ports: tree.snapshot().nodes.flatMap(node => node.sockets.map(socket => ({id: `${node.id}/${socket.id}`, nodeId: node.id, y: 31}))),
    edges: graph.relations.map(relation => ({id: relation.id, sourcePortId: `${relation.from}/out`, targetPortId: `${relation.to}/in`})),
    layoutOptions: {spacing: 32, layerSpacing: 96, padding: 24, clearance: 8},
  })
  const kinds: ReadonlyMap<string, NodeKind> = new Map(graph.components.map(component => [component.id, "diagram"]))
  const mounted = mountOwnerStory(document, DependenciesStory as unknown as CompiledTemplate<DependenciesStoryProps>,
    {scope, store, layout, kinds}, "node-dependencies", sourceFor(scope))
  return {story: {...mounted.story, props: {scope, components: graph.components.length, relations: graph.relations.length}, dispose() {
    mounted.story.dispose()
    tree.dispose()
  }}}
}

type DependenciesStoryProps = Readonly<{
  scope: DependencyScope
  store: NodeTreeStore
  layout: LayoutResult
  kinds: ReadonlyMap<string, NodeKind>
}>

function DependenciesStory(props: DependenciesStoryProps) {
  const [selection, setSelection] = useState<NodeTreeSelection>({kind: "node", id: props.scope === "nodes" ? "ContentNode" : "NumberParameter"})
  const selected = selection?.kind === "node" ? dependencyComponents.find(component => component.id === selection.id) : undefined
  const relation = selection?.kind === "link" ? dependencyGraph(props.scope).relations.find(relation => relation.id === selection.id) : undefined
  const incoming = selected === undefined ? [] : dependencyComponents.filter(component => component.uses.includes(selected.id))
  const details = selected === undefined
    ? relation === undefined ? "Выберите компонент или связь на схеме." : `### ${relation.from} → ${relation.to}\n\n${relation.from} использует компонент ${relation.to}.`
    : [
      `### ${selected.id}`,
      selected.description,
      `**Пакет:** ${ownerNames[selected.owner]}`,
      `**Использует:** ${selected.uses.length ? selected.uses.join(", ") : "в этой схеме зависимости дальше не раскрываются"}.`,
      `**Используется в:** ${incoming.length ? incoming.map(component => component.id).join(", ") : "приложении или другом внешнем компоненте"}.`,
      `**Исходник:** \`${selected.source}\``,
    ].join("\n\n")
  return <section
    aria-label="Кто кого использует"
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      gap: 16px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <Markdown
      source={props.scope === "nodes"
        ? "# Кто кого использует\n\nСостав трёх нод. Линии читаются **слева направо: использует**. Нажмите на компонент, чтобы увидеть его назначение и зависимости."
        : "# Как устроен числовой параметр\n\nПуть от содержимого ноды до готового поля UI и сокетов. Другие виды параметров здесь не раскрыты. Линии читаются **слева направо: использует**."}
    />
    <div
      aria-label="Схема зависимостей компонентов"
      style={css`
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        overflow: auto;
        border: 1px solid var(--widget-box-outline);
        border-radius: 6px;
        background: #171b24;
      `}
    >
      <div style={css`
        position: relative;
        width: ${props.layout.bounds.width + 48}px;
        height: ${props.layout.bounds.height + 48}px;
      `}>
        <NodeTree
          store={props.store}
          layout={props.layout}
          nodeKinds={props.kinds}
          label="Зависимости компонентов"
          selection={selection}
          onSelectionChange={setSelection}
        />
      </div>
    </div>
    <aside
      aria-label="О выбранном компоненте"
      aria-live="polite"
      style={css`
        box-sizing: border-box;
        min-height: 230px;
        padding: 16px;
        border: 1px solid var(--widget-box-outline);
        border-radius: 6px;
        background: var(--widget-box-background);
      `}
    >
      <Markdown source={details} />
    </aside>
    <Markdown source="На схеме показана композиция компонентов. Значения параметров хранятся в **@nodes/tree**. Геометрию рассчитывает **@nodes/layout**. Эти разные виды зависимостей не смешаны с линиями состава. При нехватке ширины схему можно прокрутить горизонтально." />
  </section>
}

function sourceFor(scope: DependencyScope) {
  const graph = dependencyGraph(scope)
  return [
    'import {NodeTree} from "@webxr/nodes/node-tree"',
    'import {createNodeTree, createNodeTreeExternalStore} from "@nodes/tree"',
    'import {layoutFixed} from "@nodes/layout/fixed"',
    'import {useEffect, useMemo} from "@zavx0z/component"',
    'import type {NodeKind} from "@nodes/node/contracts"',
    `const ids = ${JSON.stringify(graph.components.map(component => component.id))}`,
    `const relations = ${JSON.stringify(graph.relations)}`,
    'export function Example() {',
    '  const tree = useMemo(() => createNodeTree({',
    '    nodes: ids.map(id => ({id, metadata: {description: id}, sockets: [',
    '      ...(relations.some(edge => edge.to === id) ? [{id: "in", direction: "input" as const}] : []),',
    '      ...(relations.some(edge => edge.from === id) ? [{id: "out", direction: "output" as const}] : []),',
    '    ]})),',
    '    links: relations.map(edge => ({id: edge.id, from: {nodeId: edge.from, socketId: "out"}, to: {nodeId: edge.to, socketId: "in"}})),',
    '  }), [])',
    '  useEffect(() => () => tree.dispose(), [tree])',
    '  const store = useMemo(() => createNodeTreeExternalStore(tree), [tree])',
    '  const kinds: ReadonlyMap<string, NodeKind> = useMemo(() => new Map(ids.map(id => [id, "diagram"])), [])',
    '  const layout = useMemo(() => layoutFixed({',
    '    viewport: {width: 1400, height: 700},',
    '    nodes: ids.map(id => ({id, width: 210, height: 62})),',
    '    layoutOptions: {spacing: 32, layerSpacing: 96, padding: 24, clearance: 8},',
    '    ports: tree.snapshot().nodes.flatMap(node => node.sockets.map(socket => ({id: `${node.id}/${socket.id}`, nodeId: node.id, y: 31}))),',
    '    edges: relations.map(edge => ({id: edge.id, sourcePortId: `${edge.from}/out`, targetPortId: `${edge.to}/in`})),',
    '  }), [tree])',
    '  return <div style={css`',
    '    width: 100%;',
    '    overflow: auto;',
    '  `}>',
    '    <div style={css`',
    '      width: ${layout.bounds.width + 48}px;',
    '      height: ${layout.bounds.height + 48}px;',
    '    `}>',
    '      <NodeTree',
    '        store={store}',
    '        layout={layout}',
    '        nodeKinds={kinds}',
    '      />',
    '    </div>',
    '  </div>',
    '}',
  ].join("\n")
}
