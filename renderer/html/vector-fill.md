# Заливка vector-path

Capability `VECTOR-FILL` принадлежит DOM, `@renderer/html` и WebGPU.
HTMLVectorPathElement хранит `d`; Renderer разрешает CSS, строит paint и hit;
WebGPU превращает нормализованный контур в retained Mesh.

Поддерживается прежняя ограниченная грамматика **одного** контура: абсолютный
начальный `M`, затем явные `L`, `Q`, `C`. Повторный `M`, `Z`, относительные
команды, дуги и сокращённые команды отвергаются. Для заливки последнее ребро
неявно соединяется с началом; это не добавляет обводку замыкающего ребра.
Можно явно повторить начальную точку через `L`. Это расширение проекта,
не реализация полной SVG-грамматики.

- `fill:none` — исходное значение, сохраняющее прежние stroke-only consumers.
- `fill:<color>` использует общий CSS color parser, включая `currentColor`,
  custom properties и каскад. `fill` наследуется; `currentColor` разрешается
  относительно цвета самого рисуемого элемента.
- `fill-rule:nonzero` — исходное правило; `evenodd` поддерживает другую
  семантику winding. Оба свойства принимают `inherit`, `initial`, `unset`.
- Fill рисуется перед stroke; `stroke-width:0` оставляет только заливку.
  Stroke сохраняет прежние свойства и обработку ввода.
- Внутренняя область определяется по общему sampled контуру: прямые точны,
  Q/C нормализуются в кубические и используют прежние шесть шагов на кривую.
  Вогнутость, самопересечения и обратные рёбра допустимы. Отдельные subpaths
  не поддерживаются; отверстие возможно в одном связном контуре.

Fill paint имеет ключ `path-fill`, `kind:path`, поля `fill`, `fillRule` и
`strokeWidth:0`. Stroke сохраняет ключ `path` и прежнее представление.
Оба используют одну immutable geometry, presentation owner, opacity и clips.
Запись без `fillRule` остаётся stroke-записью. Запись заливки имеет отдельный
цвет `fill`; `stroke` в ней не используется для рисования.

Hit testing использует то же winding rule во внутренней области и прежнюю
дистанцию до stroke с `pointer-hit-width`. Пустые части bounds не захватывают
ввод. `visibility:hidden` исключает paint/hit, сохраняя layout, с обычным
наследованием и явным `visible` потомка. Как и прежний path hit, прозрачный
цвет и opacity:0 сами по себе не выключают pointer targeting. Pointer-events
и clipping применяются общим обработчиком. Размеры DOM и local measurement
не меняются.

Fill использует существующие scale/translate и projection, не расширяя набор
CSS transforms. Изменение `d`, CSS, наследуемого цвета или правила обновляет
paint/hit. Для заполненных контуров используется общий rebuild кадра вместо
специализированной замены одиночной stroke-записи; backend сохраняет Mesh и
ресурсы между кадрами. Геометрия не пересчитывается при смене цвета/проекции.

## Проверки

- `tests/vector-fill.test.ts`: `VECTOR-FILL-001..004` — fill-only, stroke,
  cascade/inheritance/currentColor, геометрия, transforms, clipping, hidden,
  winding rules и границы грамматики.
- `../../webgpu/tests/vector-fill.test.ts`: `VECTOR-FILL-GPU-001..003` —
  совпадение tessellation и hit для семи форм, retained lifecycle и пустая область.
- Storybook owner route `@renderer/html` → `vector/fill/geometry`:
  `./.storybook/runtime.ts` создаёт обычные semantic vector-path из того же
  Document. Красный triangle, зелёный вогнутый контур с белой обводкой, синяя
  Q-кривая, жёлтая рамка evenodd; ниже оранжевый scale+clip, белый stroke-only,
  полупрозрачная пурпурная C-кривая и скрытый белый контур.

Unit-тесты backend проверяют данные и lifecycle, не имитируют native GPU.
Реальная GPU-проверка выполняется через capture этой owner story.
