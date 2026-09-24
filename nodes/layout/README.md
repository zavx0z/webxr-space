# Раскладка

`@nodes/layout` принимает измеренный числовой граф и возвращает геометрию.
Пакет не измеряет текст, не создаёт DOM, Canvas, Renderer или NodeTree и не
управляет панорамированием. Его production-зависимости — Dagre и d3-dag.

## Алгоритмы

| Алгоритм | Вход | Результат и ограничения |
| --- | --- | --- |
| [Fixed](./algorithms/fixed/index.ts) | Измеренные ноды, `y` портов, связи, viewport, spacing | `RIGHT` / `DOWN`, источник `EAST`, приёмник `WEST`, ортогональные sections. Один порт с конфликтующими ролями отклоняется |
| [Adaptive](./algorithms/adaptive/index.ts) | Тот же граф с `capability` и `allowedSides` | Одна сторона для каждого точного сокета, включая общий. [Диагностический вариант](./algorithms/adaptive/diagnostics/index.ts) возвращает также bounded-search counters |
| [TopDown](./algorithms/top-down/index.ts) | Плоский DAG: точные `x` портов либо `attachment: "contour"` | Прежние `SOUTH` → `NORTH` или пересечения фигур, cubic curves. [Контракт и parity evidence](top-down-parity.md) |
| [Coffman–Graham](./algorithms/coffman-graham/index.ts) | DAG, `x` портов и `maxNodesPerLayer` | Ограниченные по ширине слои, cubic curves и массив crossings. Цикл возвращает typed witness |

У Adaptive один `source/shared` может соединяться с двумя приёмниками:
алгоритм возвращает выбранные стороны, число кандидатов и причины отказа.
Production-диапазон `maxNodesPerLayer` у Coffman–Graham — целое число от 2 до 16.
Пустой массив `crossings` означает только отсутствие пересечений на данном входе.

Фиксированная политика экспортирует `FixedLayoutInput` и `FixedLayoutOutput` из
`@nodes/layout` и `@nodes/layout/fixed`. Они заменили прежние alias общего
протокола `FixedLayoutGraph` и `FixedLayoutResult`; `layoutFixed` принимает
измеренный вход и возвращает ту же числовую геометрию со сторонами портов.

## Числовой протокол

[LayoutGraph / LayoutResult](./protocol/types/src/protocol.ts) задаёт measured
размеры, `parentId`, `contentHeight`, port offsets, стороны, bounds и sections
с bend points. Viewport входит в Fixed/Adaptive, но не переносится в результат.
TopDown и Coffman–Graham возвращают собственные числовые результаты; их
визуальная интеграция с NodeEditor требует отдельного договора.

## Воркеры

Каждый алгоритм имеет собственные [client/executor](./execution/worker/src/index.ts).
Worker получает graph через production client и возвращает envelope с
`requestId` и `generation`. Отказ приходит как `WorkerRemoteError` с typed
witness, когда он предусмотрен политикой. После расчёта client освобождает Worker.
Транспорт отклоняет устаревшее поколение и новые запросы после `dispose`.

## Проверки

[Тесты алгоритмов](./tests/algorithms.test.ts) проверяют геометрию и направления.
[Тесты Worker](./tests/worker.test.ts) сравнивают executor и отдельный Worker
с прямым API, проверяют сериализованные ошибки, поколения и `dispose`.
[Контрактные тесты](./tests/contract.test.ts) сохраняют границы пакета.
Входные данные тестов находятся в [локальной фикстуре](./tests/layout.fixture.ts).
