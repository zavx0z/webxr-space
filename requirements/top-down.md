# Алгоритмические требования top-down

Этот документ владеет отдельной policy `@nodes/layout/top-down`. Она строит
плоскую причинную DAG-схему сверху вниз и не является responsive-режимом `DOWN`
compound solver-а fixed/adaptive.

## Публичная граница

1. Input содержит заранее измеренные leaf-ноды, точные horizontal offsets
   портов и semantic edges. Viewport, renderer state, ручные coordinates,
   ranks, bends и lanes в contract не входят.
2. Каждый edge обязан явно задать `constraint`:
   - `true` — единственная parent-связь target в placement forest;
   - `false` — слабая flow-связь, участвующая в уплотнении и маршрутизации, но
     не создающая второго parent.
   Это внутренняя роль размещения, а не второй визуальный или source-тип связи.
3. Подграф `constraint=true` является forest: у target не более одной такой
   связи. Повторная parent-связь, даже от того же source, отклоняется.
4. Полный graph обязан быть DAG. Cycle отклоняется до placement с typed
   `CYCLE_DETECTED` witness; policy не разворачивает edge и не запускает другой
   solver как fallback.
5. Source-port разрешается в `SOUTH`, target-port — в `NORTH`. Один exact port
   принадлежит ровно одному semantic edge и не может использоваться повторно
   или играть обе роли. Fan-in/fan-out получают отдельные разнесённые endpoints.
6. Intrinsic размеры нод не меняются. Output содержит только `DOWN`, bounds,
   rectangles, абсолютные port centers и один визуальный тип связи: непрерывную
   цепочку cubic Bézier segments.

## Placement pipeline

1. Для одного placement-root применяется variable-size tidy tree из
   `d3-flextree`, реализующий non-layered алгоритм van der Ploeg на основе
   Reingold–Tilford. Порядок детей задаётся стабильными edge IDs.
2. Leaf, связанный слабым edge с более глубоким fan-in, может получить только
   внутренние virtual spacing nodes. Они не появляются в result и позволяют
   ветвям занимать разные вертикальные позиции, как в reference graph.
3. Для нескольких roots используется crossing-free forest preorder по tree
   depth. Это только компактный seed: последующий constraint refinement
   размыкает общие строки, а ranks не входят в result.
4. Seed уточняется constraint-based stress placement из WebCola с
   `avoidOverlaps`, `flowLayout("y")` и compile-time количеством итераций.
   Однокорневой reference получает `4 + 8` constrained/overlap iterations,
   multi-root graph — `1 + 2`. Consumer не может увеличить budget.
5. `constraint=true` получает полный parent separation. `constraint=false`
   получает только слабое положительное flow separation и spring attraction.
   Поэтому связи остаются направленными вниз, но ноды не возвращаются на общие
   горизонтальные строки.
6. Collision boxes включают `nodeSpacing`; фактические output rectangles
   сохраняют исходные размеры. Tie-break в каждой фазе использует ID, поэтому
   перестановка input collections не меняет result.

## Routing pipeline

1. Constrained backbone маршрутизируется первым, остальные edges — после него
   в стабильном ID-order. Все они возвращают одинаковый cubic contract и
   рисуются одним цветом и толщиной.
2. Свободный downward edge получает один cubic segment с вертикальной
   касательной у `SOUTH` и `NORTH`. Adaptive cubic/rectangle subdivision
   запрещает проход через interior чужой ноды.
3. Заблокированный edge использует coordinate-compressed Lee/A* grid,
   построенный один раз из expanded node rectangles и всех exact port columns.
   Перед A* проверяется bounded набор horizontal/vertical channel candidates и
   внешних corridors.
4. Route objective лексикографически ставит proper edge crossings выше длины и
   числа bends. Backbone уже занят к моменту secondary routing, поэтому новый
   route выбирает свободный corridor, если он существует.
5. Найденный obstacle-free polyline преобразуется в геометрически гладкую
   cubic chain: terminal segments остаются вертикальными, corner arcs имеют
   совпадающие направления касательных, repeated/collinear points удаляются.
6. Каждый semantic edge материализует и рисует собственную cubic chain и
   собственный arrow. Совпадающие trunks, junctions и renderer dedup запрещены;
   semantic edge IDs никогда не сливаются в физическую связь.

## Ограниченная стоимость

1. Нормализация, DAG validation и forest extraction выполняются до дорогих
   фаз. Invalid graph не запускает placement или router.
2. Tidy-tree и multi-root forest seeds линейны после сортировки. WebCola
   iteration counts являются compile-time constants.
3. Coordinate grid создаётся один раз на вызов. Channel enumeration и A* не
   имеют consumer-настраиваемых exhaustive budgets; поиск ограничен конечными
   координатами нод и портов текущего graph.
4. Production budget закрыт: максимум `128` нод, `256` портов и `512` edges.
   Превышение отклоняется до placement. Более крупный graph требует другой
   специализированной policy или staged projection, а не скрытого роста этого
   hot path.
5. Result materialize только production geometry. Forest, ranks, stress state,
   grid, occupancy и diagnostics наружу не копируются.
6. Top-down остаётся отдельным module graph и Worker executor. Его зависимости
   и byte budget не попадают в fixed/adaptive artifacts.

## Алгоритмические источники

- Reingold–Tilford, *Tidier Drawings of Trees*:
  https://reingold.co/tidier-drawings.pdf
- van der Ploeg implementation for variable-size non-layered trees:
  https://github.com/Klortho/d3-flextree
- Graphviz/DOT phases, non-constraining edges and spline routing:
  https://graphviz.org/docs/layouts/dot/
- WebCola flow constraints and overlap removal:
  https://ialab.it.monash.edu/webcola/doc/classes/_layout_.layout.html
