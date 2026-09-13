import type {NodeJsonValue} from "@nodes/tree"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные выходного параметра только для чтения, связанного с нодой и её сокетами.

Значение показывается как текст или JSON; направление соединения задаётся сокетом.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Отображаемое JSON-значение без локального редактирования.

@example
```ts
const input: OutputParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: null,
}
```
*/
export interface OutputParameterProps {
  readonly id: string
  readonly nodeId: string
  readonly label: string
  readonly labelHidden?: boolean | undefined
  readonly spacingBefore?: "small" | "medium" | undefined
  readonly sockets?: readonly ParameterEndpoint[] | undefined
  readonly connected?: boolean | undefined
  readonly hidden?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly readOnly?: boolean | undefined
  readonly title?: string | undefined
  readonly style?: CssStyle | undefined
  readonly onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
  readonly value: NodeJsonValue
}
