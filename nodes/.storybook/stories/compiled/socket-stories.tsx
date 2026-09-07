import {createRoot, useState} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import {Socket, SOCKET_KINDS, SOCKET_SHAPES, socketPreset, type SocketKind, type SocketDirection, type SocketShape} from "@zavx0z/nodes/socket"
import {mountNodesStory} from "../mount.ts"

export function createSocketStory(document: Document, route: string) {
  const [, requestedKind, variant] = route.split("/")
  if (!SOCKET_KINDS.includes(requestedKind as SocketKind)) throw new Error(`Неизвестный Socket: ${route}`)
  if (!["input", "output", "bidirectional", "shapes", "states", "presentation"].includes(variant!)) {
    throw new Error(`Неизвестный вариант Socket: ${route}`)
  }
  const kind = requestedKind as SocketKind
  const staging = document.createElement("div")
  const root = createRoot(staging)
  try {
    root.render(<SocketStory kind={kind} variant={variant!} />)
  } catch (error) {
    root.unmount()
    throw error
  }
  return mountNodesStory(document, route, staging, root,
    socketSource(kind, variant!),
    {kind, variant, preset: socketPreset(kind)},
  )
}

function socketSource(kind: SocketKind, variant: string): string {
  const preset = socketPreset(kind)
  const direction = variant === "output" ? "output" : variant === "bidirectional" ? "bidirectional" : "input"
  const examples = variant === "shapes"
    ? SOCKET_SHAPES.map(shape => ({id: shape, label: shape, shape, connected: false, disabled: false, selected: false, row: false}))
    : variant === "states"
      ? [
          {id: "normal", label: "Обычный", shape: preset.shape, connected: false, disabled: false, selected: false, row: false},
          {id: "connected", label: "Подключён", shape: preset.shape, connected: true, disabled: false, selected: false, row: false},
          {id: "selected", label: "Выбран", shape: preset.shape, connected: false, disabled: false, selected: true, row: false},
          {id: "disabled", label: "Недоступен", shape: preset.shape, connected: false, disabled: true, selected: false, row: false},
        ]
      : variant === "presentation"
        ? [
            {id: "endpoint", label: "Endpoint", shape: preset.shape, connected: false, disabled: false, selected: false, row: false},
            {id: "row", label: "Строка", shape: preset.shape, connected: false, disabled: false, selected: false, row: true},
          ]
        : [{id: "value", label: preset.label, shape: preset.shape, connected: false, disabled: false, selected: false, row: false}]
  const exampleSource = JSON.stringify(examples, null, 2)
  return [
    'import {createRoot, useState} from "@zavx0z/component"',
    'import type {HTMLElement} from "@zavx0z/dom"',
    'import {Socket, type SocketShape} from "@zavx0z/nodes/socket"',
    "",
    "type SocketExampleValue = Readonly<{",
    "  id: string",
    "  label: string",
    "  shape: SocketShape",
    "  connected: boolean",
    "  disabled: boolean",
    "  selected: boolean",
    "  row: boolean",
    "}>",
    "",
    "function Example() {",
    "  const [activations, setActivations] = useState(0)",
    "  const [selected, setSelected] = useState(false)",
    `  const examples: readonly SocketExampleValue[] = ${["shapes", "states", "presentation"].includes(variant) ? exampleSource : exampleSource.replace('"selected": false', '"selected": selected')}`,
    "  return <section",
    `    aria-label=${JSON.stringify(`${preset.label}: сокеты`)}`,
    "    style={css`",
    "      box-sizing: border-box;",
    "      display: flex;",
    "      flex-direction: column;",
    "      width: 100%;",
    "      max-width: 420px;",
    "      gap: 12px;",
    "      padding: 16px;",
    "      color: var(--widget-regular-content);",
    "    `}",
    "  >",
    `    <strong>{${JSON.stringify(preset.label)}}</strong>`,
    "    {examples.map(example => <SocketExample",
    "      key={example.id}",
    "      example={example}",
    "      onActivate={() => {",
    "        setActivations(value => value + 1)",
    "        setSelected(value => !value)",
    "      }}",
    "    />)}",
    '    <output aria-label="Активации сокета">{"Активаций: " + activations}</output>',
    "  </section>",
    "}",
    "",
    "function SocketExample(props: Readonly<{example: SocketExampleValue; onActivate(): void}>) {",
    "  return <div",
    "    data-socket-example={props.example.id}",
    "    style={css`",
    "      display: flex;",
    "      flex-direction: row;",
    "      align-items: center;",
    "      min-height: 26px;",
    "      gap: 16px;",
    "    `}",
    "  >",
    "    <span>{props.example.label}</span>",
    "    <Socket",
    "      id={props.example.id}",
    '      nodeId="socket-example"',
    `      kind="${kind}"`,
    `      direction="${direction}"`,
    `      side="${direction === "output" ? "right" : "left"}"`,
    "      shape={props.example.shape}",
    "      label={props.example.label}",
    "      connected={props.example.connected}",
    "      disabled={props.example.disabled}",
    "      selected={props.example.selected}",
    '      presentation={props.example.row ? "row" : "endpoint"}',
    "      onActivate={props.onActivate}",
    "    />",
    "  </div>",
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

function SocketStory(props: Readonly<{kind: SocketKind; variant: string}>) {
  const [activations, setActivations] = useState(0)
  const [selected, setSelected] = useState(false)
  const preset = socketPreset(props.kind)
  const direction = props.variant === "output" ? "output" : props.variant === "bidirectional" ? "bidirectional" : "input"
  const examples = props.variant === "shapes"
    ? SOCKET_SHAPES.map(shape => ({id: shape, label: shape, shape, connected: false, disabled: false, selected: false, row: false}))
    : props.variant === "states"
      ? [
          {id: "normal", label: "Обычный", shape: preset.shape, connected: false, disabled: false, selected: false, row: false},
          {id: "connected", label: "Подключён", shape: preset.shape, connected: true, disabled: false, selected: false, row: false},
          {id: "selected", label: "Выбран", shape: preset.shape, connected: false, disabled: false, selected: true, row: false},
          {id: "disabled", label: "Недоступен", shape: preset.shape, connected: false, disabled: true, selected: false, row: false},
        ]
      : props.variant === "presentation"
        ? [
            {id: "endpoint", label: "Endpoint", shape: preset.shape, connected: false, disabled: false, selected: false, row: false},
            {id: "row", label: "Строка", shape: preset.shape, connected: false, disabled: false, selected: false, row: true},
          ]
        : [{id: "value", label: preset.label, shape: preset.shape, connected: false, disabled: false, selected, row: false}]
  return <section
    aria-label={`${preset.label}: сокеты`}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 420px;
      gap: 12px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <strong>{preset.label}</strong>
    {examples.map(example => <SocketExample
      key={example.id}
      example={example}
      kind={props.kind}
      direction={direction}
      onActivate={() => {
        setActivations(value => value + 1)
        setSelected(value => !value)
      }}
    />)}
    <output aria-label="Активации сокета">{`Активаций: ${activations}`}</output>
  </section>
}

function SocketExample(props: Readonly<{
  example: Readonly<{id: string; label: string; shape: SocketShape; connected: boolean; disabled: boolean; selected: boolean; row: boolean}>
  kind: SocketKind
  direction: SocketDirection
  onActivate(): void
}>) {
  return <div
    data-socket-example={props.example.id}
    style={css`
      display: flex;
      flex-direction: row;
      align-items: center;
      min-height: 26px;
      gap: 16px;
    `}
  >
    <span>{props.example.label}</span>
    <Socket
      id={props.example.id}
      nodeId="socket-example"
      kind={props.kind}
      direction={props.direction}
      side={props.direction === "output" ? "right" : "left"}
      shape={props.example.shape}
      label={props.example.label}
      connected={props.example.connected}
      disabled={props.example.disabled}
      selected={props.example.selected}
      presentation={props.example.row ? "row" : "endpoint"}
      onActivate={props.onActivate}
    />
  </div>
}
