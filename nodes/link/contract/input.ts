import type {ExternalStore} from "@nodes/tree"
import type {SocketKind} from "@nodes/sockets/presets"
import type {MarkerComponent} from "../../shared/markers/contracts.ts"
import type {LinkMarkerGeometry, LinkRoute} from "../../shared/routing/link-path.ts"
import type {LinkDefinition, LinkEndpoint} from "../types/link.ts"

/**
Входные данные одной связи, отображаемой семантическим `vector-path`.

Прямые поля образуют fallback-снимок. При наличии `store` компонент заимствует
его текущее {@link LinkDefinition} и обновляет тот же элемент пути без изменения
модели или создания отдельной проекции.

@property id - Непустой идентификатор связи.

@property title - Непустое доступное имя пути.

@property route - Маршрут в CSS-координатах графа.

@property [markers] - Точная заполненная геометрия наконечников; пустой массив отключает их.

@property [store] - Внешний Store определения связи, имеющий приоритет над прямыми полями после подписки.

@property [onActivate] - Получает событие допустимой активации пути.

@example
```ts
const input: LinkProps = {
  id: "source-target",
  title: "Источник — результат",
  route,
}
```
*/
export interface LinkProps {
  readonly id: string
  readonly title: string
  readonly route: LinkRoute
  readonly color?: string | undefined
  readonly strokeWidth?: number | undefined
  readonly markers?: readonly LinkMarkerGeometry[] | undefined
  readonly kind?: SocketKind | undefined
  readonly from?: LinkEndpoint | undefined
  readonly to?: LinkEndpoint | undefined
  readonly startMarker?: MarkerComponent | null | undefined
  readonly endMarker?: MarkerComponent | null | undefined
  readonly startArrow?: boolean | undefined
  readonly endArrow?: boolean | undefined
  readonly selected?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly hidden?: boolean | undefined
  readonly store?: ExternalStore<LinkDefinition> | undefined
  readonly style?: CssStyle | undefined
  readonly onActivate?: ((event: Event) => void) | undefined
}
