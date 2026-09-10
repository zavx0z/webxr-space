# Маркеры

Маркеры — компоненты концов готового пути. Физическая категория `markers` содержит
`arrow/index.tsx`; новый пакет, вложенная категория под Link и дубли start/end
не создаются. Arrow имеет варианты `open` и `filled`.

```tsx
import {Link} from "@webxr/nodes/link"
import {Arrow} from "@webxr/nodes/markers/arrow"
import type {MarkerProps} from "@webxr/nodes/markers"

function FilledArrow(props: MarkerProps) {
  return <Arrow
    context={props.context}
    variant="filled"
  />
}

// route принадлежит Layout или вызывающему приложению.
<Link
  id="relation"
  title="Связь"
  route={route}
  startMarker={Arrow}
  endMarker={FilledArrow}
/>
```

Link передаёт один `context`: `position`, единичный `direction` наружу от конца
маршрута, `ownerId`, `side`, `color`, `strokeWidth`, `selected/disabled/hidden`.
Это CSS-пиксели готового пути, без Renderer objects, DOM refs или второго layout.
Компонент применяет полученные position/direction к собственной фигуре. Arrow
использует общий geometry helper и принимает length/width/offset;
положительный offset перемещает tip внутрь пути. Он рисует обычный vector-path.
Socket модели при этом не создаётся и не дублируется.

Передаётся компонент, а не готовый JSX Element. Для конфигурации используется
обычный небольшой компонент-обёртка, как FilledArrow выше. При изменении route
тот же компонент на том же конце сохраняет Elements. Замена типа компонента
имеет обычную семантику замены компонента.

Динамическая композиция использует публичные component()/children transport,
так же как GraphView.view. Внутренняя граница compiled ABI не видна автору;
кастов DOM implementation types, собственного renderer и измерительного цикла нет.
