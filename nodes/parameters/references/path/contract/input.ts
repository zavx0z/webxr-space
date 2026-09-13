import type {PathFieldProps} from "@zavx0z/ui/fields/path-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные параметра пути, связанного с нодой и её сокетами.

Компонент редактирует строку и запрашивает внешний выбор пути, не обращаясь к файловой системе.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property value - Текущая строка пути.

@property [onBrowse] - Запрашивает действие приложения по выбору пути.

@property [onInput] - Передаёт промежуточную строку.

@example
```ts
const input: PathParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  value: "./scene.glb",
}
```
*/
export interface PathParameterProps {
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
  readonly value: PathFieldProps["value"]
  readonly placeholder?: PathFieldProps["placeholder"]
  readonly density?: PathFieldProps["density"]
  readonly browseTitle?: PathFieldProps["browseTitle"]
  readonly onInput?: PathFieldProps["onInput"]
  readonly onChange?: PathFieldProps["onChange"]
  readonly onBrowse?: PathFieldProps["onBrowse"]
}
