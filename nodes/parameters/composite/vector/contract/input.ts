import type {VectorFieldProps} from "@zavx0z/ui/fields/vector-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные векторного параметра, связанного с нодой и её сокетами.

Компоненты вектора и их подписи передаются публичному `VectorField` без локального состояния.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - От двух до четырёх числовых компонент.

@property [axes] - Подписи осей в порядке компонент.

@property [onInput] - Передаёт промежуточный вектор целиком.

@example
```ts
const input: VectorParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: [0, 0, 0],
}
```
*/
export interface VectorParameterProps {
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
  readonly value: VectorFieldProps["value"]
  readonly axes?: VectorFieldProps["axes"]
  readonly min?: VectorFieldProps["min"]
  readonly max?: VectorFieldProps["max"]
  readonly step?: VectorFieldProps["step"]
  readonly density?: VectorFieldProps["density"]
  readonly onInput?: VectorFieldProps["onInput"]
  readonly onChange?: VectorFieldProps["onChange"]
}
