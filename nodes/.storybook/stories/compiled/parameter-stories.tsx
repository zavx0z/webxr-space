import {createRoot, useState, useSyncExternalStore} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import {Button} from "@zavx0z/ui/buttons/button"
import {createNodeTree, createNodeTreeExternalStore, type NodeJsonValue, type Parameter as ParameterStore} from "@zavx0z/nodetree"
import {
  Parameter,
  TextParameter,
  NumberParameter,
  SliderParameter,
  CheckboxParameter,
  SwitchParameter,
  SelectParameter,
  CycleParameter,
  OptionGroupParameter,
  ColorParameter,
  VectorParameter,
  MatrixParameter,
  PathParameter,
  ReferenceParameter,
  CollectionParameter,
  OutputParameter,
  resolveProjectedParameterPresentation,
  type ParameterBaseProps,
  type ParameterEndpoint,
} from "@zavx0z/nodes/parameter"
import {PARAMETER_EXAMPLES, parameterFixture, type ParameterMechanism} from "../fixtures/parameters.ts"
import {mountNodesStory} from "../mount.ts"

export function createParameterStory(document: Document, route: string) {
  const [, mechanism, variant] = route.split("/")
  if (!Object.hasOwn(PARAMETER_EXAMPLES, mechanism!)) throw new Error(`Неизвестный Parameter: ${route}`)
  if (!["field", "input", "output", "both", "connected", "disabled", "readonly", "projected", "geometry"].includes(variant!)) {
    throw new Error(`Неизвестный вариант Parameter: ${route}`)
  }
  const kind = mechanism as ParameterMechanism
  const parameter = parameterFixture(kind, variant!)
  const tree = createNodeTree({nodes: [{id: "parameter-example", parameters: [parameter]}]})
  const store = createNodeTreeExternalStore(tree).parameter("parameter-example", "value")
  const example = PARAMETER_EXAMPLES[kind]
  const staging = document.createElement("div")
  const root = createRoot(staging)
  try {
    root.render(<ParameterStory
      mechanism={kind}
      variant={variant!}
      parameter={parameter}
      store={store}
    />)
  } catch (error) {
    try { root.unmount() } finally { tree.dispose() }
    throw error
  }
  return mountNodesStory(document, route, staging, root, parameterSource(kind, variant!), {
    mechanism: kind,
    variant,
    api: variant === "projected" ? "Parameter" : example.api,
    valueType: parameter.valueType,
    initialValue: parameter.value,
  }, () => tree.dispose())
}

type ParameterStoryProps = Readonly<{
  mechanism: ParameterMechanism
  variant: string
  parameter: ParameterStore<NodeJsonValue, NodeJsonValue>
  store: ReturnType<ReturnType<typeof createNodeTreeExternalStore>["parameter"]>
}>

function ParameterStory(props: ParameterStoryProps) {
  const snapshot = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  const [lastAction, setLastAction] = useState("Значение ещё не изменялось")
  const example = PARAMETER_EXAMPLES[props.mechanism]
  const resolved = resolveProjectedParameterPresentation(snapshot)
  const valueType = snapshot.valueType
  if (valueType === undefined) throw new Error("Пример Parameter должен объявить тип значения")
  const endpoints: readonly ParameterEndpoint[] = props.variant === "input" || props.variant === "connected"
    ? [{id: "in", kind: socketKind(props.mechanism), direction: "input", side: "left", label: "Вход", connected: props.variant === "connected"}]
    : props.variant === "output"
      ? [{id: "out", kind: socketKind(props.mechanism), direction: "output", side: "right", label: "Выход"}]
      : props.variant === "both" || props.variant === "projected"
        ? [
            {id: "in", kind: socketKind(props.mechanism), direction: "input", side: "left", label: "Вход"},
            {id: "out", kind: socketKind(props.mechanism), direction: "output", side: "right", label: "Выход"},
          ]
        : []
  const common: ParameterBaseProps = {
    id: "value",
    nodeId: "parameter-example",
    label: example.label,
    sockets: endpoints,
    connected: props.variant === "connected",
    disabled: props.variant === "disabled",
    readOnly: props.variant === "readonly",
    onSocketActivate: id => setLastAction(`Сокет: ${id}`),
  }
  const change = (value: NodeJsonValue) => {
    props.parameter.set(value)
    setLastAction(`Изменение: ${JSON.stringify(value)}`)
  }
  return <section
    aria-label={`${example.label}: Parameter`}
    data-parameter-mechanism={props.mechanism}
    data-parameter-variant={props.variant}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 480px;
      min-width: 0;
      gap: 16px;
      padding: 16px 24px;
      color: var(--widget-regular-content);
    `}
  >
    <strong>{example.api}</strong>
    <div style={css`
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      gap: 8px;
    `}>
      {props.variant === "projected" ? <Parameter
        nodeId="parameter-example"
        snapshot={snapshot}
        store={props.store}
        sockets={endpoints.map(endpoint => ({
          id: endpoint.id,
          direction: endpoint.direction,
          parameterId: "value",
          side: endpoint.side,
          valueType,
        }))}
        onInput={input => change(input.value)}
        onChange={input => change(input.value)}
        onSocketActivate={id => setLastAction(`Сокет: ${id}`)}
      /> : null}
      {props.variant !== "projected" ? <AuthoredParameter
        mechanism={props.mechanism}
        common={common}
        resolved={resolved}
        value={snapshot.value}
        onChange={change}
        onAction={setLastAction}
      /> : null}
      {props.variant === "geometry" && props.mechanism === "matrix" ? <MatrixGeometry /> : null}
      {props.variant === "geometry" && props.mechanism === "vector" ? <VectorGeometry /> : null}
      {props.variant === "geometry" && props.mechanism === "collection" ? <CollectionParameter
        id="collection-small"
        nodeId="geometry"
        label="Одна видимая строка"
        items={resolved.collection!.items}
        selectedId={resolved.collection!.selectedId}
        visibleRows={1}
        readOnly
      /> : null}
    </div>
    <output aria-label="Значение Parameter">{JSON.stringify(snapshot.value)}</output>
    <output aria-label="Версия Parameter">{`revision: ${snapshot.revision}`}</output>
    <output aria-label="Последнее действие">{lastAction}</output>
    <Button
      label="Сбросить значение"
      onClick={() => change(example.value)}
    />
  </section>
}

type AuthoredProps = Readonly<{
  mechanism: ParameterMechanism
  common: ParameterBaseProps
  resolved: ReturnType<typeof resolveProjectedParameterPresentation>
  value: NodeJsonValue
  onChange(value: NodeJsonValue): void
  onAction(value: string): void
}>

function AuthoredParameter(props: AuthoredProps) {
  const p = props.resolved
  return <div style={css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
  `}>
    {props.mechanism === "text" ? <TextParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.stringValue}
      placeholder={p.placeholder}
      onInput={props.onChange}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "number" ? <NumberParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.numberValue}
      step={p.step}
      precision={p.precision}
      onInput={props.onChange}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "slider" ? <SliderParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.numberValue}
      min={p.min!}
      max={p.max!}
      step={p.step}
      onInput={props.onChange}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "checkbox" ? <CheckboxParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      checked={p.booleanValue}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "switch" ? <SwitchParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      checked={p.booleanValue}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "select" ? <SelectParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.stringValue}
      options={p.options!}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "cycle" ? <CycleParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.stringValue}
      options={p.options!}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "option-group" ? <OptionGroupParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.stringValue}
      options={p.options!}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "color" ? <ColorParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.color!}
      onInput={props.onChange}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "vector" ? <VectorParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.vector!}
      axes={p.axes}
      step={p.step}
      onInput={props.onChange}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "matrix" ? <MatrixParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.matrix!}
      step={p.step}
      onInput={props.onChange}
      onChange={props.onChange}
    /> : null}
    {props.mechanism === "path" ? <PathParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.stringValue}
      onInput={props.onChange}
      onChange={props.onChange}
      onBrowse={() => props.onAction("Запрошен выбор пути приложением")}
    /> : null}
    {props.mechanism === "reference" ? <ReferenceParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={p.reference ?? null}
      onActivate={() => props.onAction("Активация ссылки")}
      onPick={() => props.onChange({id: "object-b", label: "Объект B", kind: "object"})}
      onClear={() => props.onChange(null)}
    /> : null}
    {props.mechanism === "collection" ? <CollectionParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      items={p.collection!.items}
      selectedId={p.collection!.selectedId}
      visibleRows={p.collection!.visibleRows}
      onSelect={props.onChange}
      onAdd={() => props.onAction("Запрошено добавление элемента приложением")}
      onRemove={id => props.onAction(`Запрошено удаление: ${id}`)}
      onMove={(id, direction) => props.onAction(`Запрошено перемещение: ${id} ${direction}`)}
    /> : null}
    {props.mechanism === "output" ? <OutputParameter
      id={props.common.id}
      nodeId={props.common.nodeId}
      label={props.common.label}
      sockets={props.common.sockets}
      connected={props.common.connected}
      disabled={props.common.disabled}
      readOnly={props.common.readOnly}
      onSocketActivate={props.common.onSocketActivate}
      value={props.value}
    /> : null}
  </div>
}

function socketKind(mechanism: ParameterMechanism): ParameterEndpoint["kind"] {
  if (mechanism === "number" || mechanism === "slider") return "float"
  if (mechanism === "checkbox" || mechanism === "switch") return "boolean"
  if (mechanism === "select" || mechanism === "cycle" || mechanism === "option-group") return "menu"
  if (mechanism === "text" || mechanism === "path") return "string"
  if (mechanism === "reference") return "object"
  if (mechanism === "output") return "custom"
  return mechanism
}

function MatrixGeometry() {
  return <section
    aria-label="Размеры матриц"
    style={css`
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      min-width: 0;
    `}
  >
    <MatrixParameter
      id="matrix-2"
      nodeId="geometry"
      label="Матрица 2×2"
      value={[[1, 0], [0, 1]]}
      readOnly
    />
    <MatrixParameter
      id="matrix-4"
      nodeId="geometry"
      label="Матрица 4×4"
      value={[[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]}
      readOnly
    />
  </section>
}

function VectorGeometry() {
  return <section
    aria-label="Размеры векторов"
    style={css`
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      min-width: 0;
    `}
  >
    <VectorParameter
      id="vector-2"
      nodeId="geometry"
      label="Вектор 2D"
      value={[1, 2]}
      readOnly
    />
    <VectorParameter
      id="vector-4"
      nodeId="geometry"
      label="Вектор 4D"
      value={[1, 2, 3, 4]}
      readOnly
    />
  </section>
}

function parameterSource(mechanism: ParameterMechanism, variant: string): string {
  const example = PARAMETER_EXAMPLES[mechanism]
  const parameter = parameterFixture(mechanism, variant)
  const api = variant === "projected" ? "Parameter" : example.api
  const endpoints: ParameterEndpoint[] = []
  if (["input", "connected", "both", "projected"].includes(variant)) {
    endpoints.push({id: "in", kind: socketKind(mechanism), direction: "input", side: "left", label: "Вход", connected: variant === "connected"})
  }
  if (["output", "both", "projected"].includes(variant)) {
    endpoints.push({id: "out", kind: socketKind(mechanism), direction: "output", side: "right", label: "Выход"})
  }
  const fieldProps: Record<ParameterMechanism, readonly string[]> = {
    text: ["value={resolved.stringValue}", "placeholder={resolved.placeholder}", "onInput={change}", "onChange={change}"],
    number: ["value={resolved.numberValue}", "step={resolved.step}", "precision={resolved.precision}", "onInput={change}", "onChange={change}"],
    slider: ["value={resolved.numberValue}", "min={resolved.min!}", "max={resolved.max!}", "step={resolved.step}", "onInput={change}", "onChange={change}"],
    checkbox: ["checked={resolved.booleanValue}", "onChange={change}"],
    switch: ["checked={resolved.booleanValue}", "onChange={change}"],
    select: ["value={resolved.stringValue}", "options={resolved.options!}", "onChange={change}"],
    cycle: ["value={resolved.stringValue}", "options={resolved.options!}", "onChange={change}"],
    "option-group": ["value={resolved.stringValue}", "options={resolved.options!}", "onChange={change}"],
    color: ["value={resolved.color!}", "onInput={change}", "onChange={change}"],
    vector: ["value={resolved.vector!}", "axes={resolved.axes}", "step={resolved.step}", "onInput={change}", "onChange={change}"],
    matrix: ["value={resolved.matrix!}", "step={resolved.step}", "onInput={change}", "onChange={change}"],
    path: ["value={resolved.stringValue}", "onInput={change}", "onChange={change}", 'onBrowse={() => console.log("Запрошен выбор пути приложением")}'],
    reference: ["value={resolved.reference ?? null}", 'onActivate={() => console.log("Активация ссылки")}', 'onPick={() => change({id: "object-b", label: "Объект B", kind: "object"})}', "onClear={() => change(null)}"],
    collection: ["items={resolved.collection!.items}", "selectedId={resolved.collection!.selectedId}", "visibleRows={resolved.collection!.visibleRows}", "onSelect={change}", 'onAdd={() => console.log("Запрошено добавление элемента приложением")}', "onRemove={id => console.log(id)}", "onMove={(id, direction) => console.log(id, direction)}"],
    output: ["value={snapshot.value}"],
  }
  const declarations = variant === "projected"
    ? [
        '      nodeId="parameter-example"',
        "      snapshot={snapshot}",
        "      store={store}",
        `      sockets={${JSON.stringify(endpoints.map(endpoint => ({id: endpoint.id, direction: endpoint.direction, side: endpoint.side, parameterId: "value", valueType: parameter.valueType})))}}`,
        "      onInput={input => change(input.value)}",
        "      onChange={input => change(input.value)}",
      ]
    : [
        '      id="value"',
        '      nodeId="parameter-example"',
        `      label=${JSON.stringify(example.label)}`,
        `      sockets={${JSON.stringify(endpoints)}}`,
        `      connected={${String(variant === "connected")}}`,
        `      disabled={${String(variant === "disabled")}}`,
        `      readOnly={${String(variant === "readonly")}}`,
        ...fieldProps[mechanism].map(line => `      ${line}`),
      ]
  const geometryRows: readonly string[][] = variant !== "geometry" ? []
    : mechanism === "matrix" ? [
        ["<MatrixParameter", '  id="matrix-2"', '  nodeId="geometry"', '  label="Матрица 2×2"', "  value={[[1, 0], [0, 1]]}", "  readOnly", "/>"],
        ["<MatrixParameter", '  id="matrix-4"', '  nodeId="geometry"', '  label="Матрица 4×4"', "  value={[[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]}", "  readOnly", "/>"],
      ]
      : mechanism === "vector" ? [
          ["<VectorParameter", '  id="vector-2"', '  nodeId="geometry"', '  label="Вектор 2D"', "  value={[1, 2]}", "  readOnly", "/>"],
          ["<VectorParameter", '  id="vector-4"', '  nodeId="geometry"', '  label="Вектор 4D"', "  value={[1, 2, 3, 4]}", "  readOnly", "/>"],
        ]
        : mechanism === "collection" ? [
            ["<CollectionParameter", '  id="collection-small"', '  nodeId="geometry"', '  label="Одна видимая строка"', "  items={resolved.collection!.items}", "  selectedId={resolved.collection!.selectedId}", "  visibleRows={1}", "  readOnly", "/>"],
          ]
          : []
  const renderLines = [
    "    return <section",
    "      style={css`",
    "        box-sizing: border-box;",
    "        display: flex;",
    "        flex-direction: column;",
    "        width: 100%;",
    "        max-width: 480px;",
    "        min-width: 0;",
    "        gap: 16px;",
    "        padding: 16px 24px;",
    "        color: var(--widget-regular-content);",
    "      `}",
    "    >",
    `      <${api}`,
    ...declarations.map(line => `  ${line}`),
    "      />",
    ...geometryRows.flatMap(lines => lines.map(line => `      ${line}`)),
    '      <output aria-label="Значение Parameter">{JSON.stringify(snapshot.value)}</output>',
    "      <Button",
    '        label="Сбросить значение"',
    `        onClick={() => change(${JSON.stringify(example.value)})}`,
    "      />",
    "    </section>",
  ]
  return [
    'import {createRoot, useSyncExternalStore} from "@zavx0z/component"',
    'import type {HTMLElement} from "@zavx0z/dom"',
    'import {Parameter as ParameterStore, createNodeTree, createNodeTreeExternalStore, type NodeJsonValue} from "@zavx0z/nodetree"',
    `import {${api}, resolveProjectedParameterPresentation} from "@zavx0z/nodes/parameter"`,
    'import {Button} from "@zavx0z/ui/buttons/button"',
    "",
    "function createExampleModel() {",
    "  const parameter = new ParameterStore<NodeJsonValue, NodeJsonValue>(",
    '    "value",',
    `    ${JSON.stringify(parameter.value)},`,
    `    ${JSON.stringify(parameter.presentation)},`,
    `    ${JSON.stringify(parameter.valueType)},`,
    "  )",
    '  const tree = createNodeTree({nodes: [{id: "parameter-example", parameters: [parameter]}]})',
    '  const store = createNodeTreeExternalStore(tree).parameter("parameter-example", "value")',
    "  return {tree, parameter, store}",
    "}",
    "",
    "type ExampleModel = ReturnType<typeof createExampleModel>",
    "",
    "function Example(props: Readonly<{model: ExampleModel}>) {",
    "  const {parameter, store} = props.model",
    "  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)",
    "  const resolved = resolveProjectedParameterPresentation(snapshot)",
    "  const change = (value: NodeJsonValue) => { parameter.set(value) }",
    ...renderLines.map(line => line.slice(2)),
    "}",
    "",
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
  ].join("\n")
}
