import {createRoot, useState} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import {Socket} from "@nodes/sockets/socket"
import {SOCKET_SHAPES, socketPreset, type SocketKind, type SocketDirection, type SocketShape} from "@nodes/sockets/presets"

export function mountSocketFixture(document: Document, kind: SocketKind, variant: string) {
  const element = document.createElement("div")
  const root = createRoot(element)
  root.render(<SocketFixture kind={kind} variant={variant} />)
  return {element, dispose() { root.unmount(); element.remove() }}
}

function SocketFixture(props: Readonly<{kind: SocketKind; variant: string}>) {
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
