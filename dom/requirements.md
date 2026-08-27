# Требования production DOM Components и private stories

## `UI-DOM-ICONS-001` — document image assets

Exact public leaf `@ui/components/icons` owns immutable SVG data URLs used by
standard `HTMLImageElement.src`. It has no Engine, Layout, Elements, renderer
or WebGPU dependency and exposes no drawing callback. A consumer creates
`img`, assigns one `uiIcons` URL and lets CSS plus the document renderer own
geometry and presentation.

## `UI-DOM-SYNTAX-THEME-001` — source-backed theme owner

Exact public leaf `@ui/components/syntax-theme` owns the Islands Dark JSON and
a pure TextMate-scope foreground resolver. It has no Engine, Layout, Elements,
renderer or WebGPU dependency. Highlighter remains theme-neutral; Interpreter
and CodeEditor consumers pass the resolved hex foreground into their own DOM
text presentation. Exact scope rules win before bounded parent-scope matching,
then the explicit fallback and `editor.foreground` are used.

## `UI-DOM-INSPECTOR-001` — стандартное DOM-дерево

`@ui/components/inspector` создаёт один устойчивый `HTMLElement` через
`createInspector(document, props)`. Его public authoring boundary состоит
только из `@zavx0z/dom` `Document`, `Node`, `HTMLElement`, стандартных HTML
имен элементов, атрибутов и событий. Leaf не импортирует `UiSurface`, Engine,
Layout, Elements, Renderer либо WebGPU и не принимает координаты.

Структура сохраняет semantic owners:

```text
aside.inspector
├─ header.toolbar
│  └─ input[type=search]
└─ div.body
   ├─ nav.rail
   │  └─ button.category*
   └─ main.content
      ├─ div.context
      └─ div.sections
         └─ section*
            ├─ button.section-header
            └─ div.section-content
```

## `UI-DOM-INSPECTOR-002` — controlled state и события

`selectedCategoryId`, `query` и `section.expanded` принадлежат consumer.
`update(nextProps)` меняет standard attributes и text без замены root,
структурных region nodes и keyed category/section nodes. Category button
публикует `title` и `aria-pressed`, disclosure button — `title` и
`aria-expanded`; disabled state использует boolean `disabled` attribute.

Category, section и search callbacks подключаются через `addEventListener`.
Callback сообщает намерение, но не меняет controlled state сам. Duplicate,
empty и dangling identities отклоняются до изменения существующего tree.

## `UI-DOM-INSPECTOR-003` — executable CSS

Leaf экспортирует одну обычную CSS string без nested syntax и runtime style
merge. Она является непосредственным stylesheet input для
`@zavx0z/renderer`: Flex, размеры, цвета, padding, overflow и attribute-state
selectors разрешаются renderer pipeline, а Component не вычисляет boxes,
scroll offsets или GPU geometry.

Default contour сохраняет Inspector metrics: outer radius `6px`, toolbar и
rail `30px`, category и section header `28px`/`26px`, rail/content
`rgb(29 29 29)`/`rgb(48 48 48)`, rail inset `8px`, group gap `8px`, sections
padding `7px` и content padding `6px`.

## `UI-DOM-INSPECTOR-004` — native-like search input

Search ref имеет exact `HTMLInputElement`. Fixed search type и optional
placeholder задаются reflected properties `type`/`placeholder`, controlled
query — live property `value`, а `input` listener читает новое значение из
того же `value`. Attribute `value` остаётся `defaultValue` и не используется
как live input state. Leaf не объявляет собственный input class, buffer или
event API.

## `UI-DOM-INSPECTOR-005` — lifecycle

Controller публикует stable element, typed refs, `update` и `dispose`.
Persistent IDs сохраняют node identity при reorder и state updates. Removed
IDs удаляются из tree/maps и теряют owned listeners. `dispose` снимает все
owned listeners, но не удаляет root из consumer-owned parent.

## `UI-DOM-INSPECTOR-006` — bounded DOM story

Private `inspector-story.ts` является самостоятельным Storybook dev module,
а не compatibility adapter к действующему retained Storybook contract. Он
создаёт ровно один Inspector controller, публикует тот же standard DOM element
и обновляет controller по immutable story args без замены element/region/keyed
node identities.

Category click, search input и disclosure click проходят через DOM listeners.
После такого interaction leaf обновляет собственные args/controller и
dispatch-ит bubbling `CustomEvent` с новым control key/value и полным args
snapshot; глобальные bridges и Surface events запрещены. Внешний control owner
может передать новый полный snapshot через `update(args)` без второго state
store.

`source.html` каждый раз сериализуется из фактического Inspector DOM tree,
`source.css` является exact `inspectorCss`, а `source.typescript` строится из
текущего args snapshot и exact public import. Leaf не читает и не копирует
старые `storybook/source.ts`, story registry либо shared story types. До
появления общего DOM Storybook contract он не объявляет route, controls schema,
preview surface или compatibility wrapper.

## `UI-DOM-BUTTON-STORY-001` — native button proof

Private `button-story.ts` является Storybook-only proof того,
что primitive Button не требует production factory. Leaf создаёт ровно один
stable `HTMLButtonElement` через `document.createElement("button")` и один
stable Text node. Args `label`, `variant`, `disabled` и `title` обновляют
только `className`, `disabled`, `title` и `Text.data`; параллельный component
state или wrapper element запрещён.

Default label/title равны `Output`, чтобы generic `HTMLElement.title` route
проверял исходный механизм advisory tooltip. Click остаётся обычным bubbling
DOM event и не проходит через Surface callback или story bridge.

`source.html` сериализуется из live button, `source.css` является exact flat
`buttonStoryCss`, а `source.typescript` содержит executable standard DOM code
с текущими args. Leaf не импортирует production Button, Engine, Layout,
Elements, renderer либо старый/shared Storybook contract.

## `UI-DOM-TEXT-FIELD-STORY-001` — native input proof

Private `text-field-story.ts` является Storybook-only proof
primitive TextField без production factory. Leaf создаёт ровно один stable
`HTMLInputElement` через `document.createElement("input")`. Args `value`,
`placeholder`, `disabled`, `readOnly`, `type: "text" | "search"` и `title`
обновляют соответствующие native-like live/reflected properties без wrapper,
parallel buffer или Surface input owner.

Native `input` event остаётся bubbling DOM event. Изменённый пользователем
`input.value` является live DOM state; immutable story args меняются только
через явный owner `update(args)` и затем снова синхронизируют property.

`source.html` сериализует только фактические attributes. Он не добавляет
ложный `value` attribute для live property: такой attribute отражает только
`defaultValue`, если действительно присутствует. Текущее live значение
показывается как `input.value = ...` в executable `source.typescript`.
`source.css` является exact flat `textFieldStoryCss`. Leaf не импортирует
production TextField, Engine, Layout, Elements, renderer либо старый/shared
Storybook contract.

## `UI-DOM-FOUNDATION-STORIES-001` — native foundation proofs

Private `foundation-stories.ts` содержит только Storybook proofs
для Pane, Badge, Typography и Divider. Они создают стандартные элементы
напрямую: Pane — `div`, Badge/Typography — отдельные `span`, Divider — `hr`.
Pane, Badge и Typography владеют ровно одним stable Text node; Divider не
создаёт запрещённого child для void element. Updates сохраняют element/Text
identity и меняют только class, title и `Text.data`.

Default Pane покрывает `filled`, Badge — `basic`; Typography поддерживает
`title | subtitle | body | caption`, Divider — `full-width | inset | middle`.
Геометрия и material states находятся только в flat executable
`foundationStoriesCss`, включая px margins/widths Divider, поддерживаемые
текущим document renderer.

Каждый source HTML сериализуется из live element, CSS является exact общей
string, TypeScript показывает прямой `document.createElement`/Text authoring.
Leaf не объявляет production Pane/Badge/Typography/Divider factories и не
импортирует Engine, Layout, Elements, renderer либо старый/shared Storybook.

## `UI-DOM-NATIVE-CONTROL-STORIES-001` — native input controls

Private `native-control-stories.ts` содержит Storybook-only
proofs NumberInput, Checkbox и Switcher на одном standard element каждый.
NumberInput — `HTMLInputElement[type=number]` с live `value`, `disabled`,
`readOnly`, `title`; Checkbox — `type=checkbox` с live `checked`, `disabled`,
`title`; Switcher — тот же checkbox с `role="switch"` и `aria-checked`, всегда
зеркалящим live `checked` после owner update и native `change`.

Все updates сохраняют input identity и меняют только native-like properties и
required reflected attributes. Property updates сами не dispatch-ят
`input`/`change`: story не фабрикует события. Standard user-agent/host events
остаются обычными bubbling events; Switcher change listener синхронизирует
ARIA и не останавливает propagation.

Live HTML source содержит только фактические attributes и не подделывает
`value`/`checked` attributes для одноимённых live properties. TypeScript source
строится из текущего live element state и показывает прямой
`document.createElement("input")` authoring. CSS является exact flat
`nativeControlStoriesCss` и использует поддержанные input value/checked
indicator rules. Production factories, Engine, Layout, Elements, renderer и
старый/shared Storybook imports запрещены.

## `UI-DOM-FIELD-STORIES-001` — semantic Field и keyed ControlGroup

Private `field-stories.ts` содержит Storybook-only DOM proofs
Field и ControlGroup. Field создаёт stable `div` с generic standard `label`,
вложенным `span` Text и одним `HTMLInputElement`. Control получает один
generated stable `id`; label публикует raw standard `for` attribute с тем же
значением, а input дополнительно ссылается на stable label id через
`aria-labelledby`.

ControlGroup создаёт stable root `div` и keyed row `div` subtrees с тем же
label/span/input contract. Persistent row key сохраняет row, label, Text,
input и generated IDs при reorder. Duplicate/empty keys отклоняются до tree
mutation; removed rows удаляются из tree и typed maps.

Text/number values, disabled и readOnly синхронизируются native-like input
properties. `input` events не фабрикуются story code и остаются bubbling;
изменённый live value не переписывает immutable owner args до явного update.
Number value проходит стандартную HTMLInputElement sanitation.

Live HTML source сериализуется из фактического tree без fake value attributes,
CSS является exact flat `fieldStoriesCss`, TypeScript показывает прямое
`document.createElement` authoring с текущими live input values. Production
Field/ControlGroup factories, Engine, Layout, Elements, renderer и
старый/shared Storybook imports запрещены.

## `UI-DOM-ADVANCED-NATIVE-CONTROL-STORIES-001` — range и progress checkbox

Private `advanced-native-control-stories.ts` содержит
Storybook-only SliderControl и ProgressCheckbox proofs. SliderControl — один
stable `HTMLInputElement[type=range]`: owner args задают finite `min`, `max`,
positive `step`, `value`, `disabled`, `title`; live value читается и пишется
через `valueAsNumber`, а итоговый args snapshot отражает DOM clamping/step
rounding.

ProgressCheckbox — один stable `HTMLInputElement[type=checkbox]` с live
`checked`, non-reflected `indeterminate`, `disabled`, `title`. Reflected
`aria-checked` всегда равен `mixed` при indeterminate, иначе `true`/`false`, и
синхронизируется owner update и native `change` listener без остановки event.

Story updates не dispatch-ят `input`/`change`; standard host events остаются
bubbling. Live HTML source содержит только реальные min/max/step/type/ARIA/
boolean attributes, но не fake value/checked/indeterminate attributes.
TypeScript source использует direct `document.createElement("input")`,
`valueAsNumber`, `checked` и `indeterminate`; CSS является exact flat
`advancedNativeControlStoriesCss`, совместимой с renderer track/thumb и
checkbox indicator projection. Production factories и retained/Storybook
imports запрещены.

## `UI-DOM-GAUGE-STORIES-001` — native progress и meter

Private `gauge-stories.ts` содержит Storybook-only proofs на
одном stable `HTMLProgressElement` и одном stable `HTMLMeterElement`.
Progress args задают finite max и determinate value либо `null` для настоящего
indeterminate state без value attribute. Meter args задают finite
min/max/low/high/optimum/value.

Stories пишут standard properties, читают normalized DOM getters и
канонизируют reflected numeric attributes обратно к тем же значениям. Поэтому
args, live HTML source и renderer track/value projection имеют один DOM owner,
включая progress clamping/position и согласованные meter thresholds.

Live source сериализует реальные progress/meter attributes и direct
`document.createElement("progress" | "meter")` TypeScript. CSS является exact
flat `gaugeStoriesCss`, совместимой с renderer `track`/`value` fragments.
Production factories, Engine, Layout, Elements, renderer и старый/shared
Storybook imports запрещены.

## `UI-DOM-RESOURCE-INPUT-STORIES-001` — reference, path и collection

Private `resource-input-stories.ts` содержит Storybook-only
proofs ReferenceInput, PathInput и CollectionInput. ReferenceInput — один
stable collapsed `HTMLSelectElement` с keyed `HTMLOptionElement` children и
live `select.value`. PathInput — stable `div` с standard label/span,
`input[type=text]` и button; generated stable input id связан raw `for` и
`aria-labelledby`.

CollectionInput — stable root `div`, `ul[role=listbox]`, keyed
`li[role=option]` с `aria-selected`, и stable Add/Remove buttons. Persistent
item key сохраняет li/Text identity при reorder; duplicate/empty keys и
dangling selected key отклоняются до tree mutation. Removed items удаляются из
tree/maps.

PathInput и CollectionInput принимают standard owner density
`regular | compact`, меняющую только CSS class/geometry при сохранении exact
DOM identities. Collection `readOnly` отражается как `aria-readonly=true` на
listbox и блокирует Add/Remove buttons, не подделывая item disabled state.

Live select/input properties и disabled/readOnly/button states принадлежат DOM.
Story updates не фабрикуют events; standard `input`/`change`/`click` остаются
bubbling. HTML source сериализует фактический semantic tree без fake live value
attributes, TypeScript показывает direct createElement authoring и live
property assignments, CSS является exact flat `resourceInputStoriesCss`.
Production factories и Engine/Layout/Elements/renderer/Storybook imports
запрещены.

## `UI-DOM-HUD-STORIES-001` — Window, Frame и Timeline

Private `hud-stories.ts` содержит independent Storybook-only
proofs для действующих HUD Window, Frame и Timeline routes. Owner находится в
Components contour, потому что финальная архитектура не сохраняет
`@ui/hud` отдельным public layer. Retained HUD package удалён после cutover
production consumers; route vocabulary не создаёт отдельного package owner.

Window и Frame используют standard `section`/`header`/`nav`/`button`/content
tree. Keyed actions/handles сохраняют button identity при reorder. Timeline
использует `section`, header current `time`, transport `nav`/buttons и keyed
`ul`/`li` tracks с keyed marker `time` nodes. Persistent keys сохраняют exact
track/marker identities; duplicate/empty keys и invalid time range отклоняются
до mutation.

Story code не вычисляет sibling coordinates или frame rectangles: все sizes,
flow, grouping, states и docking presentation находятся в exact flat
`hudStoriesCss`. Standard click/pointer events остаются bubbling и не
фабрикуются updates. Live HTML/TypeScript source выводится из фактического DOM
и direct createElement authoring. Старые HUD factories, Engine, Layout,
Elements, renderer и Storybook imports запрещены.

## `UI-DOM-HUD-001` — production HudWindow, HudFrame и Timeline

Exact public `@ui/components/hud` указывает напрямую на
`packages/components/hud.ts`, который является final production
owner после удаления `@ui/hud`. Он экспортирует
`createHudWindow`, `createHudFrame` и `createTimeline`; каждый factory
возвращает один stable standard `HTMLElement`, typed refs, controlled snapshot
и `update`/`dispose`. Leaf не является alias и не импортирует private
`hud-stories.ts`.

HudWindow сохраняет `section/header/nav/button/body`: stable minimize button,
title/subtitle Text и keyed action buttons. Minimized state отражается через
`aria-expanded`/`aria-controls` и body `hidden`; active state — через root
class/data attribute. HudFrame использует stable `section/header/nav/body`,
`data-edge` и keyed handle buttons. Persistent action/handle key сохраняет
exact Button/Text identity при reorder; duplicate/empty keys отклоняются до
mutation. Body является consumer-owned slot и update не заменяет его children.

Timeline использует `section`, header title, current `time`, transport `nav`
с Previous/Play/Next buttons и keyed `ul/li` track/marker tree. Persistent
track key и composite `(track key, marker key)` сохраняют exact Element/Text
identity при reorder. `min/max/current`, playing, track labels, marker tick,
label и selected state являются controlled; time `datetime`/`data-tick`,
`aria-pressed` и `aria-current` отражают тот же snapshot. Duplicate identities,
неfinite/out-of-range ticks и invalid range отклоняются до mutation.

Leaf не принимает callbacks, не устанавливает listeners и не dispatch-ит
events. Обычные click/pointer events всплывают из standard buttons/elements;
изменение controlled state возможно только через owner `update`. Одна flat
`hudCss` string владеет classes и geometry без sibling coordinates. Production
source импортирует только `@zavx0z/dom`: старый HUD, Engine, Layout, Elements,
renderer, Storybook и любые `*-story` files запрещены. `dispose()` не удаляет
consumer-owned root/body и заставляет subsequent updates fail closed.

## `UI-DOM-FIELD-001` — final production Field controller

Exact public leaf `@ui/components/field` указывает непосредственно на
`packages/components/field.ts`. Это единственный production owner, а не alias
или compatibility export старого retained Field.

`FieldDefinition` является полным discriminated union `text | number | integer
| boolean | enum | color | vector | rotation | matrix | reference | collection
| path | readonly`. Slider является `number.presentation = "slider"`, rotation
использует тот же 2–4-axis numeric contract с отдельным semantic kind, color
хранит normalized immutable RGBA, matrix — square 2×2–4×4 finite values,
reference — opaque `{id, label, kind?}` либо `null`, collection — keyed items и
controlled `selectedId`. Resource loading, domain lookup и topology mutation
не принадлежат Field.

`createField(document, definition)` создаёт один stable `HTMLDivElement`,
typed refs и controller `update`/`dispose`. Field id и kind являются controller
identity и не меняются. Text/number/integer/boolean/enum/readonly используют
standard input/select controls. Color, vector, rotation и matrix состоят из
keyed label/number-input cells. Reference и path состоят из standard
input/button owners. Collection использует `ul` и keyed `li/button` items с
adjacent Add/Remove/Move buttons. Persistent enum value, axis/cell coordinate
или collection item id сохраняет exact Element/Text identity при reorder и
controlled updates; duplicate/empty/dangling identities и invalid numeric
shapes отклоняются до tree mutation.

Definition остаётся controlled snapshot. Update пишет live `value`,
`valueAsNumber`, `checked`, select `value`, disabled/readOnly, reflected
min/max/step, ARIA и advisory `title`. Owned standard `input`, `change` и
`click` listeners передают immutable proposed value в callback текущего
definition, но не переписывают controlled definition и не dispatch-ят событий.
Повторный owner update подтверждает либо откатывает visible live state.
Read-only/disabled Field блокирует mutating controls; reference activation
может оставаться доступным в read-only состоянии как немутирующее действие.

Current renderer честно рисует collapsed select, но пока не владеет native
popup/option activation. Field не подделывает этот platform default action:
он реагирует только на уже изменённое DOM live state и настоящие events.
Checkbox activation использует принятый `HTMLInputElement.click()` закон
click → input → change с cancel rollback; его не копирует Component.

Единственный caller styling hook — optional root `className`; part classes
принадлежат Field. Leaf экспортирует одну flat executable `fieldCss` string и
не принимает `style`, `sx`, label/control style forks или numeric geometry.
Production source импортирует только `@zavx0z/dom`: Engine, Layout, Elements,
renderer, Storybook и любые `*-story` files запрещены. `dispose()` снимает все
owned listeners, не удаляет consumer-owned root и заставляет subsequent
updates fail closed.

## `UI-DOM-DATA-STORIES-001` — semantic List и Table

Private `data-stories.ts` содержит Storybook-only DOM proofs
List и Table. List использует standard `ul`/`li` с `role=listbox`/`option` и
reflected `aria-selected`; Table использует настоящий
`table`/`thead`/`tbody`/`tr`/`th`/`td` tree. CSS меняет только представление и
не заменяет semantic ownership.

Обе stories принимают immutable keyed data. Сохранившийся item, column или row
key сохраняет exact Element identity при reorder/update. Table также сохраняет
cell identity по составному `(row key, column key)`. Duplicate и empty keys,
невалидная геометрия колонок и malformed values отклоняются до tree mutation.

Live HTML source сериализуется из фактического DOM, CSS является exact flat
`dataStoriesCss`, TypeScript показывает прямой `document.createElement`
authoring. Production List/Table factories, Engine, Layout, Elements, renderer
и старый/shared Storybook imports запрещены.

## `UI-DOM-SELECT-STORY-001` — native Select/Option

Private `select-story.ts` строит один stable
`HTMLSelectElement` и keyed `HTMLOptionElement` children. Persistent option key
сохраняет exact Option/Text identity при reorder/update; duplicate/empty keys
и duplicate values отклоняются до tree mutation. Выбор принадлежит live
`select.value`/`selectedIndex`; property updates не фабрикуют `input`/`change`.

HTML source содержит только реальные reflected attributes и option Text, а
live selection показывается честным `select.value` assignment в TypeScript.
CSS является flat `selectStoryCss`; old EnumInput/Elements/renderer imports
запрещены.

## `UI-DOM-CODE-EDITOR-001` — production read-only semantic CodeEditor

Exact public leaf `@ui/components/code-editor` указывает непосредственно
на `packages/components/code-editor.ts`. Surface-based implementation удалена;
parallel owner, alias и compatibility export запрещены.

`createCodeEditor(document, props)` создаёт один stable standard tree:

```text
section.ui-code-editor[aria-readonly=true]
├─ ul.ui-code-editor__gutter[aria-hidden=true]
│  └─ li.ui-code-editor__line-number*
└─ pre.ui-code-editor__viewport
   └─ code.ui-code-editor__code
      └─ span.ui-code-editor__line*
         └─ span.ui-code-editor__token*
```

Public props содержат controlled `value`, обязательный literal
`readOnly: true`, optional exact `languageId`/`path`, supplied `Tokens`,
`showLineNumbers`, `title` и root `className`. CRLF/CR нормализуются в LF.
Supplied Tokens имеют приоритет; иначе exact `@zavx0z/highlighter` выбирается
по `languageId`, затем `path`, затем plaintext fallback. Foreground каждого
token разрешается как `Token.fg`, затем category/scope через source-backed
`@ui/components/syntax-theme`; `Token.bg` сохраняется как bounded hex/rgb(a)
CSS color background hint.

Line identity keyed по zero-based line index. Token/gap identity keyed по
точному range/category occurrence внутри line. Update сохраняет section,
gutter, pre/code, persistent line/number/token spans и Text nodes; removed keys
удаляются из tree/maps. Invalid token count, range, overlap, category или color
отклоняются до mutation. `dispose()` не удаляет consumer-owned section и
запрещает subsequent update.

Одна flat `codeEditorCss` string использует native block/Flex flow,
`overflow:auto`, standard `scrollbar-width:thin`, per-line `nowrap` и current
Islands Dark source colors. Component не измеряет text, не вычисляет scroll,
line/gutter coordinates или renderer boxes. Текущий slice не создаёт textarea,
input proxy, caret, selection, clipboard, copy/paste/cut, keyboard participant,
mutation/history, wrap, debugger/Git либо host header. Эти возможности являются
явными дальнейшими platform/component slices, а не скрытыми callbacks.

Production source импортирует только `@zavx0z/dom`, exact
`@zavx0z/highlighter` и package-local source-backed syntax theme; Engine,
Layout, Elements, renderer, Storybook и старый `../code-editor` запрещены.

## `UI-DOM-CODE-EDITOR-STORY-001` — exact production story adapter

Private `code-editor-story.ts` создаёт ровно один production
`createCodeEditor` controller и возвращает его stable section. Story update
передаёт новый immutable props snapshot тому же controller; отдельный textarea,
parallel token tree и copied stylesheet запрещены. HTML source сериализуется
из live semantic tree, CSS равен exact `codeEditorCss`, TypeScript импортирует
`@ui/components/code-editor`. Existing exact route
`components/data/code-editor/state/read-only` использует adapter и production
CSS без нового route либо compatibility export.

## `UI-DOM-NUMERIC-COMPOSITE-STORIES-001` — Vector и Matrix

Private `numeric-composite-stories.ts` строит Vector/Matrix из
standard `fieldset`, `legend`, `label`, `span` и `input[type=number]` nodes.
Vector field key и Matrix row/cell keys сохраняют exact subtree/input identity
при reorder. Duplicate/empty keys, неверная размерность и неравные Matrix rows
отклоняются до tree mutation; live number sanitation принадлежит DOM input.

HTML source выводится из фактического semantic tree, CSS является flat
`numericCompositeStoriesCss`, TypeScript показывает direct createElement
authoring. Production VectorInput/MatrixInput, Engine, Layout, Elements,
renderer и Storybook imports запрещены.

## `UI-DOM-COLOR-STORIES-001` — semantic RGBA Field и ColorInput

Private `color-stories.ts` содержит Storybook-only DOM proofs
для действующих `field/color/input` и ColorInput closed/open/expanded routes.
Color Field — stable `fieldset`/`legend` с четырьмя keyed `label` и
`input[type=text]` controls для unit-range R/G/B/A channels. Stable generated
id связывает каждый label и input; update сохраняет exact Fieldset, Legend,
Label, Input и Text identities.

ColorInput использует один stable `fieldset`, trigger `button` и постоянно
существующий picker DOM. Closed/open/expanded меняют только class, `hidden`,
`aria-expanded` и disabled/readOnly state: closed скрывает picker, open
показывает trigger и picker, expanded скрывает trigger и оставляет picker в
flow. Picker plane является standard `div[role=group]` с четырьмя keyed
`input[type=range]`; рядом остаются четыре keyed RGBA text inputs. Persistent
channel key сохраняет label/input/Text identity во всех presentation states.

Unit channels валидируются до mutation. Live text/range changes читаются
через ordinary bubbling `input`, синхронизируют парный standard control и не
создают другой event. Trigger использует ordinary bubbling `click` и меняет
только closed/open story state; updates не dispatch-ят события. HTML source
сериализует фактическое semantic tree без fake live value attributes,
TypeScript показывает direct `document.createElement`, `.value`,
`.valueAsNumber` и `addEventListener`, CSS является exact flat
`colorStoriesCss`. Production ColorInput/color-picker, Engine, Layout,
Elements, renderer и Storybook imports запрещены.
