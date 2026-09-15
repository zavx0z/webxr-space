import {createRoot, useState, useSyncExternalStore} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import {Parameter, createNodeTree, createNodeTreeExternalStore} from "@nodes/tree"
import {ParameterNode} from "@nodes/node/parameter"
import {ContentNode} from "@nodes/node/content"
import {planProjectedNodeGeometry} from "@nodes/node/geometry"
import {Button} from "@zavx0z/ui/buttons/button"
import {Typography} from "@zavx0z/ui/typography"
import {mountOwnerStory} from "./story-types.ts"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

export function InteractiveContent() {
  const [count, setCount] = useState(0)
  return <section
    aria-label="Произвольное содержимое"
    style={css`
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      min-height: 0;
      gap: 12px;
      background: #253a52;
    `}
  >
    <Typography text="Самостоятельный компонент внутри ноды" />
    <Button
      label={`Счётчик содержимого: ${count}`}
      onClick={() => setCount(value => value + 1)}
    />
  </section>
}

export function createNodeStory(document: Document, route: string, looseSockets = false) {
  const value = new Parameter<number, {label: string}>("value", 2.5, {label: "Число"})
  const tree = createNodeTree({nodes: [{id: "example", parameters: [value], sockets: [
    {id: "in", direction: "input", parameterId: "value", side: "left"},
    {id: "out", direction: "output", parameterId: "value", side: "right"},
    ...(looseSockets ? [
      {id: "loose-out", direction: "output" as const, side: "right" as const},
      {id: "loose-in", direction: "input" as const, side: "left" as const},
    ] : []),
  ]}]})
  const store = createNodeTreeExternalStore(tree)
  const result = mountOwnerStory(document, NodeStory as unknown as CompiledTemplate<{route: string; store: typeof store; value: typeof value}>,
    {route, store, value}, "node", sourceFor(route))
  return {story: {...result.story, dispose() {
    result.story.dispose()
    tree.dispose()
  }}}
}

type NodeStoryProps = Readonly<{
  route: string
  store: ReturnType<typeof createNodeTreeExternalStore>
  value: Parameter<number, {label: string}>
}>

function NodeStory(props: NodeStoryProps) {
  const snapshot = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  const [collapsed, setCollapsed] = useState(props.route.endsWith("/collapsed") || props.route.endsWith("/parameters-collapsed"))
  const [visible, setVisible] = useState(!props.route.endsWith("/content-hidden") && !props.route.endsWith("/collapsed"))
  const [width, setWidth] = useState(240)
  const content = props.route.startsWith("content/") || props.route.endsWith("/preview")
  const authored = props.route.endsWith("/authored-content")
  const empty = props.route.endsWith("/empty") || authored
  const node = snapshot.nodes[0]!
  const displayed = empty ? {...node, parameters: [], sockets: []} : node
  const geometry = planProjectedNodeGeometry(displayed, width, undefined, undefined, {
    kind: content ? "content" : "parameter",
    collapsed,
    contentVisible: content && visible,
    height: 100,
  })
  return <section
    aria-label="Композиция ноды"
    style={css`
      display: flex;
      flex-direction: column;
      width: 680px;
      max-width: 100%;
      gap: 16px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <Button
      label="Изменить ширину"
      onClick={() => setWidth(value => value === 240 ? 320 : 240)}
    />
    <div style={css`
      position: relative;
      width: 100%;
      height: ${geometry.height}px;
      overflow: visible;
    `}>
      {!content ? <ParameterNode
        id={node.id}
        label="Нода с параметрами"
        rect={{x: 0, y: 0, width: geometry.width, height: geometry.height}}
        parameters={displayed.parameters}
        sockets={displayed.sockets}
        parameterStore={id => props.store.parameter(node.id, id)}
        collapsed={collapsed}
        selected={props.route.endsWith("/states")}
        onCollapseChange={setCollapsed}
        onParameterInput={change => props.value.set(change.value as number)}
        onParameterChange={change => props.value.set(change.value as number)}
      >
        {authored ? <Typography text="Авторский компонент" /> : null}
      </ParameterNode> : null}
      {content ? <ContentNode
        id={node.id}
        label="Нода с содержимым"
        rect={{x: 0, y: 0, width: geometry.width, height: geometry.height}}
        parameters={displayed.parameters}
        sockets={displayed.sockets}
        parameterStore={id => props.store.parameter(node.id, id)}
        collapsed={collapsed}
        contentVisible={visible}
        onCollapseChange={setCollapsed}
        onContentVisibleChange={setVisible}
        onParameterInput={change => props.value.set(change.value as number)}
        onParameterChange={change => props.value.set(change.value as number)}
      >
        <InteractiveContent />
      </ContentNode> : null}
    </div>
    <output aria-label="Состояния ноды">{`Параметры: ${collapsed ? "свёрнуты" : "развёрнуты"}; содержимое: ${visible ? "открыто" : "закрыто"}; ширина: ${width}`}</output>
    <output aria-label="Значение ноды">{String(props.value.value)}</output>
  </section>
}

function sourceFor(route: string): string {
  const content = route.startsWith("content/") || route.endsWith("/preview")
  const authored = route.endsWith("/authored-content")
  const empty = route.endsWith("/empty") || authored
  const collapsed = route.endsWith("/collapsed") || route.endsWith("/parameters-collapsed")
  const visible = !route.endsWith("/content-hidden") && !route.endsWith("/collapsed")
  return [
    `import {${content ? "ContentNode" : "ParameterNode"}} from "@nodes/node/${content ? "content" : "parameter"}"`,
    'import {planProjectedNodeGeometry} from "@nodes/node/geometry"',
    'import {Typography} from "@zavx0z/ui/typography"',
    'import {useState} from "@zavx0z/component"',
    'export function Example() {',
    `  const [collapsed, setCollapsed] = useState(${collapsed})`,
    `  const [visible, setVisible] = useState(${visible})`,
    '  const node = {',
    '    id: "example",',
    `    parameters: ${empty ? '[]' : '[{id: "value", value: 2.5, revision: 0, presentation: {label: "Число"}}]'},`,
    '    sockets: [],',
    '  }',
    `  const geometry = planProjectedNodeGeometry(node, 240, undefined, undefined, {collapsed, contentVisible: ${content ? 'visible' : 'false'}})`,
    `  return <${content ? "ContentNode" : "ParameterNode"}`,
    '    id={node.id}',
    '    label="Нода"',
    '    parameters={node.parameters}',
    '    rect={{x: 0, y: 0, width: geometry.width, height: geometry.height}}',
    '    collapsed={collapsed}',
    '    onCollapseChange={setCollapsed}',
    ...(content ? [
      '    contentVisible={visible}',
      '    onContentVisibleChange={setVisible}',
      '  >',
      '    <Typography text="Любое содержимое" />',
      '  </ContentNode>',
    ] : authored ? ['  >', '    <Typography text="Авторский компонент" />', '  </ParameterNode>'] : ['  />']),
    '}',
  ].join("\n")
}
