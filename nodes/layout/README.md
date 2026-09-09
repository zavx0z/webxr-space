# Раскладка

`@nodes/layout` принимает измеренный числовой граф и возвращает геометрию.
Пакет не измеряет текст, не создаёт DOM, Canvas, Renderer или NodeTree и не
управляет панорамированием. Его production-зависимости — Dagre и d3-dag.
TSX в `.storybook/` принадлежит только документации этого числового договора.

## Алгоритмы

| Алгоритм | Вход | Результат и ограничения |
| --- | --- | --- |
| [Fixed](./algorithms/fixed/src/index.ts) | Измеренные ноды, `y` портов, связи, viewport, spacing | `RIGHT` / `DOWN`, источник `EAST`, приёмник `WEST`, ортогональные sections. Один порт с конфликтующими ролями отклоняется |
| [Adaptive](./algorithms/adaptive/src/index.ts) | Тот же граф с `capability` и `allowedSides` | Одна сторона для каждого точного сокета, включая общий. Возвращает bounds, sections и диагностику ограниченного поиска |
| [TopDown](./algorithms/top-down/src/index.ts) | Плоский DAG и `x` портов без viewport | `SOUTH` → `NORTH`, единые цепочки cubic curves. Цикл возвращает typed witness |
| [Coffman–Graham](./algorithms/coffman-graham/src/index.ts) | DAG, `x` портов и `maxNodesPerLayer` | Ограниченные по ширине слои, cubic curves и массив crossings. Цикл возвращает typed witness |

В [каталоге](.storybook/catalog.json) каждый алгоритм имеет отдельный предмет
и применимые варианты. Каждая история действительно вызывает публичный API,
показывает исходный graph и полный вычисленный result или пойманную ожидаемую
ошибку. Кнопка «Вычислить снова» повторяет тот же сценарий.

У Fixed и Adaptive показаны альбомная/портретная области, вложенность и
политика сторон. У Adaptive один `source/shared` соединён с двумя приёмниками:
`selectedSides`, число кандидатов и причины отказа получены из алгоритма.
У Coffman–Graham можно сопоставить ограничения в две и три ноды на слой
на одном графе с тремя приёмниками. Production-диапазон `maxNodesPerLayer` —
целое число от 2 до 16.
Пустой массив `crossings` означает, что этот вход не оставил пересечений;
он не доказывает поведение на всех конфликтующих маршрутах.

## Числовой протокол

Истории «Входной граф» и «Геометрия результата» раскрывают
[LayoutGraph / LayoutResult](./protocol/types/src/protocol.ts): measured размеры,
`parentId`, `contentHeight`, port offsets, абсолютные стороны, bounds и
sections с bend points. Viewport существует во входе Fixed/Adaptive,
но не переносится в результат.

TopDown и Coffman–Graham представлены собственными числовыми результатами.
Production NodeEditor сейчас ожидает горизонтальные стороны портов;
их полноценная визуальная интеграция остаётся отдельным срезом Nodes.
Эти страницы не заменяют его собственным рисованием графа.

## Воркеры

У каждого алгоритма есть собственные [client/executor](./execution/worker/src/index.ts).
Истории `workers/*/equivalence` запускают физически отдельный module Worker,
передают graph через production client, получают envelope с requestId/generation
и сравнивают result и диагностику с прямым вызовом. `workers/*/failure`
показывают реальный `WorkerRemoteError`, включая typed witness у Adaptive,
TopDown и Coffman–Graham. По завершении расчёта клиент прекращает Worker.

Dev entry каждого Worker динамически импортируется отдельным модулем. Его
`new Worker(import.meta.url, {type: "module"})` запускает тот же emitted module
по same-origin URL; обработчик устанавливается только в Worker global и вызывает
точный production executor. Это не Blob, не второй алгоритм и не main-thread
fallback. Сборка и browser-приёмка должны подтвердить, что entry остался отдельным
ESM chunk. Ошибка загрузки или timeout прерывают историю и не выдаются за успех.

«Транспорт → поколения и dispose» использует настоящий Fixed Worker:
два ожидающих запроса, `cancelBefore`, завершение текущего поколения,
отказ незавершённого и нового запросов после `dispose`.
Отдельный вариант «Управляемый endpoint → ошибки» честно использует test double,
чтобы подать generation mismatch, serialized failure, error event и синхронный
отказ `postMessage`; он также проверяет снятие listeners и `terminate`.

## Проверки и источники

[storybook.test.ts](./tests/storybook.test.ts) проверяет полноту деклараций,
измеренную геометрию, стороны, compound containment, typed witnesses,
равенство реальных Worker результатам direct API и transport lifecycle.
[contract.test.ts](./tests/contract.test.ts) сохраняет production-границы числового
пакета. Исходные [fixtures](.storybook/stories/fixtures.ts),
[сценарии алгоритмов](.storybook/stories/reports.ts) и
[сценарии Worker](.storybook/stories/worker-reports.ts) доступны из ресурсов
вариантов. Выполнение тестов и browser-приёмка учитываются отдельно.
