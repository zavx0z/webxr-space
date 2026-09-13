import type {ParameterNodeProps} from "../../parameter/contract/input.ts"

/**
Входные данные внутренней композиции заголовка, параметров и сокетов ноды.

Форма соответствует принятому входу `ParameterNode` и добавляет рассчитанную
высоту заголовка. Компонент вызывается владельцем ноды после вычисления
геометрии и не создаёт отдельную модель.

@property id - Идентификатор ноды для адресов параметров и сокетов.

@property label - Видимая подпись заголовка.

@property headerHeight - Рассчитанная высота заголовка в CSS-пикселях.

@property [parameters] - Принятые снимки параметров.

@property [sockets] - Сокеты той же ноды.

@example
```tsx
<ParameterNodeContents
  id="node"
  label="Нода"
  headerHeight={28}
/>
```
*/
export interface ParameterNodeContentsProps {
  readonly id: ParameterNodeProps["id"]
  readonly frameId?: ParameterNodeProps["frameId"]
  readonly label: ParameterNodeProps["label"]
  readonly rect?: ParameterNodeProps["rect"]
  readonly intrinsic?: ParameterNodeProps["intrinsic"]
  readonly elementRef?: ParameterNodeProps["elementRef"]
  readonly title?: ParameterNodeProps["title"]
  readonly category?: ParameterNodeProps["category"]
  readonly headerColor?: ParameterNodeProps["headerColor"]
  readonly selected?: ParameterNodeProps["selected"]
  readonly hidden?: ParameterNodeProps["hidden"]
  readonly collapsed?: ParameterNodeProps["collapsed"]
  readonly embedded?: ParameterNodeProps["embedded"]
  readonly actions?: ParameterNodeProps["actions"]
  readonly parameters?: ParameterNodeProps["parameters"]
  readonly sockets?: ParameterNodeProps["sockets"]
  readonly parameterStore?: ParameterNodeProps["parameterStore"]
  readonly connectedSocketKeys?: ParameterNodeProps["connectedSocketKeys"]
  readonly resolvedSocketSides?: ParameterNodeProps["resolvedSocketSides"]
  readonly children?: ParameterNodeProps["children"]
  readonly style?: ParameterNodeProps["style"]
  readonly onActivate?: ParameterNodeProps["onActivate"]
  readonly onCollapseChange?: ParameterNodeProps["onCollapseChange"]
  readonly onParameterInput?: ParameterNodeProps["onParameterInput"]
  readonly onParameterChange?: ParameterNodeProps["onParameterChange"]
  readonly onSocketActivate?: ParameterNodeProps["onSocketActivate"]
  readonly headerHeight: number
}
