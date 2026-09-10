# Проверка реализации TopDown

Проверено10сентября2026 в каноническом WebXR checkout. Заливка предоставлена
отдельным platform owner: c6bce78 и структурный перенос fe5998d. Ни Renderer,
ни DOM/WebGPU, ни root preload/headless в TopDown-срезе не изменялись.

## Обычные проверки

- `bun run --cwd nodes/layout check`:36pass, typecheckPASS.
- `bun run --cwd nodes check`:49pass, typecheckPASS, включая Browser pre-paint,
  borrowed Document, async generations и сохранение Node/Socket/Link.
- `bun run --cwd markdown check`:25pass, typecheckPASS после восстановления
  пользовательского preload. Все6Mermaid tests прошли.
- `bun run --cwd nodes/node check`:25pass, typecheckPASS, включая существующие
  реальные headless PNG/shape/props scenarios владельца DiagramNode.

Изменены только временные пределы двух compiled-story tests, без изменения их
assertions: Markdown selection5→30s и один Nodes test на6stories30→60s.
Первоначальные normalchecks завершались timeout, а не correctness failure.
Вся параллельная группа Markdown с запасом времени прошла selection за6.52s,
затем обычный check зафиксировал7.77s; финальный запуск с новым preload —4.79s.
Первый normal Nodes check дал48pass/1timeout30.1s, финальный normalcheck —49pass,
тот же case24.15s. Эти результаты не выданы за benchmark и не заменены отдельными
быстрыми standalone tests.

## Числовые и интеграционные gates

Десять independent upstream fixtures: одинаковые/разные widths, asymmetric
heights/fractions, diamond, long edge, disconnected, multiedges, degree12,
numeric IDs, иной edge order. Совпадают node rectangles, ordered raw guide
points и bounds с допуском1e−6. Повторный расчёт и Worker/direct равны.
Семь старых port results сравниваются целиком byte-exact JSON.

Ellipse/circle equations, боковой rectangle intersection, квадрат circle,
угол90° reference-rounded, точные cubic extrema, analytic parabola arc length
и отдельные marker tips проходят проверки. В measured7-node сценарии actual
CSS dimensions передаются независимому dagre-d3-es7.0.14 oracle; реальные x/y
элементов совпадают. Реальные filled marker Elements дают paint и сохраняют
identity вместе с Link/Node при переходе LR→TD. Circle bootstrap не требует
ручных размеров: фактический CSS ellipse становится square до принятой сцены.

Это upstream numeric evidence, не полный replay Codex Desktop и не доказательство
pixel-perfect. Source/provenance находятся в tests/references; synthetic размеры
не объявляются измерениями исторического screenshot.

## Storybook MCP

Первоначально candidate Layout e7d7bbf320bd38f93ec009fc открылся ready/presented,
но activation завершилась `The connection was closed.` У Markdown ca62bcf...
open завершился timeout, прежний view handle стал unknown. Storybook owner
подтвердил и исправил atomic/scoped inventory bug отдельным commit3d1b0f6.

После одного coordinated ensure сервер получил instance
4b44889f-4b99-48e5-bd1d-a5875dd96acf. Старый загруженный MCP client сохраняет
прежний status(includeViews:true), поэтому даже scope Layout вернул ошибку
про @renderer/html. Повторных ensure/globalinventory loops не выполнялось.
Owner source triage показал, что check(scope,live) передаёт scope новому daemon
корректно; дальнейший status использовал includeViews:false.

**Layout live gate закрыт.** Candidate632061498367853997c4e418:
- exact open algorithms/top-down/contour:reused=true, ready/presented, frame3;
- inspect:diagnostics=[], consoleErrors=[], nativePage hidden;
- один check(live:true):success, applied=true;
- wait(active):success, currentRevision632061498367853997c4e418.

Physical binding подтверждён search: directory algorithms/top-down → subject
TopDown → contour variant. Это готовность опубликованной числовой истории;
скрытая страница и capture не выдаются за first-visible-frame evidence.

**Markdown visual gate остаётся заблокирован.** На том же сервере scoped
nonlivecheck успешно собрал b2dc04da17f7bf51e05a0787 без diagnostics.
Единственный exact open components/data/markdown/mermaid/flowchart вернул:
`Storybook package target creation is indeterminate: @webxr/markdown`.
ViewId и подтверждения создания tool не выдал. Повторное создание вслепую
не выполнялось. Ошибка передана координатору и Storybook owner; отдельный
reservation gap был найден ими до этой попытки, но единственная live причина
не объявлена доказанной без дополнительного owner evidence.

Не выполнены: новый7-node interact/capture, сравнение итогового изображения,
успешный live apply и active wait именно Markdown. После исправления target
lifecycle требуется этот exactroute и кнопка «Граф из обсуждения».
Числовой результат и успешный Layout active не подменяют эти оставшиеся gates.
Никаких browser/CDP/REST/reload обходов или Storybook/Renderer edits в TopDown
задаче нет. Изменения источников под transport error не вносились.

## Проверка после dispatch-boundary fix

Storybook owner исправил преждевременный createSent в cddb325;72tests/typecheck
прошли у владельца. По координации выполнен ровно один ensure нового daemon:
instance6e50b153-8f73-4a01-a283-b9d195823bd3. Status только withoutviews.
Layout сохранил active632061498367853997c4e418.

Markdown nonlivecheck:success, candidate1c933443676f4328f3ec5484, diagnostics[].
Единственный безопасный exactopen того же flowchart route снова вернул
`Storybook package target creation is indeterminate: @webxr/markdown`.
Новый viewId/receipt не получен; active остался прежним e3acd03ff57508427a1c5fa8.
После этого gate остановлен без retrycreate, новогоensure или измененияunknownstate.

Это не доказательство неработоспособности dispatch fix: он намеренно не очищает
исторические createSent:true/unknown reservations. По одному guard response нельзя
утверждать, что прежний запрос действительно отправлялся либо что target отсутствует.

Безопасный следующий шаг — адресный read-only аудит этой reservation у Storybook
owner: сопоставить её ожидаемую identity/URL и сохранённые send/receipt evidence
с авторитетной inventory соответствующих targets. Если найдётся прежний target
или late receipt, использовать штатную reconciliation и продолжить exactroute.
При отсутствии доказательств не удалять unknown запись и не создавать второй
потенциальный target. При необходимости расширить именно owner diagnostics,
сохранив неизвестный исход, а не обходить guard в потребителе.

Итоговая визуальная цель остаётся незавершённой:7-node interact/capture,
сопоставление с исходным Desktop screenshot и Markdown live/active ещё не приняты.
