import type {CollectionFieldProps} from "@zavx0z/ui/fields/collection-field"
import type {ParameterEndpoint} from "../../../shared/src/contracts.ts"
/**
Входные данные параметра-коллекции, связанного с нодой и её сокетами.

Список, выбор и порядок принадлежат вызывающей стороне; операции только передаются приложению.

@property id - Идентификатор параметра внутри ноды.

@property nodeId - Идентификатор ноды для адресов всех сокетов строки.

@property [sockets] - Адресуемые сокеты параметра с уже выбранными сторонами.

@property [connected=false] - Скрывает поле, сохраняя строку, подпись и сокеты.

@property [onSocketActivate] - Получает исходный идентификатор сокета.

@property items - Внешний упорядоченный список элементов.

@property selectedId - Идентификатор выбранного элемента либо `null`.

@property [onMove] - Запрашивает перестановку элемента.

@example
```ts
const input: CollectionParameterProps = {
  id: "value",
  nodeId: "node",
  label: "Значение",
  items: [],
  selectedId: null,
}
```
*/
export interface CollectionParameterProps {
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
  readonly items: CollectionFieldProps["items"]
  readonly selectedId: CollectionFieldProps["selectedId"]
  readonly visibleRows?: CollectionFieldProps["visibleRows"]
  readonly emptyLabel?: CollectionFieldProps["emptyLabel"]
  readonly density?: CollectionFieldProps["density"]
  readonly onSelect?: CollectionFieldProps["onSelect"]
  readonly onAdd?: CollectionFieldProps["onAdd"]
  readonly onRemove?: CollectionFieldProps["onRemove"]
  readonly onMove?: CollectionFieldProps["onMove"]
}
