# Проверка реализации TopDown

## Текущий результат

Числовая реализация и live-публикация проверены. Layout active:
`632061498367853997c4e418`. Markdown active:
`71aa3fcaefa7d518ae083b5d`; `check(live:true)` и `wait(active)` завершились успешно.

В актуальном Markdown preview действительно показаны исходные 7 нод / 7 связей
и 7 заполненных стрелок. Correct preview capture:
`storybook://captures/capture_f5MdZEivM4MeBt4nDGEy7KjT`,
SHA-256 `a79dc8205d9e2bb05a1261b3df2fef47208cc3bf53e3a4f20ab41c278faddcb2`,
ревизия `71aa3fcaefa7d518ae083b5d`, 2304 × 2048,
capturedAt `2026-09-10T11:11:37.607Z`.

**Это не pixel-perfect совпадение с Codex Desktop.** Сопоставление с исходным
снимком подтверждает те же уровни и порядок, размещение общей зависимости Pane,
свободные контурные endpoints и форму направленных rounded routes. Остаются
видимые различия шрифтовых метрик, темы/фона, радиуса рамок и размещения графа
в контейнере. Полного Desktop font/theme/scale snapshot нет, сравнение пикселей
при одинаковых входных условиях не выполнено. Наши компоненты и публичная тема
сохранены; данные source graph не заменены готовым SVG или ручными координатами.

## Что именно ещё отличается от исходного изображения

| Область | Reference и источник | Наша реализация | Влияние и недостающие данные |
|---|---|---|---|
| Отступы ноды | Neo rect 16 px по X / 12 px по Y; shape handler729–731 | 15/11 CSS padding +border1, итог label+32/+24 | Геометрия ноды; известное значение выполнено и проверено |
| Размер шрифта | Base theme16px, chunk-WYO...:906 |16px | Известное значение выполнено |
| Гарнитура и label bbox | Desktop читает computed fontFamily из --font-sans, mermaid-diagram:250–254 | CSS sans-serif; live ContentNode label100.7578125×20 | Меняет размеры самих нод и placement. Нет exact computed family, fontsource/version и SVG label bbox |
| Радиус рамки | Desktop CSS rx/ry=var(--radius-md), mermaid-diagram:39–42; export копирует computed value:205–206 | Pane4px | Локальный рисунок ноды. Числовое значение --radius-md отсутствует; theme.radius из Mermaid не заменяет Desktop override |
| Цвета нод, текста, рёбер | Desktop вычисляет --color-background-elevated-primary / --color-border-primary-outline / --color-text / --color-codex-description, mermaid-diagram:243–254 | Публичные widget-box роли UI и currentColor fallback | Локальное оформление; resolved RGB/alpha того Desktop отсутствуют |
| Линии и маркеры | Angular radius5, point inset4, neo/desktop gaps и marker refX | Реализованы отдельно от портов/типографики | Геометрия диаграммы; numeric/capture evidence приведены ниже |
| Внешняя рамка и центрирование | Desktop wrapper mx-auto / px-4 / py-3, mermaid-diagram:278 | Storybook Display и toolbar, иное свободное место | Внешний контейнер, не алгоритм. Для сравнения можно исключить его единым crop/translation/scale normalization |

В сохранённом dataset нет app CSS assets с определениями этих переменных и нет
файлов шрифтов. Нужен экспортированный SVG именно Desktop26.903.61454/build8378:
экспорт сохраняет computed radius, embedded theme/fontFamily, rects, paths и
viewBox. Для эквивалентных glyph metrics дополнительно нужен указанный им точный
font source/version. Другой путь — разрешённое адресное чтение CSS/fonts
соответствующего Desktop archive; текущую установку нельзя молча объявить версией
8378. Для строгого pixel comparison нужны также DPR/scale исходного screenshot
либо SVG как контроль координат. Значения не подобраны по внешнему сходству,
общая тема всей UI и platform font/render code в этой задаче не изменялись.

## Live geometry и identity

После фактического CSS-измерения ноды имеют высоту 44 px. Их координаты относительно
GraphScene и реальные размеры сохранены в [live-markdown.json](tests/references/live-markdown.json).
Эти размеры отдельно переданы независимому dagre-d3-es 7.0.14:
**max x/y delta = 5.000003966415534e-8 px**, что меньше допуска 1e-6.
Воспроизводимый offline numeric comparator:
[compare-live.ts](tests/references/compare-live.ts). Он не обращается к браузеру;
MCP observation не выдаётся за Desktop golden image.

| Node | x | y | width | height |
|---|---:|---:|---:|---:|
| ContentNode | 218.1875 | 8 | 132.7578125 | 44 |
| ContentSurface | 8 | 102 | 151.109375 | 44 |
| ParameterNode | 209.109375 | 102 | 150.9140625 | 44 |
| Pane | 444.2382813 | 196 | 69.984375 | 44 |
| ParameterNodeContents | 174.8945313 | 196 | 219.34375 | 44 |
| DiagramNode | 548.1054688 | 102 | 136.015625 | 44 |
| Typography | 564.2226563 | 196 | 123.78125 | 44 |

MCP display inspection вернул 7 записей `path` и 7 `path-fill`. В изображении
видны заполненные triangle markers. Диагностика и consoleErrors пусты.
Live selection ContentNode изменила selected на true и сохранила все 21 opaque
Element ID: 7 нод, 7 линий, 7 стрелок. Доказательство:
[live-identity.json](tests/references/live-identity.json), frame 17.
Сохранение identity при обновлении source LR → TD дополнительно проверено
интеграционным тестом, а не приписано live selection-сценарию.

Страница была hidden / hasFocus=false. Preview capture вызывает render, поэтому
этот снимок доказывает результат GPU-рисования, но не автономный первый visible
frame. Последний проверялся Browser pre-paint тестами отдельно.

## Найденная при visual gate правка

У первоначального consumer CSS `padding-inline/block: var(...)` фактически
оставался Pane padding 8 px. В live это давало высоту 38 вместо 44 и прибавку
18 px к ширине подписи вместо 32. Тот же результат воспроизведён в отдельном
прогоне 7-node integration test с настоящей публичной UI theme.

DiagramNode теперь задаёт те же отступы четырьмя обычными CSS padding-свойствами.
Ни parser, ни stylesheet scanner, ни платформенный owner не менялись.
Новый regression проверяет node bbox − label bbox = 32 / 24 с учётом границы.
До исправления он падал (18 вместо 32), после исправления проходит; live размеры
подтверждают результат. Без caller variables default padding остаётся прежним.

После этой локальной правки:
- обычный Markdown check: 25 pass, typecheck PASS, 314 assertions;
- связанные Node composition / GraphView measured tests: 8 pass;
- Layout typecheck для сохранённого numeric comparator: PASS.

## Исходные числовые и функциональные gates

До последней CSS-правки прошли обычные owner checks с действовавшим тогда preload:
Layout 36, Nodes 49, Markdown 25, Node 25 — все PASS, все четыре typecheck PASS.
Это 135 тестов исходного среза, а не утверждение повторного выполнения всех 135
после каждого изменения или текущей чужой работы в workspace.

Десять независимых upstream fixtures покрывают разные widths/heights/fractions,
diamond, long edge, disconnected, multiedges, degree 12, numeric IDs и иной
порядок edges. Совпадают node rectangles, ordered raw guide points и bounds
с допуском 1e-6. Повторный расчёт и Worker/direct равны, исходный input не мутируется.
Семь старых port results сравниваются целиком byte-exact JSON.

Проверены ellipse/circle equations, боковой rectangle intersection, квадрат
circle после intrinsic bootstrap, reference rounding 90°, cubic extrema,
analytic parabola arc length и раздельные marker tips / stroke gaps.
Модель @nodes/tree, same-Document identity и lifecycle GraphView сохранены.

В `03ede49` изменены только временные пределы двух compiled-story tests без
изменения assertions: Markdown selection 5 → 30 s; один Nodes case с шестью
stories 30 → 60 s. Первоначально normalcheck давал timeout, не correctness failure.
С запасом времени selection прошёл в той же parallel группе за 6.52 s; следующий
normalcheck — 7.77 s, финальный с новым preload — 4.79 s. Nodes normalcheck сначала
дал 48 pass / 1 timeout 30.1 s; финальный — 49 pass, тот же case 24.15 s.
Быстрые standalone tests не выданы за исправный normal script.

## История восстановления Storybook

Первоначальные Layout activation `The connection was closed`, Markdown open
timeout и исчезновение healthy view handles переданы Storybook owner. Его
отдельные исправления: `3d1b0f6` (atomic/scoped inventory), `cddb325`
(dispatch boundary), `c9dae9a` (адресная diagnostics), `b549ae3` (verified baseline
peer reuse без подмены receipt). Последний coordinated ensure дал daemon
`840937bf-8c03-4bc1-b341-87f3b8c03947`.

Историческая unknown creation reservation не удалялась и не объявлялась
подтверждённым receipt. Exact Markdown open после b549ae3 вернул reused=true,
ready/presented, view `storybook-view-v1_J7u8kLThw1a0FgPqgnol_mkdZ8vmKe33cR_Sk98vELI`.
Старый загруженный MCP status client оставался отдельной cache boundary:
status использовался без views, а scoped check — через новый daemon.

Ранний click до стабилизации presented geometry не сменил source. Enter не
использован как доказательство click handler: native button key activation —
отдельная известная граница. После capture/повторного чтения актуального target
один reassessed click сменил source на нужные семь нод. На окончательной ревизии
capture → fresh button bounds → один click воспроизвели тот же переход.

`area:node` crop для GraphScene захватил часть Workbench и обрезал нижние ноды
(capture_OT0GrqtZtLXih2-DUnd9LMeu). Он исключён из reference evidence; корректным
является приведённый выше `area:preview`. Приватного browser/CDP/REST, ручного
reload, внешнего screenshot cropping или изменения runtime в этой задаче нет.

Заливку предоставил отдельный platform owner (`c6bce78`, `fe5998d`). В TopDown
срезе не изменялись DOM/Renderer/WebGPU, root preload, headless или их зависимости.
Оставшийся рубеж для буквального совпадения изображения — одинаковые reference
font/theme/container/scale и отдельная пиксельная приёмка, а не незавершённая
публикация Markdown или отсутствие заполненных стрелок.
