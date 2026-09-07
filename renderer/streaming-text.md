# Потоковый текст и удержание вычислений

Renderer сохраняет полный semantic DOM и всю историю текста. Потоковый вывод не
виртуализируется удалением невидимых строк. Range/Selection, копирование через
блоки, hit testing, scrollbar extents и scrollIntoView читают тот же Document
и точный RenderFrame.

## Договор удержания

- Изменение списка детей пересчитывает порядок и размеры родителя. Если
  действующие CSS selectors зависят только от элемента и его предков,
  неизменившиеся соседи сохраняют LayoutNode, intrinsic measurements и inline plan.
  Удаление начала истории и добавление в конец не требуют повторного измерения
  оставшихся строк. Reparent в другого предка, fieldset/first-legend, select и
  optgroup используют консервативную invalidation. Новые виды selectors не
  разрешаются для retention автоматически.
- Перенос subtree с focused, hovered или active target требует полной CSS
  invalidation проекции: descendant-sensitive псевдоклассы могут менять соседние
  ветви прежнего и нового предка. Pointer-state chain сверяется с текущим DOM,
  включая последующее снятие состояния. Обычная новая строка этого не вызывает.
- Существующий CSS parser не поддерживает nth-child и sibling combinators.
  Оптимизация не меняет эту границу и не заявляет их реализацию.
- Custom-property environment сохраняет identity только при том же inherited
  environment и неизменившихся собственных cascaded значениях. Изменение темы,
  метрик, inheritance и user-select создаёт новую зависимость.
- Межкадровые measurement/inline caches принадлежат конкретному LayoutNode;
  число размерных вариантов ограничено восемью. Старые варианты освобождаются
  вместе с узлом. In-place transform/text/control fast paths сбрасывают эти
  caches перед последующим структурным расчётом.
- Статические блоки обычного и оформленного inline-текста удерживают immutable
  paint/hit/box records. Условия reuse включают размеры, transforms, rounded
  clip chain и fixed boundaries. Изменение только координат переносит производные
  records без повторной раскладки текста. Контролы, вложенные scrolling/fixed
  descendants и неподходящая геометрия проходят штатную раскладку.
- Один большой подходящий text scrollport может применить уже существующую
  lazy scroll projection после структурной сборки. Остальные, вложенные активные
  scrollports и открытые popover/select overlays сохраняют eager fallback.
  Неудачная специализация возвращается к полной сборке, а не скрывает ошибку
  либо изменяет semantic scroll state.
- Для head-trim/append статических текстовых блоков полный Frame составляется из
  immutable retained ranges. Сдвинутые box/paint/hit records материализуются при
  чтении, а Node lookup использует persistent identity map. Поэтому сохранение
  5000 строк не требует заранее создавать заново десятки тысяч записей кадра.
  Старый Frame удерживает собственные map/placements даже после удаления узлов
  из текущего Document. Array/Map API остаётся полным и упорядоченным.
  Перестановка середины списка, stacking через границу диапазона, вложенный
  активный scroll и принадлежащие этой проекции overlays используют полный путь.
  Picker в другой проекции не отключает локальное удержание.
- Список открытых popovers — производный projection-local индекс из существующих
  mutation/state subscriptions Renderer. Потоковая строка не сканирует заново
  весь Document в поисках меню. Индекс сохраняет прежний DOM-порядок и очищается
  при disposal.

Общие кадры, массивы и индексы RenderFrame пока могут требовать прохода по
удерживаемой истории. Это не обещание O(visible) для всего pipeline, GPU или
постоянных 60 fps. Гарантия этого среза — ограниченное изменёнными строками
повторное измерение/раскладка текста, сохранение records и отсутствие полного
DOM-поиска popovers на каждом append.

Большие readonly ranges могут использовать защищённый array reader вместо
Object.freeze большого обычного массива. Публичная неизменность сохраняется:
запись, удаление и изменение descriptors/prototype запрещены; backing storage
не предоставляется потребителю. Сам факт readonly transport не разрешает
обходить проверку Renderer provenance на границе GPU.

## Доказательства

`tests/streaming-text.test.ts` сопоставляет incremental и fresh layouts, включая
rich-text append, изменение последней строки, inert keyed markers, bounded
history, prepend/reorder/remove/reparent, wrapping/flex, resize, обе оси scroll,
inherited CSS и selection. Для 1000 строк append/head-trim измеряет менее 50
текстовых фрагментов, сохраняя старые frame snapshots и полный направленный Range.

Deferred projection отдельно сравнивается с eager static-layout-equivalent
сценарием. `tests/popover-index.test.ts` проверяет membership, DOM-порядок,
перенос между проекциями, скрытие/удаление и отсутствие повторного обхода
1000 неизменившихся строк.

`tests/stream-ranges.test.ts` проверяет ленивую сборку 5000 ranges и отсутствие
цепочки readers после 2000 head-trims. `tests/persistent-object-map.test.ts`
проверяет 50000 object keys и независимость исторических snapshots.
Проверки streaming дополнительно фиксируют bounded materialization counters:
после append и head-trim старые records не читаются только ради сборки нового Frame.

GPU consumer структурных splices не включён этим текстом автоматически:
существующий Backend может выполнять полную подготовку при изменении membership.
Его отдельный provenance/range контракт требует собственного owner-среза и
проверок, прежде чем заявлять ограниченную видимым окном стоимость всего pipeline.
