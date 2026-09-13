import type {CheckboxFieldProps} from "@zavx0z/ui/fields/checkbox-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные логического параметра-флажка, связанного с нодой и её сокетами.

Смешанное отображение не заменяет логическое значение; запрос изменения передаётся владельцу.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property checked - Текущее логическое значение.

@property [indeterminate] - Показывает смешанное состояние без изменения `checked`.

@property [onChange] - Передаёт предложенное логическое значение.

@example
```ts
const input: CheckboxParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  checked: true,
}
```
*/
export interface CheckboxParameterProps {
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
  readonly checked: CheckboxFieldProps["checked"]
  readonly indeterminate?: CheckboxFieldProps["indeterminate"]
  readonly onChange?: CheckboxFieldProps["onChange"]
}
