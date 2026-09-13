import type {CycleFieldProps} from "@zavx0z/ui/fields/cycle-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные циклического выбора, связанного с нодой и её сокетами.

Список вариантов и управляемое состояние раскрытия передаются публичному `CycleField`.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Ключ текущего варианта.

@property options - Упорядоченный набор вариантов.

@property [open] - Управляемая видимость списка.

@example
```ts
const input: CycleParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: "first",
  options: [],
}
```
*/
export interface CycleParameterProps {
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
  readonly value: CycleFieldProps["value"]
  readonly options: CycleFieldProps["options"]
  readonly density?: CycleFieldProps["density"]
  readonly open?: CycleFieldProps["open"]
  readonly onChange?: CycleFieldProps["onChange"]
  readonly onOpenChange?: CycleFieldProps["onOpenChange"]
}
