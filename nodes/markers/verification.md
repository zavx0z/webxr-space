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
Dependencies. После уточнения пользователя runtime-задача вернула исходную
иерархию: целевой DiagramNode находится сверху, составляющие — ниже. Координаты
нод и маршруты совпадают с исходным TopDown; изменён только конец размещения
наконечника: startArrow вместо endArrow. Центрирование и прокрутка сохранены.

Окончательная проверка runtime: два теста, 26 assertions и typecheck PASS.
Проверены исходные nodes/routes, направление начального маркера к компоненту,
центрирование на Display 900×650, доступность содержимого через прокрутку на
Display 180×80 и сохранение identity нод.

Исправленный candidate 549f450680fe363f74ba25d1 проверен до применения;
после обновления declaration применена @nodes/node 35283672516f80c750589c20.
Повторная проверка именно этой active revision: diagram → «Зависимости»,
ready/presented, frame5, diagnostics/consoleErrors пусты. Capture
capture_PFA8bDRRr0St_zlnNaUh5fNv совпал по SHA с исправленным candidate capture
capture_o3YzUlEodR7JvUc9TMrU_0kS. active=lastWorking,
failed/built/candidate/activating=null; незавершённых MCP операций нет.

На этапе проверки правки runtime/dependency-view.tsx и новый
runtime/dependency-view.test.ts сохранялись вместе с первоначальным блоком
структурных зависимостей. По последующему поручению пользователя закоммитить
все оставшиеся изменения этот блок полностью закреплён в Storybook: 5e73092.
Оставшиеся переносы fixture/spec в WebXR закреплены коммитом 3edcde1.
Перед фиксацией повторно прошли 25 тестов нод, 30 целевых тестов Storybook
и проверки типов обоих пакетов.

Platform code, общая UI theme, font assets/registry и внешний runtime
Storybook в коммитах компонентов Nodes не изменялись. Переносы spec/fixture
и удаления прежних тестовых файлов закреплены отдельным завершающим коммитом.
