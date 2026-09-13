import type {ColorFieldProps} from "@zavx0z/ui/fields/color-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные цветового параметра, связанного с нодой и её сокетами.

RGBA-значение и видимость панели выбора управляются вызывающей стороной.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Текущее RGBA-значение.

@property [open] - Управляемая видимость панели выбора цвета.

@property [onInput] - Передаёт промежуточный цвет.

@example
```ts
const input: ColorParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: {r: 1, g: 0, b: 0, a: 1},
}
```
*/
export interface ColorParameterProps {
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
  readonly value: ColorFieldProps["value"]
  readonly open?: ColorFieldProps["open"]
  readonly onInput?: ColorFieldProps["onInput"]
  readonly onChange?: ColorFieldProps["onChange"]
  readonly onOpenChange?: ColorFieldProps["onOpenChange"]
}
