import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {NodeRect} from "../../shared/projection/geometry.ts"

/**
Входные данные рамки группы в общей проекции графа.

Рамка получает готовую геометрию от Layout. `parentFrameId` выражает отношение
в модели и не создаёт отдельный DOM, проекцию или жизненный цикл.

@property id - Непустой идентификатор рамки.

@property label - Непустая видимая подпись и доступное имя.

@property rect - Готовые координаты и размеры в CSS-пикселях графа.

@property [children] - Уже спроецированное содержимое группы.

@property [onActivate] - Получает событие активации без изменения модели.

@example
```ts
const input: FrameProps = {
  id: "group",
  label: "Группа",
  rect: {x: 0, y: 0, width: 320, height: 180},
}
```
*/
export interface FrameProps {
  readonly id: string
  readonly label: string
  readonly rect: NodeRect
  readonly parentFrameId?: string | undefined
  readonly title?: string | undefined
  readonly color?: string | undefined
  readonly selected?: boolean | undefined
  readonly hidden?: boolean | undefined
  readonly children?: JsxSourceElement | null | undefined
  readonly style?: CssStyle | undefined
  readonly onActivate?: ((event: Event) => void) | undefined
}
