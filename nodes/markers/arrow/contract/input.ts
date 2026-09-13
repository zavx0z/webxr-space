import type {MarkerContext} from "../../../shared/markers/contracts.ts"

/**
Входные данные наконечника, размещаемого в marker slot связи.

`context` содержит уже рассчитанную конечную точку, единичное направление и
состояние владельца. Размеры задаются в CSS-пикселях общей проекции графа.

@property context - Геометрия и состояние конца связи.

@property [variant=open] - Выбирает открытый либо заполненный наконечник.

@property [length] - Длина: 9 для открытого и 10 для заполненного по умолчанию.

@property [width] - Полная ширина: 8 для открытого и 12 для заполненного по умолчанию.

@property [offset=0] - Сдвиг кончика внутрь маршрута.

@example
```tsx
<Arrow context={context} variant="filled" />
```
*/
export interface ArrowProps {
  readonly context: MarkerContext
  readonly variant?: "open" | "filled" | undefined
  readonly length?: number | undefined
  readonly width?: number | undefined
  readonly offset?: number | undefined
}
