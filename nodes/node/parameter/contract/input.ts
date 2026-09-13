import type {
  ExternalStore,
  NodeJsonValue,
  NodeTreeNodeSnapshot,
  ParameterReference,
  ParameterSnapshot,
  Socket,
} from "@nodes/tree"
import type {ParameterInput} from "@nodes/parameters/shared"
import type {CallbackRef, JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {NodeAction, NodeRect} from "../../shared/contracts.ts"

/**
Входные данные ноды с заголовком, параметрами и адресуемыми сокетами.

Компонент заимствует снимки и Store параметров, а запросы изменения возвращает
владельцу через callbacks. Сворачивание скрывает поля, сохраняя сокеты и их
связи в той же ноде.

@property id - Стабильный идентификатор ноды и адрес её сокетов.

@property label - Видимая подпись и доступное имя ноды.

@property [rect] - Положение и размеры в CSS-пикселях графа.

@property [intrinsic=false] - Сохраняет естественные CSS-размеры для измерения.

@property [parameters] - Снимки параметров из принятого снимка {@link NodeTreeNodeSnapshot}.

@property [sockets] - Сокеты той же ноды; сторона может быть уточнена `resolvedSocketSides`.

@property [parameterStore] - Возвращает адресный Store параметра без копирования значения.

@property [collapsed=false] - Скрывает поля параметров, сохраняя адресуемые сокеты.

@property [embedded=false] - Встраивает представление в составную ноду без второго `data-node-id`.

@property [onParameterInput] - Получает промежуточное изменение значения.

@property [onParameterChange] - Получает подтверждённое изменение значения.

@property [onSocketActivate] - Получает идентификатор активированного сокета.

@example
```tsx
<ParameterNode
  id="source"
  label="Источник"
  parameters={snapshot.parameters}
  sockets={snapshot.sockets}
/>
```
*/
export interface ParameterNodeProps {
  readonly id: string
  readonly frameId?: string | undefined
  readonly label: string
  readonly rect?: NodeRect | undefined
  readonly intrinsic?: boolean | undefined
  readonly elementRef?: CallbackRef<HTMLElement> | undefined
  readonly title?: string | undefined
  readonly category?: string | undefined
  readonly headerColor?: string | undefined
  readonly selected?: boolean | undefined
  readonly hidden?: boolean | undefined
  readonly collapsed?: boolean | undefined
  readonly embedded?: boolean | undefined
  readonly actions?: readonly NodeAction[] | undefined
  readonly parameters?: NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>["parameters"] | undefined
  readonly sockets?: readonly Socket[] | undefined
  readonly parameterStore?: ((parameterId: string) => ExternalStore<ParameterSnapshot>) | undefined
  readonly connectedSocketKeys?: ReadonlySet<string> | undefined
  readonly resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  readonly children?: JsxSourceElement | null | undefined
  readonly style?: CssStyle | undefined
  readonly onActivate?: ((event: Event) => void) | undefined
  readonly onCollapseChange?: ((collapsed: boolean, event: Event) => void) | undefined
  readonly onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  readonly onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  readonly onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}
