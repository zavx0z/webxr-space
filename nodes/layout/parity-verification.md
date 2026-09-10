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

`storybook_check(live:false, scope:@nodes/layout)` собрал e7d7bbf320bd38f93ec009fc.
Exact search подтвердил physical directory algorithms/top-down и contour variant.
`storybook_open(algorithms/top-down/contour)` вернул ready/presented frame3;
inspect показал diagnostics/consoleErrors=[], nativePage hidden.
Это проверка candidate, не first-visible-frame evidence.

`storybook_check(live:true)` завершился TimeoutError. `storybook_wait(active)`
вернул failed activation: `The connection was closed.` Старый active
136b79ac39dc657bc30066c3 сохранён. Успешное опубликование не заявлено.

`storybook_check(live:false, scope:@webxr/markdown)` успешно собрал
ca62bcf70c3421031811444d. Exact open route
components/data/markdown/mermaid/flowchart завершился `The operation timed out.`
Одна read-only проверка ранее выданного handle вернула `Unknown Storybook view`.
Глобальный status с includeViews также завершался TimeoutError.

На этом новые open/live/ensure приостановлены по координации с Storybook owner.
Никакого browser/CDP/REST/reload обхода, runtime patch или подмены package нет.
Не выполнены: новый7-node interact/capture, сравнение итогового изображения,
успешный live apply и active wait для обоих packages. Для возобновления нужен
исправный lifecycle/transport MCP; после него — точные routes и кнопка
«Граф из обсуждения». Числовой результат не подменяет эти оставшиеся gates.
