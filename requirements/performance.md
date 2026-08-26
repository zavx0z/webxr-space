# Архитектурные требования производительности

Этот документ владеет общими правилами структуры `@nodes/layout`, направленными
на минимальную стоимость production-вызова и минимальный размер конкретной
policy-сборки. Геометрические законы остаются в требованиях своих policies.

## Изолированные policy-сборки

1. Каждая существенно отличающаяся раскладка имеет точный public entrypoint и
   собственный статический module graph. Production registry, строковый выбор
   policy, dynamic dispatch и импорт всех solver-ов из корневого entrypoint
   запрещены.
2. Worker executor импортирует ровно одну policy. Main-thread client импортирует
   только transport и serializable types; solver, validator и fixture code в
   client bundle не входят.
3. При закреплённой версии toolchain новая policy сохраняет exact raw bytes,
   gzip bytes и SHA-256 существующих policy и Worker artifacts. Package-boundary
   tests собирают каждый entrypoint отдельно и проверяют также отсутствие чужих
   error markers и implementation modules. Новый baseline принимается только
   отдельным явным performance-решением, а не побочным эффектом feature-задачи.
4. Общими могут быть только небольшие policy-neutral leaf primitives:
   числовая проверка, fixed-point/rectangle math, stable ID comparison и
   transport envelope. Placement, ranking, candidate search и routing не
   объединяются ради DRY, если это добавляет ветвление или чужой код в artifact.
5. Корневой `@nodes/layout` сохраняет действующий узкий contract. Новая policy
   публикуется только своим subpath и не становится скрытым compatibility alias.

## Горячий вычислительный путь

1. Solver является синхронной pure function. Внутри расчёта запрещены I/O,
   DOM/WebGPU, Worker API, часы, случайность, JSON clone/serialization и чтение
   предыдущего результата.
2. Вход нормализуется один раз. После нормализации горячие фазы используют
   индексированные массивы и maps, созданные до вложенных проходов. Исключение
   допускается только для bounded obstacle/crossing score конкретной policy и
   обязано иметь frozen benchmark.
3. Полный перебор перестановок, сторон или произвольной candidate geometry запрещён.
   Число refinement/sweep проходов является константой конкретной policy и не
   открывается consumer-опцией без жёсткой верхней границы.
4. Ошибки структуры обнаруживаются до placement/routing. Невалидный graph,
   цикл в DAG-policy или неизвестный endpoint не запускают дорогую фазу и не
   заменяются fallback solver-ом.
5. Результат содержит только geometry, необходимую renderer-у. Input graph,
   внутренние ranks, adjacency, search state, metrics и debug witness не
   дублируются в успешном production-result.
6. Viewport, pan, zoom и presentation state не входят в policy, если не влияют
   на её геометрию. Изменение только вида не должно инвалидировать глобальную
   раскладку.
7. Известный внешний алгоритм разрешён только внутри точного policy entrypoint.
   Его dependency bytes, фиксированные iteration budgets и отсутствие в других
   policy bundles закрепляются package-boundary tests.

## Доказательство

1. Functional tests проверяют hard geometry, детерминизм и инвариантность к
   перестановке input collections.
2. Representative fixture содержит не только короткую цепочку, но fan-in,
   fan-out, несколько roots, длинные edges и разные intrinsic node sizes.
3. Bundle gate фиксирует независимые raw/gzip budgets каждого executor и
   solver-free client. Изменение toolchain создаёт новый baseline и не
   маскируется расширением лимитов в той же задаче.
4. Финальный benchmark запускается на frozen inputs после завершения geometry.
   Сравниваются только одинаковые input bytes, runtime и build conditions;
   единичный лучший sample не является результатом.
5. Заявление о максимальной или сравнительной производительности допустимо
   только с измерением. Архитектурная изоляция и ограниченная сложность являются
   проверяемыми свойствами, но не заменяют benchmark.

## Frozen top-down baseline

Принятый запуск `bun run --cwd packages/layout benchmark:top-down` на Bun 1.4.0,
macOS x64, source hash
`7dc39f9d10e2e4d9c301edcf0f68374abe3f2aad35b8f792c8269d99513d5031`:

| Fixture | Nodes / edges | Median | p95 |
| --- | ---: | ---: | ---: |
| Blender reference | 19 / 20 | 18.20 ms | 29.30 ms |
| Dense independent edges | 54 / 85 | 319.70 ms | 328.00 ms |
| Layered budget | 96 / 87 | 80.39 ms | 83.93 ms |

Top-down browser solver artifact имеет отдельный gate `107437` raw / `33253`
gzip bytes; Worker executor — `107895` / `33449`. Fixed/adaptive bytes и hashes
остаются прежними. Новая toolchain или geometry меняет baseline только вместе с
повторным frozen benchmark и package-boundary evidence.
