import type {ReferenceFieldProps} from "@zavx0z/ui/fields/reference-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные ссылочного параметра, связанного с нодой и её сокетами.

Идентификатор и подпись выбранного объекта принадлежат приложению; выбор и очистка возвращаются callbacks.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Выбранная ссылка либо `null`.

@property [onPick] - Запрашивает выбор объекта у приложения.

@property [onClear] - Запрашивает очистку ссылки.

@example
```ts
const input: ReferenceParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: null,
}
```
*/
export interface ReferenceParameterProps {
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
  readonly value: ReferenceFieldProps["value"]
  readonly placeholder?: ReferenceFieldProps["placeholder"]
  readonly density?: ReferenceFieldProps["density"]
  readonly onActivate?: ReferenceFieldProps["onActivate"]
  readonly onPick?: ReferenceFieldProps["onPick"]
  readonly onClear?: ReferenceFieldProps["onClear"]
}
