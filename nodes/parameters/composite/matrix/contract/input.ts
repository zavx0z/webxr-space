import type {MatrixFieldProps} from "@zavx0z/ui/fields/matrix-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные матричного параметра, связанного с нодой и её сокетами.

Квадратная матрица редактируется как одно внешнее значение без собственной копии в компоненте.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Квадратная матрица размером 2, 3 или 4.

@property [step] - Шаг изменения числовых ячеек.

@property [onChange] - Передаёт подтверждённую матрицу целиком.

@example
```ts
const input: MatrixParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: [[1, 0], [0, 1]],
}
```
*/
export interface MatrixParameterProps {
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
  readonly value: MatrixFieldProps["value"]
  readonly step?: MatrixFieldProps["step"]
  readonly density?: MatrixFieldProps["density"]
  readonly onInput?: MatrixFieldProps["onInput"]
  readonly onChange?: MatrixFieldProps["onChange"]
}
