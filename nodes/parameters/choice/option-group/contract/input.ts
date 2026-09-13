import type {ToggleButtonGroupProps} from "@zavx0z/ui/buttons/toggle-button-group"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные группы вариантов, связанного с нодой и её сокетами.

Группа показывает внешний набор вариантов и возвращает выбранное строковое значение.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Значение выбранного варианта.

@property options - Полный набор кнопок выбора.

@property [onChange] - Передаёт новое выбранное значение.

@example
```ts
const input: OptionGroupParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: "first",
  options: [],
}
```
*/
export interface OptionGroupParameterProps {
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
  readonly value: ToggleButtonGroupProps["value"]
  readonly options: ToggleButtonGroupProps["options"]
  readonly density?: ToggleButtonGroupProps["density"]
  readonly onChange?: ToggleButtonGroupProps["onChange"]
}
