import type {SelectFieldProps} from "@zavx0z/ui/fields/select-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные параметра выбора, связанного с нодой и её сокетами.

Варианты и особое состояние выбора принадлежат вызывающей стороне и передаются публичному `SelectField`.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Значение выбранного варианта.

@property [options] - Полный доступный набор вариантов.

@property [state] - Особое состояние выбора, например отсутствие значения.

@example
```ts
const input: SelectParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: "first",
}
```
*/
export interface SelectParameterProps {
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
  readonly value: SelectFieldProps["value"]
  readonly options?: SelectFieldProps["options"]
  readonly state?: SelectFieldProps["state"]
  readonly density?: SelectFieldProps["density"]
  readonly onChange?: SelectFieldProps["onChange"]
}
