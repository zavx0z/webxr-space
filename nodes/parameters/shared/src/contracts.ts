/**
Общие props связывают представление параметра с его нодой и Socket.
Значения остаются во внешнем Store; callbacks несут точный адрес изменения.

@packageDocumentation
*/

import type {ExternalStore, NodeJsonValue, ParameterSnapshot, Socket as CoreSocket} from "@nodes/tree"
import type {SocketKind, SocketDirection, SocketShape, SocketSide} from "@nodes/sockets/presets"

/**
Изменение адресуется исходной ноде и Parameter; Store обновляет принимающая сторона.

@property value - Новое JSON-значение без локальной копии состояния в компоненте.
*/
export type ParameterInput = Readonly<{
  nodeId: string
  parameterId: string
  value: NodeJsonValue
}>

/**
Авторское представление Socket, привязанного к Parameter.

@property side - Физическая сторона строки; независима от direction.

@property [connected] - Состояние связи передаётся снаружи.
*/
export type ParameterEndpoint = Readonly<{
  id: string
  kind: SocketKind
  direction: SocketDirection
  side: SocketSide
  label: string
  title?: string | undefined
  shape?: SocketShape | undefined
  connected?: boolean | undefined
  selected?: boolean | undefined
  disabled?: boolean | undefined
}>

/**
Общая строка параметра использует значение и endpoint, предоставленные вызывающей стороной.

@property id - Идентификатор параметра внутри ноды; не создаёт новый Parameter Store.

@property nodeId - Адрес ноды для всех Socket этой строки.

@property [sockets] - Не более одного endpoint каждой стороны; повтор id или стороны вызывает ошибку.

@property [connected] - Скрывает поле, сохраняя строку, подпись и Socket.

@property [onSocketActivate] - Получает исходный socket id; создание связи остаётся у приложения.
*/
export type ParameterBaseProps = Readonly<{
  id: string
  nodeId: string
  label: string
  sockets?: readonly ParameterEndpoint[] | undefined
  connected?: boolean | undefined
  hidden?: boolean | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>

/**
Проекция exact Parameter Store в существующий semantic Document.

@property snapshot - Используется напрямую, когда store не передан.

@property [store] - Заимствованная подписка на значение; adapter не создаёт и не уничтожает Store.

@property [connectedSocketKeys] - Текущие адреса связанных Socket; определяют видимость поля.

@property [resolvedSocketSides] - Стороны endpoint из принятой раскладки; приоритетнее направления.

@property [onInput] - Публикует адресованное значение без записи в Store.
*/
export type ParameterProps = Readonly<{
  nodeId: string
  snapshot: ParameterSnapshot
  sockets: readonly CoreSocket[]
  store?: ExternalStore<ParameterSnapshot> | undefined
  connectedSocketKeys?: ReadonlySet<string> | undefined
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  spacingBefore?: "small" | "medium" | undefined
  style?: CssStyle | undefined
  onInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>
