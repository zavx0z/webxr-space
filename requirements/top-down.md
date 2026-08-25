# Алгоритмические требования top-down

Этот документ владеет отдельной policy `@nodes/layout/top-down`. Она строит
плоскую причинную DAG-схему сверху вниз и не является responsive-режимом `DOWN`
compound solver-а fixed/adaptive.

## Граница

1. Input содержит заранее измеренные leaf-ноды, точные horizontal offsets
   портов, semantic edges и числовые интервалы. Containment, compound gateways,
   parameter rows, viewport и renderer state не входят в contract.
2. Каждый source-port разрешается в `SOUTH`, каждый target-port — в `NORTH`.
   Один exact port не может одновременно играть обе topology roles.
3. Graph обязан быть ацикличным. Cycle отклоняется до placement с typed
   `CYCLE_DETECTED` witness; policy не разворачивает edge и не запускает другой
   solver как fallback.
4. Intrinsic размеры нод не меняются. Output содержит только `DOWN`, bounds,
   rectangles нод, абсолютные центры портов и одну ортогональную section каждого
   semantic edge.

## Placement

1. Rank вычисляется longest-path проходом по устойчивому topological order.
   Каждый target находится минимум на один rank ниже source; длинная связь не
   создаёт materialized dummy-ноды.
2. Порядок внутри rank уточняется фиксированным числом median/barycenter sweeps.
   Tie-break всегда использует semantic ID; порядок input-массивов не является
   сигналом.
3. Ноды одного rank располагаются слева направо без overlap с одним
   `nodeSpacing`. Rank центрируется относительно самой широкой строки, поэтому
   одинокий root остаётся над общей структурой без viewport-зависимого relayout.
4. Высота rank равна максимальной intrinsic height его нод. Между ranks
   резервируется только фактически нужный набор route tracks, но не меньше
   `layerSpacing`.

## Routing

1. Edge выходит вертикально из exact `SOUTH` center и входит вертикально в exact
   `NORTH` center. Все промежуточные segments ортогональны.
2. Edge между соседними ranks использует только их межслойный corridor. Каждый
   несовпадающий horizontal run получает устойчивый track с `edgeSpacing`.
3. Edge, пропускающий один или несколько ranks, сначала использует ближайший
   свободный вертикальный канал между промежуточными нодами. Канал обязан иметь
   `edgeSpacing` до node rectangles и ранее занятых несвязанных channels.
4. Внешняя левая или правая lane является только fallback, когда локального
   канала нет. Выбор стороны минимизирует горизонтальный detour; вертикальная
   часть fallback-lane проходит вне всех node rows.
5. Проверка локального канала не создаёт dummy objects на каждый промежуточный
   rank. Production output и постоянная память не зависят от суммы длин edges
   по ranks.
6. Связи одного exact source или target могут иметь общий terminal segment, но
   остаются разными semantic edges. Несвязанные horizontal tracks и внешние
   lanes не overlap.
7. Repeated и коллинеарные точки удаляются без изменения exact endpoints.

## Ограниченная сложность

1. Нормализация и topological ranking имеют стоимость `O(V + E)` после
   стабильной сортировки IDs.
2. Crossing reduction выполняет константное число sweeps; стоимость каждого
   ограничена сортировкой нод внутри ranks и обходом adjacency.
3. Placement и routing materialize `O(V + E)` production objects. Алгоритм не
   создаёт `O(E × ranks)` dummy graph и не использует visibility A*.
4. Consumer не может увеличить число sweeps или включить exhaustive search
   через layout options.
