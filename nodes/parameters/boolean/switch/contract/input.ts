import type {SwitchFieldProps} from "@zavx0z/ui/fields/switch-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные логического параметра-переключателя, связанного с нодой и её сокетами.

Текущее значение остаётся у вызывающей стороны; компонент только возвращает запрос переключения.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property checked - Текущее логическое значение.

@property [onChange] - Передаёт предложенное значение без записи во внешний Store.

@example
```ts
const input: SwitchParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  checked: true,
}
```
*/
export interface SwitchParameterProps {
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
  readonly checked: SwitchFieldProps["checked"]
  readonly onChange?: SwitchFieldProps["onChange"]
}
