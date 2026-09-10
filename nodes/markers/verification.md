# Проверка маркеров и общих defaults

10 сентября 2026, canonical checkout webxr-space, текущая ветка main.

## Автоматические проверки

| Владелец | Проверка | Результат |
| --- | --- | --- |
| @webxr/nodes | bun run --cwd nodes check | 53 теста, 4105 assertions, typecheck PASS |
| @nodes/node | bun run --cwd nodes/node check | 27 тестов, 316 assertions, typecheck PASS |
| @webxr/markdown | bun run --cwd markdown check | 25 тестов, 328 assertions, typecheck PASS |

Проверены отсутствие неявного kind, все 19 явных Socket kinds, приоритет color,
компоненты start/end/both, смешанные виды, legacy flags и advanced markers,
сохранение Link/Arrow Elements при обновлении маршрута и Mermaid LR↔TD.
Source-примеры компилируются публичным Template compiler. Реальные тесты
DiagramNode проверяют fill/border/padding/typography и измеренный круг.

## Storybook MCP: просмотр кандидатов

Использованы только status/check/open/inspect/interact/capture инструменты MCP.
Кандидаты были ready/presented, diagnostics и consoleErrors пусты.

- @webxr/nodes, b24ad300edaa280475b0b140: components/link/orthogonal,
  arrows, filled-arrows, mixed-markers, types, color; markers/arrow/open и filled.
  На preview видны нейтральная связь без стрелок, отдельные start/end/both,
  смешанные фигуры, 20 строк default+явные типы и приоритет color.
- @nodes/node, 337a8aa6a7ce2818f7d8838c: diagram/rectangle показывает общий
  DiagramNode с новым оформлением. composition/dependencies сохраняет свой
  явно заданный custom-цвет связей.
- @nodes/node, fac58f4d97dcd512085240fe: обзор diagram → кнопка «Зависимости».
  Реальный runtime viewer показывает шесть DiagramNode и пять нейтральных связей
  с открытыми Arrow. Capture: capture_jF9Eune5Zl2ZrfVdluaJvBXp.
- @webxr/markdown, ad063b17b3b3d913e7ccc7db: components/data/markdown/mermaid/flowchart.
  После стабилизации layout кнопка «Граф из обсуждения» показывает семь нод
  с заполненными Arrow, прежними асимметричными размерами и shared defaults.

Preview capture подтверждает изображение данного кадра; это не доказательство
first-visible frame или pixel-perfect совпадения с Desktop.

## Незавершённое применение

storybook_check(live:true) завершился activation diagnostic
`The connection was closed.` для Nodes, Node и Markdown. Повтор Nodes дал тот
же результат. Последние рабочие active revisions сохранены:
Nodes 0fde56930b9f7092c33dc7fc, Node 09d1f89335170f2d07b32744,
Markdown 8c2860f0a14491925d3b9fc2. Просмотр кандидата не выдан за успешную
активацию всех вкладок. Диагностика передана координатору Storybook runtime;
после исправления требуется scoped apply и wait active.

Platform code, общая UI theme, font assets/registry и внешний runtime
Storybook в этой задаче не изменялись.
