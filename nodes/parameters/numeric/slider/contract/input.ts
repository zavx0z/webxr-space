import type {SliderFieldProps} from "@zavx0z/ui/fields/slider-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные параметра-ползунка, связанного с нодой и её сокетами.

Диапазон принадлежит вызывающей стороне; компонент передаёт ввод и подтверждение без локальной копии значения.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Текущее значение внутри объявленного диапазона.

@property min - Нижняя граница ползунка.

@property max - Верхняя граница ползунка.

@example
```ts
const input: SliderParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: 0.5,
  min: 0,
  max: 1,
}
```
*/
export interface SliderParameterProps {
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
  readonly value: SliderFieldProps["value"]
  readonly min: SliderFieldProps["min"]
  readonly max: SliderFieldProps["max"]
  readonly step?: SliderFieldProps["step"]
  readonly density?: SliderFieldProps["density"]
  readonly onInput?: SliderFieldProps["onInput"]
  readonly onChange?: SliderFieldProps["onChange"]
}
