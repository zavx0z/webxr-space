# Результат оптимизации прокрутки, 2026-09-06

## Что исправлено

- Renderer обрабатывает до восьми независимых transform-only изменений одной
  транзакции без повторного CSS/layout-прохода. Node pan меняет именно две
  трансформации: сетки и дерева. Смешанные и вложенные изменения сохраняют
  полный корректный путь, одиночные vector-path операции не потеряны.
- Добавление tooltip к projected display list остаётся ленивым. Оно больше
  не материализует все тысячи строк и фонов.
- WebGPU переиспользует неизменные immutable clip chains и их coordinate spaces.
  Mutable, inherited и accessor входы повторно проверяются. Снимки прошлых
  кадров не переписываются.
- Window preparation охватывает текст и scalar backgrounds, включая border AA
  и shadow fringe. Семантические nodes и retained geometry не удаляются.
- Coordinate queries обновляют только предков и нужный объект. Один plane hit
  больше не пересчитывает матрицы тысяч объектов соседнего HUD.
- Renderer один раз подготавливает матрицы композиции, пропуская скрытые
  поддеревья. Зависимости видимых объектов от скрытых clip spaces и bones
  синхронизируются отдельно; detached/manual matrix providers не переписываются.
- Убраны неиспользуемые normal-matrix inversions для scalar unlit shaders,
  повторная классификация render list и лишние instance slots вне batches.
- Immutable provenance передаётся только от настоящего Renderer. Caller frames
  не получают доверие через tooltip composition. Batch overlap проверяется по
  последним, а не первоначальным позициям.

Эксперимент с instancing clipped rectangles удалён: нативная картинка была
корректной, но живой X-scroll регрессировал. Его shader/gate changes и отдельные
экспериментальные tests не входят в итог. Существующее non-clipped batching
сохранено.

## Живой контроль

Ревизия `88231701b33b5e7e83ca493a`, тот же сценарий
`@zavx0z/nodes/layout/fixed/baseline/down`, Canvas 3840×2176, DPR 2.
Chrome 152, видимая страница. Без параллельной сборки во время измерения.
Inspector установлен; его запись временно отключена с восстановлением в finally.

По 4 прогрева + 30 измерений, WheelEvent через существующий Canvas input,
delta попеременно −16/+16, пауза 32 мс. HTML установлен около строки 399.
Это event → следующий RAF callback, **не аппаратный input-to-photon и не FPS**.

| Сценарий | Раньше, типичный event → RAF | Теперь median | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| HTML, Y | 500–580 мс | 46,7 мс | 53,2 мс | 53,5 мс |
| HTML, X | прежней сопоставимой серии нет | 48,8 мс | 52,7 мс | 54,9 мс |
| Ноды с открытыми Sources | 343–375 мс | 49,8 мс | 57,0 мс | 58,1 мс |
| Ноды без Sources | 156–184 мс | 41,6 мс | 54,5 мс | 56,6 мс |

Median самого обработчика: HTML 0,5–0,6 мс, ноды с Sources 10,6 мс.
Три серии по 34 события дали 102 новых представленных кадра приложения.
Стабильные 60 FPS не заявляются: это существенное устранение длинных задержек,
а не доказательство 16,7-мс бюджета всего кадра.

## GPU и визуальная граница

Нативный Canvas после исправления отображает реальные текст, grid, nodes и links;
в консоли диагностической вкладки Chrome DevTools error/warn отсутствуют. Она возвращена на
`layout/fixed/baseline/right`, Sources снова открыт. Storybook не останавливался.

Отдельный managed view Storybook остался на DOWN и сообщил два network 404 без
URL в записи. Его `ready/presented` истинны, `error` равен null; console-zero
для этого отдельного view не заявляется. Замеры выше относятся к проверенной
диагностической вкладке, а не к нему.

Автоматические GPU captures после исправления вновь вернули нулевые команды,
хотя приложение представляло новые кадры и Inspector наблюдал GPU-команды при
отдельном synchronous presentation. Эти captures отвергнуты; их fps, bound и
нулевые GPU timings не используются. Прежний непустой ручной baseline сохранён
в `before-manual.wgpuc`; его 8,258 мс относятся только к одному pass, а не ко всему
кадру. GPU-время после исправления остаётся непроверенным.

## Проверки и доставка

Generic regression coverage: clipping sharing/invalidation, mutable caller frames,
prototype/getter inputs, previous snapshots, X/Y windowing, hidden mutations,
multi-owner scrolling, matrix ancestry/reparent/reveal, hidden bones/clip spaces,
batch overlap, painter order, transform batches и lazy tooltip concatenation.

Длинные oracle tests имеют явный 30-секундный deadline: при параллельной проверке
всего monorepo прежний 5-секундный runner timeout давал ложные отказы. Assertions
и operation-count bounds не ослаблялись. При исходной приёмке `bun run check`
завершился успешно: typechecks всех пакетов, архитектурные и поведенческие тесты. Отдельно
проверено отсутствие ошибок и предупреждений в консоли живой вкладки.

Перед фиксацией изменений два повторных параллельных `bun run check` остановились
на 5-секундных timeout: `mixed text or inherited custom-property changes...`
и `a scrollbar batched next to a sibling...`. Изолированный transform-batch
прогон прошёл все четыре теста; медленный в общем прогоне mixed test занял
336 мс. Последовательный запуск всех 13 package scripts завершился успешно:
323 теста, без изменения assertions или timeout. Проверки типов и 43
архитектурных теста также прошли. Поэтому повторный общий параллельный gate
не считается стабильным зелёным; его runner contention остаётся отдельным
ограничением проверки, а не новым измерением browser performance.

По прямому поручению пользователя изменения фиксируются локальными коммитами:
Highlighter отдельно; в WebXR — fragments/Component, Renderer,
Engine/WebGPU/Browser, UI и benchmark evidence. Push/deploy не выполнялись.
Существующий untracked `template/tests/.compiler-contract-ApOHjJ/` не удалялся
и не добавлялся в Git; бинарный capture остаётся локальным ignored artifact.
