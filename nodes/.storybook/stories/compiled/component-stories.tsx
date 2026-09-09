import {createRoot, useMemo, useState, useSyncExternalStore} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import {createNodeTree, createNodeTreeExternalStore, type NodeJsonValue, type NodeTreeSnapshot} from "@nodes/tree"
import {layoutFixed} from "@nodes/layout/fixed"
import {Node, planProjectedNodeGeometry} from "@webxr/nodes/node"
import {NodeTree, nodeSocketLayoutPortId, socketKey, type NodeTreeSelection, type NodeTreeTransform} from "@webxr/nodes/node-tree"
import {NodeEditor} from "@webxr/nodes/node-editor"
import {NumberParameter} from "@nodes/parameters/number"
import {Frame} from "@webxr/nodes/frame"
import {Link, createCubicLinkRoute, type LinkDefinition} from "@webxr/nodes/link"
import {Button} from "@zavx0z/ui/buttons/button"
import {parameterFixture} from "../../../parameters/.storybook/stories/fixtures/parameters.ts"
import {mountNodesStory} from "../mount.ts"

export function createComponentStory(document: Document, route: string) {
  const [, component, variant] = route.split("/")
  if (!["node", "frame", "link", "node-tree", "node-editor"].includes(component!)) throw new Error(`Неизвестный компонент: ${route}`)
  if (component === "link") {
    const staging = document.createElement("div")
    const root = createRoot(staging)
    try {
      root.render(<LinkStory
        variant={variant!}
      />)
    } catch (error) {
      root.unmount()
      throw error
    }
    return mountNodesStory(document, route, staging, root, linkSource(variant!), {component: "Link", variant})
  }
  if (component === "frame") {
    const staging = document.createElement("div")
    const root = createRoot(staging)
    try {
      root.render(<FrameStory
        variant={variant!}
      />)
    } catch (error) {
      root.unmount()
      throw error
    }
    return mountNodesStory(document, route, staging, root, frameSource(variant!), {component: "Frame", variant})
  }
  const graph = createGraphFixture(component === "node" && variant === "empty")
  const staging = document.createElement("div")
  const root = createRoot(staging)
  try {
    root.render(<GraphStory
      component={component!}
      variant={variant!}
      graph={graph}
    />)
  } catch (error) {
    try { root.unmount() } finally { graph.tree.dispose() }
    throw error
  }
  return mountNodesStory(document, route, staging, root, graphSource(component!, variant!), {component, variant}, () => graph.tree.dispose())
}

function createGraphFixture(empty: boolean) {
  const source = parameterFixture("number", "field")
  const target = parameterFixture("number", "field")
  const message = parameterFixture("text", "field", "message")
  const type = {id: "float", version: 1}
  const tree = createNodeTree({nodes: [
    {
      id: "source",
      metadata: {label: "Источник", category: "Данные", headerColor: "#5b466b"},
      parameters: empty ? [] : [source, message],
      sockets: empty ? [] : [{id: "out", parameterId: "value", direction: "output", side: "right", valueType: type}],
    },
    {
      id: "target",
      metadata: {label: "Получатель", category: "Данные", headerColor: "#4b5f72"},
      parameters: [target],
      sockets: [{id: "in", parameterId: "value", direction: "input", side: "left", valueType: type}],
    },
  ], links: empty ? [] : [{
    id: "value-link",
    from: {nodeId: "source", socketId: "out"},
    to: {nodeId: "target", socketId: "in"},
  }]})
  return {tree, store: createNodeTreeExternalStore(tree), source, target}
}

type GraphFixture = ReturnType<typeof createGraphFixture>

function GraphStory(props: Readonly<{component: string; variant: string; graph: GraphFixture}>) {
  const {tree, store, source} = props.graph
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [selected, setSelected] = useState<NodeTreeSelection>(props.variant === "states" ? {kind: "node", id: "source"} : null)
  const [collapsed, setCollapsed] = useState(props.variant === "collapsed")
  const [preview, setPreview] = useState(props.variant === "preview")
  const [farViewport, setFarViewport] = useState(false)
  const [transform, setTransform] = useState<NodeTreeTransform>({x: 24, y: 24, scale: 1})
  const [lastAction, setLastAction] = useState("Выберите ноду или измените значение")
  const layout = useMemo(() => graphLayout(snapshot), [snapshot])
  const node = snapshot.nodes[0]!
  const geometry = planProjectedNodeGeometry(node, 320)
  const sourceValue = node.parameters.find(parameter => parameter.id === "value")?.value ?? 0
  const viewportLabel = farViewport ? "Вернуть область" : "Увести область"
  const change = (input: Readonly<{nodeId: string; parameterId: string; value: NodeJsonValue}>) => {
    tree.parameter(input.nodeId, input.parameterId).set(input.value)
    setLastAction(`${input.nodeId}/${input.parameterId}: ${JSON.stringify(input.value)}`)
  }
  const addNode = () => {
    const id = `extra-${tree.nodes.length}`
    const parameter = parameterFixture("number", "field")
    tree.reconcile({expectedRevision: tree.revision, definition: {
      ...tree.definition(),
      nodes: [...tree.nodes, {
        id,
        parameters: [parameter],
        metadata: {label: `Нода ${tree.nodes.length + 1}`, category: "Данные", headerColor: "#4b5f72"},
      }],
    }})
    setLastAction(`Добавлена ${id}`)
  }
  return <section
    aria-label={`Пример ${props.component}`}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 820px;
      max-width: 100%;
      gap: 12px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <div style={css`
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    `}>
      {props.variant !== "empty" ? <Button
        label="Изменить значение Store"
        onClick={() => source.set(typeof source.value === "number" ? source.value + 1 : 1)}
      /> : null}
      {props.variant === "topology" ? <Button
        label="Добавить ноду"
        onClick={addNode}
      /> : null}
      {props.variant === "viewport" ? <Button
        label={viewportLabel}
        onClick={() => setFarViewport(value => !value)}
      /> : null}
    </div>
    <p hidden={props.variant !== "topology"}>
      Добавление ноды обновляет модель и раскладку одной согласованной проекцией.
      Уцелевшие ноды, поля и Parameter Store сохраняют identity.
    </p>
    <div style={css`
      position: relative;
      width: 100%;
      height: 480px;
      min-height: 480px;
      overflow: hidden;
    `}>
      {props.component === "node" && props.variant === "authored-content" ? <Node
        id={node.id}
        label="Авторская нода"
        rect={{x: 24, y: 24, width: 320, height: geometry.height}}
        selected={selected?.id === node.id}
        onActivate={() => setSelected({kind: "node", id: node.id})}
      >
        <NumberParameter
          id="value"
          nodeId={node.id}
          label="Авторская композиция"
          value={typeof sourceValue === "number" ? sourceValue : 0}
          onInput={value => source.set(value)}
          onChange={value => source.set(value)}
        />
      </Node> : null}
      {props.component === "node" && props.variant !== "authored-content" ? <Node
        id={node.id}
        label={props.variant === "empty" ? "Пустая нода" : "Источник"}
        category="Компоненты"
        rect={{x: 24, y: preview ? 132 : 24, width: 320, height: geometry.height}}
        selected={selected?.id === node.id}
        collapsed={collapsed}
        preview={{enabled: preview, image: {src: previewImage(), width: 160, height: 90, alt: "Градиент примера"}}}
        parameters={node.parameters}
        sockets={node.sockets}
        parameterStore={id => store.parameter(node.id, id)}
        onActivate={() => setSelected({kind: "node", id: node.id})}
        onCollapseChange={setCollapsed}
        onPreviewChange={setPreview}
        onParameterInput={change}
        onParameterChange={change}
        onSocketActivate={id => setLastAction(`Сокет ${id}`)}
      /> : null}
      {props.component === "node-tree" ? <NodeTree
        store={store}
        layout={layout}
        label="Живая проекция"
        transform={transform}
        viewport={farViewport ? {x: 10_000, y: 10_000, width: 760, height: 480, overscan: 0} : undefined}
        selection={selected}
        onSelectionChange={setSelected}
        onParameterInput={change}
        onParameterChange={change}
        onSocketActivate={(nodeId, socketId) => setLastAction(`${nodeId}/${socketId}`)}
      /> : null}
      {props.component === "node-editor" ? <NodeEditor
        store={store}
        layout={layout}
        title="Живой редактор нод"
        label="Живой редактор нод"
        width={760}
        height={480}
        interactive={props.variant !== "readonly"}
        transform={props.variant === "controlled" ? transform : undefined}
        selection={props.variant === "controlled" ? selected : undefined}
        onTransformChange={(next) => {
          setTransform(next)
          setLastAction(`Масштаб: ${Math.round(next.scale * 100)}%`)
        }}
        onSelectionChange={(next) => {
          setSelected(next)
          setLastAction(next === null ? "Выбор снят" : `${next.kind}: ${next.id}`)
        }}
        onParameterInput={change}
        onParameterChange={change}
        onSocketActivate={(nodeId, socketId) => setLastAction(`${nodeId}/${socketId}`)}
      /> : null}
    </div>
    <output aria-label="Состояние графа">{`Нод: ${snapshot.nodes.length}; revision: ${snapshot.revision}; value: ${JSON.stringify(sourceValue)}`}</output>
    <output aria-label="Действие редактора">{lastAction}</output>
  </section>
}

function graphLayout(snapshot: NodeTreeSnapshot) {
  const connected = new Set(snapshot.links.flatMap(link => [
    socketKey(link.from.nodeId, link.from.socketId),
    socketKey(link.to.nodeId, link.to.socketId),
  ]))
  const plans = snapshot.nodes.map(node => ({node, geometry: planProjectedNodeGeometry(node, 280, connected)}))
  return layoutFixed({
    viewport: {width: 900, height: 600},
    nodes: plans.map(({node, geometry}) => ({id: node.id, width: geometry.width, height: geometry.height})),
    ports: plans.flatMap(({node, geometry}) => geometry.sockets.map(socket => ({...socket, nodeId: node.id}))),
    edges: snapshot.links.map(link => ({
      id: link.id,
      sourcePortId: nodeSocketLayoutPortId(link.from.nodeId, link.from.socketId),
      targetPortId: nodeSocketLayoutPortId(link.to.nodeId, link.to.socketId),
    })),
  })
}

function FrameStory(props: Readonly<{variant: string}>) {
  const [selected, setSelected] = useState<string | null>(props.variant === "states" ? "outer" : null)
  return <section
    aria-label="Рамки"
    style={css`
      position: relative;
      width: 480px;
      height: 280px;
    `}
  >
    <Frame
      id="outer"
      label="Группа"
      rect={{x: 16, y: 16, width: 440, height: 240}}
      selected={selected === "outer"}
      onActivate={() => setSelected(value => value === "outer" ? null : "outer")}
    >
      {props.variant === "nested" ? <Frame
        id="inner"
        parentFrameId="outer"
        label="Вложенная группа"
        rect={{x: 24, y: 48, width: 340, height: 150}}
        selected={selected === "inner"}
        onActivate={event => {
          event.stopPropagation()
          setSelected(value => value === "inner" ? null : "inner")
        }}
      >
        <FrameContent />
      </Frame> : <FrameHint />}
    </Frame>
  </section>
}

function FrameHint() {
  return <p>Нажмите на рамку, чтобы изменить выбор.</p>
}

function FrameContent() {
  return <p>Содержимое вложенной Frame</p>
}

function LinkStory(props: Readonly<{variant: string}>) {
  const store = useMemo(() => linkStore(props.variant), [props.variant])
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return <section
    aria-label="Связи"
    style={css`
      display: flex;
      flex-direction: column;
      width: 440px;
      gap: 12px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <Button
      label="Изменить маршрут и выбор"
      onClick={() => store.update(!snapshot.selected, snapshot.route.kind !== "path")}
    />
    <div style={css`
      position: relative;
      width: 400px;
      height: 150px;
      border: 1px solid var(--widget-regular-outline);
    `}>
      <Link
        id="example-link"
        title="Пример связи"
        route={snapshot.route}
        store={store}
        onActivate={() => store.update(!snapshot.selected, snapshot.route.kind === "path")}
      />
    </div>
    <output aria-label="Состояние Link">{`${snapshot.route.kind}; selected=${snapshot.selected === true}`}</output>
  </section>
}

function linkStore(variant: string) {
  let value: LinkDefinition = {
    id: "example-link",
    title: "Пример связи",
    kind: "float",
    route: routeFor(variant === "cubic"),
    selected: variant === "states",
    disabled: variant === "disabled",
  }
  const listeners = new Set<() => void>()
  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    getSnapshot: () => value,
    update(selected: boolean, cubic: boolean) {
      value = {...value, selected, route: routeFor(cubic)}
      for (const listener of listeners) listener()
    },
  }
}

function routeFor(cubic: boolean): LinkDefinition["route"] {
  return cubic ? createCubicLinkRoute([{
    startPoint: {x: 20, y: 30},
    controlPoints: [{x: 160, y: 30}, {x: 240, y: 120}],
    endPoint: {x: 380, y: 120},
  }]) : {kind: "orthogonal", points: [{x: 20, y: 30}, {x: 200, y: 30}, {x: 200, y: 120}, {x: 380, y: 120}]}
}

function previewImage(): string {
  return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#4b5f72"/><circle cx="80" cy="45" r="30" fill="#946be0"/></svg>')}`
}

function linkSource(variant: string): string {
  return [
    'import {createRoot, useMemo, useSyncExternalStore} from "@zavx0z/component"',
    'import type {HTMLElement} from "@zavx0z/dom"',
    'import {Link, createCubicLinkRoute, type LinkDefinition} from "@webxr/nodes/link"',
    'import {Button} from "@zavx0z/ui/buttons/button"',
    "",
    'function routeFor(cubic: boolean): LinkDefinition["route"] {',
    "  return cubic ? createCubicLinkRoute([{",
    "    startPoint: {x: 20, y: 30},",
    "    controlPoints: [{x: 160, y: 30}, {x: 240, y: 120}],",
    "    endPoint: {x: 380, y: 120},",
    '  }]) : {kind: "orthogonal", points: [{x: 20, y: 30}, {x: 200, y: 30}, {x: 200, y: 120}, {x: 380, y: 120}]}',
    "}",
    "",
    "function Example() {",
    "  const store = useMemo(() => {",
    "    let value: LinkDefinition = {",
    '      id: "example-link",',
    '      title: "Пример связи",',
    '      kind: "float",',
    `      route: routeFor(${variant === "cubic"}),`,
    `      selected: ${variant === "states"},`,
    `      disabled: ${variant === "disabled"},`,
    "    }",
    "    const listeners = new Set<() => void>()",
    "    return {",
    "      getSnapshot: () => value,",
    "      subscribe(listener: () => void) {",
    "        listeners.add(listener)",
    "        return () => { listeners.delete(listener) }",
    "      },",
    "      update(selected: boolean, cubic: boolean) {",
    "        value = {...value, selected, route: routeFor(cubic)}",
    "        for (const listener of listeners) listener()",
    "      },",
    "    }",
    "  }, [])",
    "  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)",
    "  return <section",
    '    aria-label="Связи"',
    "    style={css`",
    "      display: flex;",
    "      flex-direction: column;",
    "      width: 440px;",
    "      gap: 12px;",
    "      padding: 16px;",
    "      color: var(--widget-regular-content);",
    "    `}",
    "  >",
    "    <Button",
    '      label="Изменить маршрут и выбор"',
    '      onClick={() => store.update(!snapshot.selected, snapshot.route.kind !== "path")}',
    "    />",
    "    <div style={css`",
    "      position: relative;",
    "      width: 400px;",
    "      height: 150px;",
    "      border: 1px solid var(--widget-regular-outline);",
    "    `}>",
    "      <Link",
    '        id="example-link"',
    '        title="Пример связи"',
    "        route={snapshot.route}",
    "        store={store}",
    '        onActivate={() => store.update(!snapshot.selected, snapshot.route.kind === "path")}',
    "      />",
    "    </div>",
    '    <output aria-label="Состояние Link">{snapshot.route.kind + "; selected=" + (snapshot.selected === true)}</output>',
    "  </section>",
    "}",
    "",
    "// container принадлежит Display текущего Experience.",
    "export function mountExample(container: HTMLElement) {",
    "  const root = createRoot(container)",
    "  try {",
    "    root.render(<Example />)",
    "  } catch (error) {",
    "    root.unmount()",
    "    throw error",
    "  }",
    "  return () => root.unmount()",
    "}",
  ].join("\n")
}

function frameSource(variant: string): string {
  return [
    'import {createRoot, useState} from "@zavx0z/component"',
    'import type {HTMLElement} from "@zavx0z/dom"',
    'import {Frame} from "@webxr/nodes/frame"',
    "",
    "function FrameContent() {",
    `  return <p>${variant === "nested" ? "Содержимое вложенной Frame" : "Нажмите на рамку, чтобы изменить выбор."}</p>`,
    "}",
    "",
    "function Example() {",
    `  const [selected, setSelected] = useState<string | null>(${variant === "states" ? '"outer"' : "null"})`,
    "  return <section",
    '    aria-label="Рамки"',
    "    style={css`",
    "      position: relative;",
    "      width: 480px;",
    "      height: 280px;",
    "    `}",
    "  >",
    "    <Frame",
    '      id="outer"',
    '      label="Группа"',
    "      rect={{x: 16, y: 16, width: 440, height: 240}}",
    '      selected={selected === "outer"}',
    '      onActivate={() => setSelected(value => value === "outer" ? null : "outer")}',
    "    >",
    ...(variant === "nested" ? [
      "      <Frame",
      '        id="inner"',
      '        parentFrameId="outer"',
      '        label="Вложенная группа"',
      "        rect={{x: 24, y: 48, width: 340, height: 150}}",
      '        selected={selected === "inner"}',
      "        onActivate={event => {",
      "          event.stopPropagation()",
      '          setSelected(value => value === "inner" ? null : "inner")',
      "        }}",
      "      >",
      "        <FrameContent />",
      "      </Frame>",
    ] : ["      <FrameContent />"]),
    "    </Frame>",
    "  </section>",
    "}",
    "",
    "// container принадлежит Display текущего Experience.",
    "export function mountExample(container: HTMLElement) {",
    "  const root = createRoot(container)",
    "  try {",
    "    root.render(<Example />)",
    "  } catch (error) {",
    "    root.unmount()",
    "    throw error",
    "  }",
    "  return () => root.unmount()",
    "}",
  ].join("\n")
}

function graphSource(component: string, variant: string): string {
  const api = component === "node" ? "Node" : component === "node-tree" ? "NodeTree" : "NodeEditor"
  const authored = component === "node" && variant === "authored-content"
  const number = parameterFixture("number", "field")
  const message = parameterFixture("text", "field", "message")
  const empty = component === "node" && variant === "empty"
  return [
    'import {createRoot, useMemo, useState, useSyncExternalStore} from "@zavx0z/component"',
    'import type {HTMLElement} from "@zavx0z/dom"',
    'import {createNodeTree, createNodeTreeExternalStore, Parameter, type NodeJsonValue, type NodeTreeSnapshot} from "@nodes/tree"',
    `import {${component === "node" ? "Node, planProjectedNodeGeometry" : "planProjectedNodeGeometry"}} from "@webxr/nodes/node"`,
    `import {${component === "node-tree" ? "NodeTree, " : ""}${component !== "node" ? "nodeSocketLayoutPortId, socketKey, " : ""}type NodeTreeSelection, type NodeTreeTransform} from "@webxr/nodes/node-tree"`,
    ...(component === "node-editor" ? ['import {NodeEditor} from "@webxr/nodes/node-editor"'] : []),
    ...(component !== "node" ? ['import {layoutFixed} from "@nodes/layout/fixed"'] : []),
    ...(authored ? ['import {NumberParameter} from "@nodes/parameters/number"'] : []),
    'import {Button} from "@zavx0z/ui/buttons/button"',
    "",
    "function numberParameter() {",
    `  return new Parameter<NodeJsonValue, NodeJsonValue>("value", ${JSON.stringify(number.value)}, ${JSON.stringify(number.presentation)}, ${JSON.stringify(number.valueType)})`,
    "}",
    "",
    "function createExampleModel() {",
    "  const source = numberParameter()",
    "  const target = numberParameter()",
    `  const message = new Parameter<NodeJsonValue, NodeJsonValue>("message", ${JSON.stringify(message.value)}, ${JSON.stringify(message.presentation)}, ${JSON.stringify(message.valueType)})`,
    '  const valueType = {id: "float", version: 1}',
    "  const tree = createNodeTree({",
    "    nodes: [",
    "      {",
    '        id: "source",',
    '        metadata: {label: "Источник", category: "Данные", headerColor: "#5b466b"},',
    `        parameters: ${empty ? "[]" : "[source, message]"},`,
    `        sockets: ${empty ? "[]" : '[{id: "out", parameterId: "value", direction: "output", side: "right", valueType}]'},`,
    "      },",
    "      {",
    '        id: "target",',
    '        metadata: {label: "Получатель", category: "Данные", headerColor: "#4b5f72"},',
    "        parameters: [target],",
    '        sockets: [{id: "in", parameterId: "value", direction: "input", side: "left", valueType}],',
    "      },",
    "    ],",
    `    links: ${empty ? "[]" : '[{id: "value-link", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}]'},`,
    "  })",
    "  const store = createNodeTreeExternalStore(tree)",
    "  return {tree, store, source}",
    "}",
    "",
    "type ExampleModel = ReturnType<typeof createExampleModel>",
    "",
    "function Example(props: Readonly<{model: ExampleModel}>) {",
    "    const {tree, store, source} = props.model",
    "    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)",
    `    const [selected, setSelected] = useState<NodeTreeSelection>(${variant === "states" ? '{kind: "node", id: "source"}' : "null"})`,
    `    const [collapsed, setCollapsed] = useState(${variant === "collapsed"})`,
    `    const [preview, setPreview] = useState(${variant === "preview"})`,
    "    const [farViewport, setFarViewport] = useState(false)",
    "    const [transform, setTransform] = useState<NodeTreeTransform>({x: 24, y: 24, scale: 1})",
    '    const [lastAction, setLastAction] = useState("Выберите ноду или измените значение")',
    ...(component === "node" ? [] : ["    const layout = useMemo(() => graphLayout(snapshot), [snapshot])"]),
    "    const node = snapshot.nodes[0]!",
    ...(component === "node" ? ["    const geometry = planProjectedNodeGeometry(node, 320)"] : []),
    '    const sourceValue = node.parameters.find(parameter => parameter.id === "value")?.value ?? 0',
    ...(variant === "viewport" ? ['    const viewportLabel = farViewport ? "Вернуть область" : "Увести область"'] : []),
    "    const change = (input: Readonly<{nodeId: string; parameterId: string; value: NodeJsonValue}>) => {",
    "      tree.parameter(input.nodeId, input.parameterId).set(input.value)",
    '      setLastAction(input.nodeId + "/" + input.parameterId + ": " + JSON.stringify(input.value))',
    "    }",
    ...(variant === "topology" ? [
      "    // Nodes ожидает согласованную геометрию перед публикацией новой topology.",
      "    // Этот сценарий сохраняет воспроизведение; обход в примере не добавлен.",
      "    const addNode = () => {",
      '      const id = "extra-" + tree.nodes.length',
      "      tree.reconcile({expectedRevision: tree.revision, definition: {",
      "        ...tree.definition(),",
      "        nodes: [...tree.nodes, {",
      "          id,",
      "          parameters: [numberParameter()],",
      '          metadata: {label: "Нода " + (tree.nodes.length + 1), category: "Данные", headerColor: "#4b5f72"},',
      "        }],",
      "      }})",
      '      setLastAction("Добавлена " + id)',
      "    }",
    ] : []),
    "    return <section",
    `      aria-label="Пример ${component}"`,
    "      style={css`",
    "        box-sizing: border-box;",
    "        display: flex;",
    "        flex-direction: column;",
    "        width: 820px;",
    "        max-width: 100%;",
    "        gap: 12px;",
    "        padding: 16px;",
    "        color: var(--widget-regular-content);",
    "      `}",
    "    >",
    "      <div style={css`",
    "        display: flex;",
    "        flex-direction: row;",
    "        flex-wrap: wrap;",
    "        gap: 8px;",
    "      `}>",
    ...(!empty ? [
      "        <Button",
      '          label="Изменить значение Store"',
      '          onClick={() => source.set(typeof source.value === "number" ? source.value + 1 : 1)}',
      "        />",
    ] : []),
    ...(variant === "topology" ? [
      "        <Button",
      '          label="Добавить ноду"',
      "          onClick={addNode}",
      "        />",
    ] : []),
    ...(variant === "viewport" ? [
      "        <Button",
      "          label={viewportLabel}",
      "          onClick={() => setFarViewport(value => !value)}",
      "        />",
    ] : []),
    "      </div>",
    `      <p hidden={${variant !== "topology"}}>`,
    "        Добавление ноды обновляет модель и раскладку одной согласованной проекцией.",
    "        Уцелевшие ноды, поля и Parameter Store сохраняют identity.",
    "      </p>",
    "      <div style={css`",
    "        position: relative;",
    "        width: 100%;",
    "        height: 480px;",
    "        min-height: 480px;",
    "        overflow: hidden;",
    "      `}>",
    ...(component === "node" ? [
      "        <Node",
      "          id={node.id}",
      `          label="${authored ? "Авторская нода" : empty ? "Пустая нода" : "Источник"}"`,
      ...(!authored ? ['          category="Компоненты"'] : []),
      `          rect={{x: 24, y: ${authored ? "24" : "preview ? 132 : 24"}, width: 320, height: geometry.height}}`,
      "          selected={selected?.id === node.id}",
      ...(!authored ? [
        "          collapsed={collapsed}",
        `          preview={{enabled: preview, image: {src: ${JSON.stringify(previewImage())}, width: 160, height: 90, alt: "Градиент примера"}}}`,
        "          parameters={node.parameters}",
        "          sockets={node.sockets}",
        "          parameterStore={id => store.parameter(node.id, id)}",
      ] : []),
      '          onActivate={() => setSelected({kind: "node", id: node.id})}',
      ...(!authored ? [
        "          onCollapseChange={setCollapsed}",
        "          onPreviewChange={setPreview}",
        "          onParameterInput={change}",
        "          onParameterChange={change}",
        '          onSocketActivate={id => setLastAction("Сокет " + id)}',
        "        />",
      ] : [
        "        >",
        "          <NumberParameter",
        '            id="value"',
        "            nodeId={node.id}",
        '            label="Авторская композиция"',
        '            value={typeof sourceValue === "number" ? sourceValue : 0}',
        "            onInput={value => source.set(value)}",
        "            onChange={value => source.set(value)}",
        "          />",
        "        </Node>",
      ]),
    ] : [
      `        <${api}`,
      "          store={store}",
      "          layout={layout}",
      ...(component === "node-tree" ? [
        '          label="Живая проекция"',
        "          transform={transform}",
        "          viewport={farViewport ? {x: 10_000, y: 10_000, width: 760, height: 480, overscan: 0} : undefined}",
        "          selection={selected}",
        "          onSelectionChange={setSelected}",
      ] : [
        '          title="Живой редактор нод"',
        '          label="Живой редактор нод"',
        "          width={760}",
        "          height={480}",
        `          interactive={${variant !== "readonly"}}`,
        `          transform={${variant === "controlled" ? "transform" : "undefined"}}`,
        `          selection={${variant === "controlled" ? "selected" : "undefined"}}`,
        "          onTransformChange={next => {",
        "            setTransform(next)",
        '            setLastAction("Масштаб: " + Math.round(next.scale * 100) + "%")',
        "          }}",
        "          onSelectionChange={next => {",
        "            setSelected(next)",
        '            setLastAction(next === null ? "Выбор снят" : next.kind + ": " + next.id)',
        "          }}",
      ]),
      "          onParameterInput={change}",
      "          onParameterChange={change}",
      '          onSocketActivate={(nodeId, socketId) => setLastAction(nodeId + "/" + socketId)}',
      "        />",
    ]),
    "      </div>",
    '      <output aria-label="Состояние графа">{"Нод: " + snapshot.nodes.length + "; revision: " + snapshot.revision + "; value: " + JSON.stringify(sourceValue)}</output>',
    '      <output aria-label="Действие редактора">{lastAction}</output>',
    "    </section>",
    "}",
    "",
    "// container принадлежит Display текущего Experience.",
    "export function mountExample(container: HTMLElement) {",
    "  const model = createExampleModel()",
    "  const root = createRoot(container)",
    "  try {",
    "    root.render(<Example model={model} />)",
    "  } catch (error) {",
    "    try { root.unmount() } finally { model.tree.dispose() }",
    "    throw error",
    "  }",
    "  return () => {",
    "    try { root.unmount() } finally { model.tree.dispose() }",
    "  }",
    "}",
    ...(component === "node" ? [] : [
      "",
      "function graphLayout(snapshot: NodeTreeSnapshot) {",
      "  const connected = new Set(snapshot.links.flatMap(link => [",
      "    socketKey(link.from.nodeId, link.from.socketId),",
      "    socketKey(link.to.nodeId, link.to.socketId),",
      "  ]))",
      "  const plans = snapshot.nodes.map(node => ({node, geometry: planProjectedNodeGeometry(node, 280, connected)}))",
      "  return layoutFixed({",
      "    viewport: {width: 900, height: 600},",
      "    nodes: plans.map(({node, geometry}) => ({id: node.id, width: geometry.width, height: geometry.height})),",
      "    ports: plans.flatMap(({node, geometry}) => geometry.sockets.map(socket => ({...socket, nodeId: node.id}))),",
      "    edges: snapshot.links.map(link => ({",
      "      id: link.id,",
      "      sourcePortId: nodeSocketLayoutPortId(link.from.nodeId, link.from.socketId),",
      "      targetPortId: nodeSocketLayoutPortId(link.to.nodeId, link.to.socketId),",
      "    })),",
      "  })",
      "}",
    ]),
  ].join("\n")
}
