# Алгоритмические требования Coffman–Graham Layered

Этот документ владеет отдельной policy `@nodes/layout/coffman-graham` для
больших плоских DAG. Она не является режимом `Dagre Layered` и не выбирается
автоматически по размеру input.

## Публичная граница

1. API называется по алгоритму: `layoutCoffmanGraham`. Storybook и routes не
   называют policy по содержимому fixture.
2. Input содержит measured leaf-ноды, отдельные ports и semantic edges.
   Source ports разрешаются в `SOUTH`, target ports — в `NORTH`. Переданные `x`
   являются measured слотами каждой пары node+side. Policy всегда назначает
   port ID этим слотам по connection order; набор слотов, сторона и edge
   ownership не меняются. Альтернативного port-order режима нет.
3. Один port принадлежит одному edge. Edge subtypes, bundling, shared trunks и
   runtime router selection запрещены.
4. Полный graph обязан быть DAG. Cycle и invalid endpoints отклоняются до
   layering с typed stable witness.

## Pipeline

1. Layering — Coffman–Graham с `maxNodesPerLayer=4` по умолчанию. Public option
   допускает только integer `2..16`; значение входит в geometry cache key.
2. Crossing reduction — deterministic two-layer sweeps из pinned
   `d3-dag@0.9.1`. Coordinate assignment — deterministic greedy coordinate
   phase. Policy импортирует exact Coffman–Graham, two-layer, greedy и DAG
   modules, а не полный package bundle; ILP/quad solvers в production artifact
   не входят.
3. Variable node sizes передаются layout operator до placement. Dummy points
   не материализуются как output nodes.
4. После node/dummy crossing reduction policy выводит port order из connection
   order: входные `NORTH` ports сортируются по X предыдущего
   dummy/source, выходные `SOUTH` — по X следующего dummy/target. Равенства
   разрешаются stable edge ID. Это один bounded pass без перестановочного
   поиска; после него port order замораживается до routing.
5. Каждая link point chain сохраняет строго нисходящие diagonal/vertical
   sections. Только реальные corners скругляются Bézier-дугой радиусом `5`.
   Horizontal terminal shelves и S-изгиб всего edge запрещены.
6. Все исходные semantic edges возвращаются независимо и заканчиваются в своих
   exact ports.
7. Несколько semantic edges между одной парой нод дают одну structural relation
   только во внутреннем simple-DAG представлении layering-а. Dummy width
   резервируется сразу под все такие edges, после чего каждой связи назначается
   собственный stable lane и собственная geometry. Общий output trunk не
   создаётся.
8. `edgeSpacing` означает минимальное евклидово расстояние между совместимыми
   centerlines, а не только разницу координат `x`. В каждом межслойном corridor
   diagonal sections получают deterministic tracks: совместимые диагонали
   могут делить offset только при X-clearance не меньше `edgeSpacing`.
   Diagonal rise равен одному `edgeSpacing`; Y-offset каждого следующего track
   вычисляется exact pairwise difference constraint как минимальное значение,
   при котором finite diagonal segments находятся не ближе `edgeSpacing`.
   Один консервативный pitch `diagonalRise + edgeSpacing` запрещён: для почти
   горизонтальных связей он без необходимости удваивает видимый ритм.
9. Corridor получает ровно один bounded expansion до routing. Для каждого edge
   остаются vertical terminal/gateway sections от exact port или dummy lane,
   одна diagonal section на пересекаемый corridor и локальные rounded corners.
   Source reserve равен двум `edgeSpacing`, а target ingress reserve — восьми
   `edgeSpacing`. Поэтому связь выходит из `SOUTH` port прямым участком, а весь
   боковой переход завершается до защищённой terminal-зоны и связь входит в
   `NORTH` port длинным прямым участком. Увеличенный ingress является фиксированной
   константой policy, а не consumer option.
   Iteration до сходимости, edge bundling и новый placement solver запрещены.
10. Track order минимизирует vertical/diagonal crossings попарной стоимостью
   обеих возможных ориентаций. Пересечение, вызванное inversion фиксированных
   boundary anchors, не маскируется удалением constraint: result публикует одно
   stable `crossing` событие с единым правилом `diagonal over vertical`.
   Presentation обязан разорвать under-edge коротким gap либо нарисовать
   эквивалентный bridge; это metadata одного connection pipeline, не edge type.

## Ограниченная стоимость

1. Production budget: максимум `512` nodes, `4096` ports и `2048` edges.
2. Coffman–Graham layering имеет bounded quadratic node work; layer width,
   sweep count и corner radius не могут расти от consumer input.
   Diagonal-track compatibility проверяется попарно не более одного раза на
   corridor; её худшая стоимость ограничена production edge budget. Port-order
   phase добавляет один deterministic `O(P log P)` pass.
3. Policy синхронна, deterministic и не читает DOM, viewport, clock,
   randomness или предыдущий result.
4. `coffman-graham`, `top-down`, `fixed` и `adaptive` являются разными module
   graphs. Добавление этой policy не меняет bytes/hashes существующих bundles.

## Acceptance

- не больше `maxNodesPerLayer` настоящих nodes на одном layer;
- frozen compact bounds/aspect для fixture `54/85`;
- input-order invariance и stable geometry hash;
- exact independent endpoints;
- exact slot set сохраняется, а terminal inversions, разрешимые перестановкой
  port IDs, устраняются;
- отсутствие node overlap и edge/node intersections;
- отсутствие horizontal route sections и общих trunks;
- clearance каждой пары совместимых diagonal line sections не меньше
  `edgeSpacing`;
- каждый ненулевой diagonal track offset имеет binding predecessor с clearance,
  равным `edgeSpacing`; лишний Y-reserve отсутствует;
- все residual intersections классифицированы ровно одним crossing event;
- crossing не попадает в последние шесть `edgeSpacing` перед target port;
- порядок over/under и crossing geometry не зависят от порядка input;
- отдельные raw/gzip gates и benchmark.

## Источники

- Coffman & Graham, *Optimal Scheduling for Two-Processor Systems* (1972):
  https://fanchung.ucsd.edu/ron/papers/72_04_two_processors.pdf
- Coffman–Graham graph layering и width bound:
  https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-layering-coffmanGraham-layerBound.html
- Pinned synchronous MIT implementation:
  https://unpkg.com/d3-dag@0.9.1/dist/sugiyama/layering/coffman-graham.js
- Stable gap/bridge presentation for residual crossings:
  https://docs.jointjs.com/api/connectors/
  https://docs.yfiles.com/yfiles-html/dguide/bridges-customizations/
- ELK port constraints и вывод свободного порядка из connections:
  https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html
  https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-considerModelOrder-portModelOrder.html
- Spönemann et al., *Drawing Layered Graphs with Port Constraints*:
  https://rtsys.informatik.uni-kiel.de/~biblio/downloads/papers/jvlc13.pdf
