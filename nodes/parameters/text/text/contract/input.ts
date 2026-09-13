import type {TextFieldProps} from "@zavx0z/ui/fields/text-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные строкового параметра, связанного с нодой и её сокетами.

Поле сохраняет строку во внешнем состоянии; подключённый сокет скрывает редактор, но сохраняет подпись и адрес строки.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Текущее строковое значение.

@property [type] - Режим ввода публичного `TextField`.

@property [onInput] - Публикует промежуточное строковое значение.

@example
```ts
const input: TextParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: "текст",
}
```
*/
export interface TextParameterProps {
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
  readonly value: TextFieldProps["value"]
  readonly type?: TextFieldProps["type"]
  readonly placeholder?: TextFieldProps["placeholder"]
  readonly onInput?: TextFieldProps["onInput"]
  readonly onChange?: TextFieldProps["onChange"]
}
