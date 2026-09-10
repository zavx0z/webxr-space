# Проверка реализации TopDown

## Текущий результат

Числовая реализация и live-публикация проверены. Layout active:
`632061498367853997c4e418`. Markdown active:
`8c2860f0a14491925d3b9fc2`; `check(live:true)` и `wait(active)` завершились успешно.

В актуальном Markdown preview действительно показаны исходные 7 нод / 7 связей
и 7 заполненных стрелок. Correct preview capture:
`storybook://captures/capture_sclo10DkN-SM1_lM66nehsh-`,
SHA-256 `369cc78f11a1e40f102feb31e871e7393f04479a571d2308a7a615ac064d765c`,
ревизия `8c2860f0a14491925d3b9fc2`, 2304 × 2048,
capturedAt `2026-09-10T12:03:05.898Z`.

**Pixel-perfect пока не доказан.** После разрешённого чтения app подтверждены та же
версия26.903.61454/build8378 и все8savedhashes. Radius и палитра уже восстановлены
и реализованы для статического default dark conversation; подробные источники,
формулы и assumptions — [desktop-style-reference.md](desktop-style-reference.md).
Приложение/архив не изменялись, пользовательские runtime settings не читались.

## Оставшиеся границы после чтения app

| Область | Reference | Наша реализация / статус |
|---|---|---|
| Padding и font size | Neo16/12 вокруг label, font16px | Реализованы; label+32/+24 и height44 проверены |
| Radius | .5rem×1.25=10px в штатной поддерживаемой ветви CSS при root16 |10px, проверен у7Pane; неподдерживаемая ветвь8px и runtimeoverride отделены |
| Default dark fill/border | JSгенератор:rgba54/54/54/.96, white/.156 | Реализованы только Mermaid; общаяUItheme не менялась |
| Default conversation text/lines | White и70%white приdefault/bluechat theme | Реализованы; bareseed/opaque/customtheme варианты не выданы за actualruntime |
| System font | -apple-system/BlinkMacSystemFont/SegoeUI/sans-serif, fonts.ui=null | Запрашивается тот жеstack; текущийregistry имеетInterfallback, exactsystemfontfile/version отсутствуют |
| Label bbox/runtime overrides | Вычисляются во времяработы Codex | Не установлены чтением appassets; нужен runtimefont/контрольныйSVG иразрешённыйfontsource |
| Внешнийконтейнер | Codexwrapper и StorybookDisplay различны | Можно исключить единымcrop/translation/scale normalization; это неалгоритм |

Default исходники теперь доступны; недостаёт именно данных runtime override и
конкретного системного font face/version, а не определения--radius-md вообще.
OpenAI Sans изapp не подменяетsystemdefault и не копировался. Нового font shim,
платформенного font/render изменения или чтения/System/fonts не было.

## Последняя проверка default-оформления

Normal Markdown check25PASS+typecheck, related Node/GraphView8PASS. Regression
проверяет padding32/24, radius10 ичисловойRGBA рамки; targeted1PASS/95assertions.
На visible/focused странице послеsourceclick frame8 появилсяframe9 с7nodes,
7path и7path-fill ДОпоследующегоcapture. Все7радиусов=10, borderwhite/.156,
diagnostics/consoleErrors пусты. Результатзаписан в
[desktop-style-live.json](tests/references/desktop-style-live.json).
Scopedapply иwaitactive подтверждены для8c2860f0a14491925d3b9fc2.

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

На прежнем этапе геометрии71aa3 страница была hidden / hasFocus=false. Preview capture вызывает render, поэтому
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
