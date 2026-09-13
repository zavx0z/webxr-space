import type {NumberFieldProps} from "@zavx0z/ui/fields/number-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные числового параметра, связанного с нодой и её сокетами.

Жёсткие `min`/`max` и мягкие границы перетаскивания передаются публичному `NumberField`; компонент не хранит число.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Текущее конечное числовое значение.

@property [softMin] - Мягкая нижняя граница перетаскивания.

@property [softMax] - Мягкая верхняя граница перетаскивания.

@example
```ts
const input: NumberParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: 1,
}
```
*/
export interface NumberParameterProps {
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
  readonly value: NumberFieldProps["value"]
  readonly min?: NumberFieldProps["min"]
  readonly max?: NumberFieldProps["max"]
  readonly softMin?: NumberFieldProps["softMin"]
  readonly softMax?: NumberFieldProps["softMax"]
  readonly step?: NumberFieldProps["step"]
  readonly precision?: NumberFieldProps["precision"]
  readonly onInput?: NumberFieldProps["onInput"]
  readonly onChange?: NumberFieldProps["onChange"]
}
