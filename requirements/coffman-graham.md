# Алгоритмические требования Coffman–Graham Layered

Этот документ владеет отдельной policy `@nodes/layout/coffman-graham` для
больших плоских DAG. Она не является режимом `Dagre Layered` и не выбирается
автоматически по размеру input.

## Публичная граница

1. API называется по алгоритму: `layoutCoffmanGraham`. Storybook и routes не
   называют policy по содержимому fixture.
2. Input содержит measured leaf-ноды, отдельные exact ports и semantic edges.
   Source ports разрешаются в `SOUTH`, target ports — в `NORTH`.
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
4. Каждая link point chain сохраняет строго нисходящие diagonal/vertical
   sections. Только реальные corners скругляются Bézier-дугой радиусом `5`.
   Horizontal terminal shelves и S-изгиб всего edge запрещены.
5. Все исходные semantic edges возвращаются независимо и заканчиваются в своих
   exact ports.
6. Несколько semantic edges между одной парой нод дают одну structural relation
   только во внутреннем simple-DAG представлении layering-а. Dummy width
   резервируется сразу под все такие edges, после чего каждой связи назначается
   собственный stable lane и собственная geometry. Общий output trunk не
   создаётся.

## Ограниченная стоимость

1. Production budget: максимум `512` nodes, `4096` ports и `2048` edges.
2. Coffman–Graham layering имеет bounded quadratic node work; layer width,
   sweep count и corner radius не могут расти от consumer input.
3. Policy синхронна, deterministic и не читает DOM, viewport, clock,
   randomness или предыдущий result.
4. `coffman-graham`, `top-down`, `fixed` и `adaptive` являются разными module
   graphs. Добавление этой policy не меняет bytes/hashes существующих bundles.

## Acceptance

- не больше `maxNodesPerLayer` настоящих nodes на одном layer;
- frozen compact bounds/aspect для fixture `54/85`;
- input-order invariance и stable geometry hash;
- exact independent endpoints;
- отсутствие node overlap и edge/node intersections;
- отсутствие horizontal route sections и общих trunks;
- отдельные raw/gzip gates и benchmark.

## Источники

- Coffman & Graham, *Optimal Scheduling for Two-Processor Systems* (1972):
  https://fanchung.ucsd.edu/ron/papers/72_04_two_processors.pdf
- Coffman–Graham graph layering и width bound:
  https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-layering-coffmanGraham-layerBound.html
- Pinned synchronous MIT implementation:
  https://unpkg.com/d3-dag@0.9.1/dist/sugiyama/layering/coffman-graham.js
