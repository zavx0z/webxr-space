# Алгоритмические требования top-down

Этот документ владеет отдельной policy `@nodes/layout/top-down`. Она строит
плоскую причинную DAG-схему сверху вниз и повторяет узкий pipeline обычного
Codex Mermaid flowchart: Dagre placement и одинаково скруглённые независимые
edges. Это не responsive-режим `DOWN` compound solver-а fixed/adaptive.

## Публичная граница

1. Input содержит заранее измеренные leaf-ноды, точные horizontal offsets
   портов и semantic edges. Viewport, renderer state, ручные coordinates,
   ranks, bends и lanes в contract не входят.
2. У edge есть ровно один semantic type: `id`, `sourcePortId` и
   `targetPortId`. `constraint`, `tree`, `cross`, `shortcut`, выбор router-а и
   другие классы связи запрещены. Все edges участвуют в одном pipeline.
3. Полный graph обязан быть DAG. Cycle отклоняется до placement с typed
   `CYCLE_DETECTED` witness; policy не разворачивает edge и не запускает другой
   solver как fallback.
4. Source-port разрешается в `SOUTH`, target-port — в `NORTH`. Один exact port
   принадлежит ровно одному semantic edge и не может использоваться повторно
   или играть обе роли. Fan-in/fan-out получают отдельные endpoints.
5. Intrinsic размеры нод не меняются. Output содержит только `DOWN`, bounds,
   rectangles, абсолютные port centers и один geometry type: цепочку cubic
   Bézier segments для каждого edge.

## Единый placement pipeline

1. Любой допустимый input — reference, dense, single-root или multi-root —
   проходит один Dagre/Sugiyama вызов. Ветка по количеству roots, force-layout,
   tidy-tree, forest seed и последующий refinement запрещены.
2. Dagre graph является directed named multigraph. Каждая semantic связь
   добавляется отдельным named edge; parallel edges не схлопываются.
3. Конфигурация фиксирована: `rankdir="TB"`, `ranker="network-simplex"`.
   `nodeSpacing`, `layerSpacing` и `edgeSpacing` напрямую отображаются в
   `nodesep`, `ranksep` и `edgesep`; defaults равны `50`, `50` и `20`.
4. Input collections нормализуются по ID до Dagre. Stable edge insertion order
   закрепляет одинаковую ориентацию симметричных решений. Внутри Dagre order
   phase ациклические sibling constraints следуют source-port order для fan-out
   и target-port order для fan-in; это не отдельный placement pass.
5. Dagre одновременно владеет ranking, crossing reduction, node placement и
   индивидуальными point chains edges. Никакой второй placement или routing
   policy после него не меняет ranks и coordinates нод.

## Единый edge pipeline

1. Каждый edge получает только свою point chain из Dagre. Edge-to-edge graph,
   общий trunk, junction, bundling, renderer dedup и соединение одного edge с
   другим edge запрещены.
2. Все point chains проходят одну функцию `rounded` с фиксированным радиусом
   поворота `5`, как Codex Mermaid flowchart. Прямой участок остаётся прямым;
   каждый настоящий поворот получает tangent-aligned quadratic Bézier corner.
   Это естественная геометрия одного renderer-а, а не разные типы edges.
3. Production result использует только cubic primitive. Mermaid-подобный `L`
   сериализуется как вырожденная cubic Bézier, а `Q` — как математически
   эквивалентная cubic Bézier. Поэтому renderer не ветвится по segment type.
4. Первый segment начинается точно в source port, последний заканчивается
   точно в target port. Каждая связь материализует собственную cubic chain и
   собственный arrow.
5. Lee/A*, visibility grid, external corridors, obstacle fallback, случайные
   bends и route scoring не входят в эту policy. Если Dagre не возвращает
   point chain, вызов завершается ошибкой, а не другим алгоритмом.

## Ограниченная стоимость

1. Нормализация и DAG validation выполняются до Dagre. Invalid graph не
   запускает placement.
2. Production budget закрыт: максимум `128` нод, `256` портов и `512` edges.
   Превышение отклоняется до placement. Более крупный graph требует другой
   специализированной policy или staged projection.
3. Consumer может менять только bounded spacing values. Ranker, количество
   проходов, curve mode и corner radius не являются runtime options.
4. Result materialize только production geometry. Dagre ranks, dummy nodes,
   order state и diagnostics наружу не копируются.
5. Top-down остаётся отдельным module graph и Worker executor. Dagre и его byte
   budget не попадают в fixed/adaptive artifacts.

## Проверяемые свойства

Focused tests обязаны фиксировать:

- input-order invariance;
- exact `SOUTH`/`NORTH` endpoints;
- отдельные endpoints и paths всех semantic edges;
- отсутствие общих линейных trunks в reference fixture;
- fan-in и parallel named edges без relation subtype;
- node non-overlap и отсутствие edge/node intersections на reference;
- stable cycle witness и fail-closed invalid inputs;
- frozen reference/dense bounds, result hashes, bundle bytes и benchmark.

## Алгоритмический источник

- Dagre — directed graph layout for JavaScript:
  https://github.com/dagrejs/dagre
- Mermaid flowchart syntax and curve configuration:
  https://mermaid.js.org/syntax/flowchart.html
