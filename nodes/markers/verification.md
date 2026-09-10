# Проверка маркеров и общих defaults

10 сентября 2026, canonical checkout webxr-space, текущая ветка main.

## Автоматические проверки

| Владелец | Проверка | Результат |
| --- | --- | --- |
| @webxr/nodes | bun run --cwd nodes check | 53 теста, 4105 assertions, typecheck PASS |
| @nodes/node, до удаления устаревших историй | bun run --cwd nodes/node check | 27 тестов, 316 assertions, typecheck PASS |
| @webxr/markdown | bun run --cwd markdown check | 25 тестов, 328 assertions, typecheck PASS |
| @nodes/node, после удаления устаревших историй | bun run --cwd nodes/node check | 25 тестов, 209 assertions, typecheck PASS |

Проверены отсутствие неявного kind, все 19 явных Socket kinds, приоритет color,
компоненты start/end/both, смешанные виды, legacy flags и advanced markers,
сохранение Link/Arrow Elements при обновлении маршрута и Mermaid LR↔TD.
Source-примеры компилируются публичным Template compiler. Реальные тесты
DiagramNode проверяют fill/border/padding/typography и измеренный круг.

## Storybook MCP: компоненты

Использованы только инструменты Storybook MCP. Проверенные кандидаты были
ready/presented, diagnostics и consoleErrors пусты.

- @webxr/nodes, b24ad300edaa280475b0b140: components/link/orthogonal,
  arrows, filled-arrows, mixed-markers, types, color; markers/arrow/open и filled.
  На preview видны нейтральная связь без стрелок, отдельные start/end/both,
  смешанные фигуры, 20 строк default+явные типы и приоритет color.
- @nodes/node, 337a8aa6a7ce2818f7d8838c: diagram/rectangle показывает общий
  DiagramNode с новым оформлением.
- @nodes/node, fac58f4d97dcd512085240fe: обзор diagram → кнопка «Зависимости».
  Runtime viewer показывает шесть DiagramNode и пять нейтральных связей
  с открытыми Arrow. Capture: capture_jF9Eune5Zl2ZrfVdluaJvBXp.
- @webxr/markdown, ad063b17b3b3d913e7ccc7db: components/data/markdown/mermaid/flowchart.
  После стабилизации layout кнопка «Граф из обсуждения» показывает семь нод
  с заполненными Arrow, прежними асимметричными размерами и shared defaults.

Preview capture подтверждает изображение данного кадра; это не доказательство
first-visible frame или pixel-perfect совпадения с Desktop.

## Применение и итоговая очистка

Первые попытки применения завершились `The connection was closed.` и сохранили
прежние active revisions. Затем runtime owner штатными MCP check/live/wait
подтвердил active=lastWorking: Nodes 437e6837b7cb06c77749419c,
Markdown fdc479f14d33ccdeea361f69 и Node fac58f4d97dcd512085240fe.
Причина исторического закрытия соединения не устанавливалась; сервер не
перезапускался. Видимый обновлённый Diagram до применения был корректным preview.

По отдельному поручению удалены устаревшая категория и две самостоятельные
истории состава нод: их три story/data-модуля, единственный reexport,
два исключительно связанных с ними теста и ссылки в README/coverage.
Оставшиеся 12 обычных вариантов каталога совпадают с предыдущими declarations;
все их module/fixture/test пути разрешаются. Стандартный Dependencies,
его spec/deps.spec.ts и fixture сохранены, DIAGRAM-DEPENDENCIES проходит.

Финальный совместный gate runtime owner подтвердил отсутствие удалённых
категории и предмета в поиске Storybook и сохранение diagram. Обзор diagram →
«Зависимости» проверен: ready/presented, frame64, diagnostics/consoleErrors пусты.
Capture capture_GEc0Gl6OyGhHNK33JjWF3wGW фиксирует этот просмотр.
После live check и wait active ревизия проверки очистки @nodes/node:
cd0fe61a58465d8d78d16364, active=lastWorking, failed/built/candidate/activating=null,
diagnostics пусты, незавершённых MCP операций на этом этапе нет.

Этот gate подтверждает удаление старого каталога и сохранение стандартного
Dependencies. Последующее уточнение направления маркеров пользователь передал
отдельной runtime-задаче; её прежнее изображение не считается окончательно
принятой ориентацией. Правки runtime projection не входят в коммит очистки Nodes.

Platform code, общая UI theme, font assets/registry и внешний runtime
Storybook в коммитах этой задачи не изменялись. Чужое staged переименование
spec и прежние удаления тестовых файлов сохранены отдельно.
