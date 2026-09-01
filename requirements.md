# Требования @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` владеет Blender-подобной компонентной библиотекой
`NodeTree → Frame / Node → Parameter → Socket → Link`, авторинг которой
выполняется standard DOM. DOM является substrate для прежнего визуального и
interaction-контракта, а не разрешением заменить Node Editor набором общих
прямоугольников, вынести Parameter из Node или изменить принятый Blender-like
язык. Application root соединяет semantic tree с CPU/WebGPU renderer; UI
package не получает renderer host или ручной paint surface.

Нормативная поведенческая база миграции — public Node UI из parent revision
`8130b370e287a3abb71fecb9d0bbe6fdc68d0fb7`: compact coloured Node header,
collapse, preview, embedded concrete Parameter Fields, typed Socket endpoints,
Frame/Link/Node paint order, controlled selection, fit/pan/zoom, grid, culling,
hit semantics и stable keyed identity. Реализация не обязана сохранять прежние
`UiSurface` signatures, но обязана сохранять наблюдаемое поведение и данные.

Accepted raster
`.storybook/references/blender-4.5.5-reference.png` является exact
visual boundary. DOM migration считается завершённой только после
сопоставимого live Node capture, а не по количеству DOM routes, отсутствию
retained imports или размеру bundle.

## Public contract

### `NODES-UI-DOM-PUBLIC-001` — exact owners

Public exports ограничены следующими exact subpaths:

- `@nodes/ui/graph-canvas` → `createGraphCanvas`, pure
  `replaceGraphCanvasLink` / `replaceGraphCanvasLinks`, CSS и Graph types;
- `@nodes/ui/node-workbench` → `createNodeWorkbench`, CSS и composition types;
- `@nodes/ui/parameter-socket` → `createParameterSocket`, CSS и control types;
- `@nodes/ui/node-tree-editor` → `createNodeTreeEditor`, CSS и tree types.
- `@nodes/ui/node` → Blender-like Node article, typed presets and controller;
- `@nodes/ui/parameter` → embedded concrete Parameter Field composition;
- `@nodes/ui/socket` → typed Socket kinds, shapes, colors and controller;
- `@nodes/ui/link` → typed orthogonal/cubic routes, one semantic
  `HTMLVectorPathElement` and keyed stroked-path hits;
- `@nodes/ui/node-editor` → Graph composition and interaction controller.
- `@nodes/ui/node-system` → compiled TSX `NodeSystem → NodeCard → ParameterRow
  → SocketPort / NodeConnection` composition over a structural external-store
  read contract.

Root `@nodes/ui` экспортирует standard-DOM owner modules. Новые exact leaves
используют естественные Node names; они не являются aliases к старым Surface
constructors и не восстанавливают параллельную runtime hierarchy.

Public `*Css` exports сохраняют exact bytes при явном импорте, но их pure
initializers не удерживаются consumer bundle, который импортирует только
factory/default props. Linked `dom.css` не дублирует JS CSS transport без
явного запроса consumer-а.

Каждая factory принимает exact `@zavx0z/dom` `Document`, возвращает один
стандартный `HTMLElement`, typed refs, frozen controlled props, `update()` и
`dispose()`. Observable hierarchy остаётся стандартной
`Node → Element → HTMLElement`; factory не вводит параллельную runtime class
hierarchy.

### `NODES-UI-DOM-PUBLIC-002` — package boundary

Production DOM owners импортируют `@zavx0z/dom`, exact concrete
`@ui/components/fields/*` contracts и друг друга. Compiled owners дополнительно
используют только `@zavx0z/react` runtime и build-time
`@zavx0z/template`; npm React/Fiber отсутствуют. Engine, generic retained Layout
runtime, Elements, Surface/Runtime owners и renderer отсутствуют в production
source и manifest. Domain `@nodes/layout` не является скрытой UI dependency:
real computed graph geometry передаётся владельцем domain/app.

Удаление `@ui/elements` или Surface runtime не разрешает удалить возможности,
которыми они ранее владели. Поведение переносится на DOM/CSS/events до удаления
старого implementation path.

Storybook files являются dev-only consumers и не входят в exports или
production dependency graph.

### `NODES-UI-DOM-BUNDLE-001` — full all-controller browser budget

Package boundary собирает один minified browser artifact из public
`GraphCanvas`, `NodeWorkbench`, `ParameterSocket` и `NodeTreeEditor`.
`NodeWorkbench` транзитивно включает `NodeEditor → GraphCanvas → Node →
Parameter → exact concrete compiled Field`; поэтому это полный all-controller + one-DOM-
realm budget, а не размер отдельного UI package или одного lazy subpath.

После перехода на 13 exact concrete Fields, DOM Node behavior и generic retained
Path измерение текущего linked owner graph после bounded tree-shaking составляет
`244300` raw / `60660` gzip bytes (`108` metafile inputs, один output, SHA-256
`4d5afe740797998484c0155d050d98798a23dd040426f1052549fbf5b109d085`).
Tight ceiling равен `245000 / 61000`; запас — `700` raw и `340` gzip bytes.
Side-effect-free literal initializers удаляют из consumer четыре
неиспользуемых public CSS documents (`Socket`, `Link`, `NodeTreeEditor`,
`ParameterSocket`) без изменения их exact импортируемых bytes и экономят `6266`
raw / `1440` gzip bytes. Повторные controller imports также дедуплицированы.

Предыдущие gates `215000 / 55000` и `230000 / 60000`, снятые до concrete Field
owner graph, не описывают тот же observable scope. Следующее увеличение ceiling
требует нового metafile evidence; уменьшение bundle не разрешает удалять owner behavior, validators,
standard DOM state или exact concrete Field kinds. Отдельный UI bundle budget не
подменяет этот full-realm gate.

### `NODES-UI-COMPILED-001` — canonical store projection

`NodeSystem` принимает стабильные `subscribe()` / `getSnapshot()` из
`createNodeTreeExternalStore()` и читает их через `useSyncExternalStore`.
Компоненты не копируют NodeTree, Parameter values, topology или revision в
локальный store. Запись Parameter является callback boundary; canonical
adapter вызывает `NodeTreeEditor.setParameterValue()` с текущей revision.

Node, Parameter, Socket и Link materialize-ятся keyed по canonical id. Один
Link materialize-ится одним `<vector-path>` без segment/hit child rectangles.
Value и topology commits сохраняют identity каждого surviving semantic element.
Произвольное количество Parameters/Sockets компонуется без slot limit;
boolean, integer/number, string/path и shape-verified
vector/rotation/matrix/color композируют соответствующие exact concrete Fields.
Неизвестное составное JSON value использует exact ReadonlyField; базовые Controls
остаются собственностью `@ui/components`, не локальной реализацией Nodes.

Каждый compiled public component имеет один `style` prop. Author-facing style
является только настоящим `css\`\``: один top-level template содержит owner
defaults, attribute/native-state selectors, dynamic declaration interpolation
и последний `${props.style}` caller fragment. Variant/state сначала отражается
real DOM/ARIA/data attribute и не дублируется JS conditional style. CamelCase object,
`CSSProperties`, `StyleValue` object, style arrays, `defineStyles`, `*Styles` и
`*Css` transport запрещены; `class`, `className` и `sx` также не являются
public styling paths. Compile-time `css` tag предоставляет configured
`jsxImportSource` без повторяющихся imports и без `globalThis` runtime.

### `NODES-UI-COMPILED-PERF-001` — 1k / 10k interaction budget

Reproducible gate запускается `bun run bench:node-system` на сценах 1 000 и
10 000 canonical Nodes. Каждый Node имеет четыре Parameters (vector source,
number, boolean, vector result), два typed Sockets и участвует в ordered Link
chain. Viewport `850 × 500` materialize-ит шесть Nodes и восемь Links по закону
`visible endpoint OR route-bounds intersection`; culling
является pure projection над snapshot и не хранит второй tree/index. Поэтому
`999 / 9999` canonical Links проверяют стоимость store/culling, а массовая
stroke-производительность отдельно закрывается `bun run bench:node-paths` на
`512 / 2048 / 10000` materialized Links.

Budgets выводятся из 90 Hz (`11.111 ms`) и 60 Hz (`16.667 ms`):

1. visible Parameter commit p95, offscreen commit/renderer/backend и topology
   UI publication ≤ один 90 Hz frame; immutable external-store projection ≤
   один 60 Hz frame и отдельно видна внутри total topology commit;
2. visible renderer/backend p95 и topology renderer ≤ один 60 Hz frame;
3. total Editor `addNode` ≤ один 60 Hz frame на 1k и два frame на 10k;
4. cold component mount, initial CPU renderer и WebGPU backend preparation ≤
   восемь 60 Hz frames каждый;
5. 20 warmed visible samples определяют p50/p95; один случайный fast sample не
   является evidence и не поднимает budget. Три value и один additive topology
   warm-up выполняются до измерений и не входят в reported samples.

Acceptance также требует: ≤3 renders visible value; 0 renders offscreen value;
0 root renders culled topology; 0 DOM/state mutations offscreen/topology;
surviving Node/Input identity; exact renderer frame reuse; WebGPU backend
`rectPlanReused` с `rectPreparedItems=0`; default automatic safe Rect instancing
без manual backend hints; восемь visible Link являются восемью semantic Paths,
одним opaque instanced Path draw run и `120` historical sampled segments. Offscreen/topology no-op
не выполняет Path uploads. Benchmark завершает process non-zero при любом
budget/correctness failure.

## GraphCanvas

### `NODES-UI-DOM-GRAPH-001` — keyed semantic scene

`createGraphCanvas()` владеет стабильной цепочкой
`section → header + viewport → scene`. Controlled props содержат finite scene
translate, positive scale and ordered keyed Frames, Links and Nodes.

Scene children всегда имеют semantic paint order:

1. Frame `section` backgrounds/labels;
2. ordered semantic Link `<vector-path>` elements;
3. Node `article` elements.

Frame/Node rectangles используют finite absolute coordinates and positive
size. Orthogonal Link route содержит минимум две finite точки; каждый run
меняет ровно одну axis и не может быть diagonal или zero-length. Cubic route
содержит непрерывную непустую chain с двумя control points на segment. Invalid
complete props отклоняются до mutation.

Frame, Link and Node IDs unique внутри entity family. Их Element/Text identity
сохраняется через update/reorder. Path data и bounds меняются на том же exact
Link Element. Removed key detach-ится; повторное добавление создаёт новую
identity.

GraphCanvas является keyed paint owner. Он materializes production Node и Link
controllers, а не label-only substitutes. Selection отражается controlled
`aria-selected`; interaction listeners принадлежат exact NodeEditor owner.
`replaceGraphCanvasLink()` и atomic `replaceGraphCanvasLinks()` являются pure
immutable hot-path helpers: они normalizes только указанные Links, сохраняют
exact previous-array provenance через `WeakRef` и changed indices в private
WeakMap, не удерживая цепочку старых immutable массивов, и возвращают одну
frozen shallow copy. Следующий полный
`graph.update({...props, links})` принимает delta только при exact previous-array
identity; stale/foreign metadata проходит обычную полную validation/reconcile.

## Node

### `NODES-UI-DOM-NODE-001` — Blender-like article

`createNode()` возвращает stable semantic `article` с compact 24px coloured
header, controlled disclosure, optional preview toggle/panel, embedded
Parameters, loose typed Sockets и symmetrical selection shadow. Socketless
Parameter представляет прежнюю visual property-row без второй Property identity
или отдельного value contract. Каждый Parameter сохраняет один root конкретного
Field и не дублирует value/control implementation. Collapse скрывает body,
сохраняя Node, Field, Parameter и Socket identities.

Public socket inventory сохраняет 19 kinds и 8 shapes parent contract. Kind
задаёт color/shape preset, а `side` и capability `direction` остаются
независимыми. Socket является standard button endpoint с exact Node/Socket ids.
Loose right-side Sockets materialize-ятся сразу под header в definition order;
Parameters следуют за ними, а loose left-side Sockets завершают
body. Перенос между сторонами сохраняет Socket identity и не создаёт второй
presentation owner.

Accepted compact density использует `24px` header, `8px` horizontal body inset,
`20px` Field/Parameter rows, `10px` text и `10px` filled Socket с `1px` dark
outline. Node CSS уменьшает public Field chrome только через обычный cascade:
socketless full-row enum Parameter скрывает дублирующий внешний painted label и
сохраняет тот же Field/`aria-labelledby`; numeric control, value transport и continuous
fill остаются собственностью `@ui/components`.

## Parameter

### `NODES-UI-DOM-PARAMETER-002` — exact concrete Field

`createParameter()` принимает плоский Node-owned discriminated
`ParameterDefinition`: `id`, `kind`, direct props соответствующего concrete
Field и topology presentation находятся в одном immutable value. Private mount
выбирает exact `@ui/components/fields/*` owner и монтирует его через один
`@zavx0z/react` root между максимум одним левым и одним правым Socket. Kind
неизменяем внутри Parameter identity; update передаёт direct props тому же
concrete Field component, а public ref является его реальным standard DOM element.
Node-owned definition объявляет `style?: never`: forged own `style` отклоняется
до render/mutation, а private transport дополнительно никогда не передаёт его
concrete Field. Компактный Node layout остаётся parent-owned cascade.
Color, vector, rotation, matrix, reference, collection и path не сериализуются
в строковый substitute. Connected state скрывает только editor, сохраняя label,
Field element и endpoint identities. Standard `hidden` исключает control group
и его descendants из layout, paint и hit projection; Node не подменяет это
ручным удалением inputs или локальным control implementation.

## Link

### `NODES-UI-DOM-LINK-001` — route and hit identity

`createLink()` принимает typed Socket kind, optional exact endpoints и один
discriminated route: ordered axis-aligned points либо готовую typed Path
projection. Exact `createCubicLinkRoute()` adapter принимает непрерывную cubic
chain; forged projected routes fail closed before DOM mutation.
Orthogonal route сохраняет exact endpoints, прямые runs кодирует `M/L`, а
каждый реальный corner — локальным cubic radius
`min(10, adjacentLength / 2)` с historical controls `2/3` к corner. Готовая
top-down/Coffman cubic chain adapter передаёт в `M/C` без sampling в Nodes.
Projected route содержит не больше `256` non-degenerate `L/C` commands — exact
generic Path bound. Orthogonal validation считает уже скруглённые line+cubic
commands и отклоняет overflow до любой DOM mutation.
Каждая authored coordinate использует тот же public DOM ABI bound
`VECTOR_PATH_COORDINATE_LIMIT = 16777216`; большие finite числа отклоняются до
вычисления bounds и не переполняют Float32 backend.

Один Link является одним semantic `<vector-path>` owner без visual/hit
children. Kind color совпадает с Socket preset; local stroke равен `2.2px`,
selected — `3.4px`; `pointer-hit-width: 16px` сохраняет local corridor и
screen minimum. Selected Link через стандартный stacking `z-index` рисуется
последним среди Links без semantic DOM reparent, но остаётся перед Nodes.
Transform/clip
наследуются от общего scene; pan/zoom не меняют `d` или retained Path geometry.

Нормативный pre-DOM owner baseline `8130b370e287a3abb71fecb9d0bbe6fdc68d0fb7`
рисовал Link только type color и width `2.2 / 3.4`, без glow/shadow. Поздний
`box-shadow` на прямоугольных DOM segments не подтверждён Link reference или
owner law и не переносится в Path как новый visual contract. Generic Path
shadow остаётся отдельной platform capability; Nodes не добавляет локальный
эффект или второй paint owner.

Hit parity сохраняет semantic target, local width `16`, screen minimum,
transform/clip и paint-order winner. Старый retained host использовал broad
axis-aligned AABB отдельных orthogonal runs; это была backend hit approximation,
не accepted visual geometry и не отдельный public hit-shape option. Generic Path
теперь владеет точной tube-distance проверкой вокруг уже скруглённого stroke.
Около внешних углов envelope поэтому уже прежнего AABB; Nodes фиксирует это как
осознанную generic Path semantics и не восстанавливает прямоугольные invisible
hit owners как consumer workaround.

## NodeEditor

### `NODES-UI-DOM-EDITOR-001` — interaction without Surface signatures

`createNodeEditor()` владеет одним GraphCanvas, intrinsic grid, controlled
Frame/Link/Node selection, fit, wheel pan, anchor-preserving zoom, pointer pan,
two-pointer pinch, transform-only scene mutation и viewport culling. Standard
DOM events являются единственным input API. Transform меняет stable scene и
не пересоздаёт Frame, Link, Node, Parameter, concrete Field или Socket subtrees.
Link видим, если видим source Node, видим target Node либо stored route bounds
пересекает viewport. Fit/culling читают immutable Node-owned bounds и не делают
Renderer readback или повторный Path parse. Cubic bounds используют безопасный
control hull: он может быть шире математической кривой, но никогда не cull-ит
видимый stroke.

Compiled connection с совпавшими exact endpoints остаётся bounded self-loop:
он выходит на `30px` наружу через resolved Socket side, делает один
ортогональный detour и возвращается в тот же center. Его outward bounds входят
в тот же viewport predicate, поэтому петля не исчезает вместе с offscreen Node.

### `NODES-UI-PATH-PERF-001` — retained dense Link gate

`bun run bench:node-paths` materialize-ит один semantic Path на Link в трёх
сценариях: `512`, `2048` и synthetic `10000`. Каждый route использует три
orthogonal runs и два historical cubic corners: generic Renderer sample даёт
ровно `15` retained stroke segments, но DOM остаётся одним Element.

Benchmark записывает initial CPU/backend materialization и 100 samples каждого
interaction: stable frame, shared transform-only pan/zoom, atomic selection
switch между двумя Links и изменение route одного Link. Report содержит renderer/backend/total
p50/p95/p99, initial/final/post-GC retained heap, draw runs, styles, segments и
upload bytes. GC выполняется после measured interactions и отдельного event-loop
yield, поэтому WeakRef predecessor chain может быть собрана, но frame timings не
содержат GC pause. Acceptance:

1. одна shared transform/clip group даёт один Path draw run;
2. transform сохраняет все geometry/style/order slots и выполняет zero uploads;
3. GraphCanvas selection сохраняет semantic DOM order, но paints тот же Link
   последним через CSS stacking; пишет только bounded style/order fields и zero
   geometry segments;
4. route update меняет geometry ровно одного Link и пишет только изменившиеся
   sampled-segment fields (`16` bytes на изменённый segment), без полного
   style/geometry-buffer rewrite;
5. semantic Element identity сохраняется, children отсутствуют;
6. interactive total p95 каждого сценария не превышает один 60 Hz frame.

Dense timing использует ordinary/selected opaque Links (`opacity=1`), чтобы
доказывать retained fast path. Disabled Link с owner opacity `.45` остаётся
обязательным correctness fallback и проверяется focused render test, но не
выдаётся за часть opaque throughput claim.

Per-apply acceptance читает `pathStyleWriteBytes`, `pathSegmentWriteBytes` и
`pathOrderWriteBytes`. `pendingPath*UploadBytes` описывает ещё не acknowledged
Engine buffer capacity и не является delta текущего interaction. Report также
фиксирует `pathInstancedDraws=1`, `pathScalarDraws=0`, style/segment capacities,
retained record bytes и unit geometry bytes.

## ParameterSocket

### `NODES-UI-DOM-PARAMETER-001` — standard controls

`createParameterSocket()` создаёт ordered keyed Parameter rows. Каждая строка
сохраняет label/control relation, stable input and select identities, keyed
options и максимум один Socket на каждой visual side.

Legacy standalone catalog owner поддерживает standard projections:

- `input[type=text|number|checkbox]`;
- single `select` с keyed `option` values;
- временную string projection только для прежних standalone route descriptors.

Она не является production Node Parameter contract и не может использоваться
для embedded Node или visual parity. Production Parameter использует exact
concrete `@ui/components/fields/*` owners.
Каждый legacy catalog Parameter отражает `valueKind`, historical route variant
`field|input|output|both|connected`, value/checked/options/range metadata,
visibility, disabled/readOnly and connected state.
Здесь `field` означает только сохранённый id socketless story и показывается
пользователю как «Без сокетов»; generic production Field owner не существует.
Connected input скрывает
editor стандартным `hidden`, не меняя Parameter identity.

Socket содержит независимые `kind`, capability
`input|output|bidirectional` и side `left|right`; capability не выводится из
side. Parameter/Socket/option keys unique, duplicate side occupancy and
mismatched connected state fail closed.

Production controller не устанавливает listeners. Consumer применяет bubbling
`input`, `change` and cancelable `click` к complete controlled props.

## NodeTreeEditor

### `NODES-UI-DOM-TREE-001` — nested standard tree

`createNodeTreeEditor()` владеет nested `ul/li` NodeTree с disclosure/select/
authoring buttons and keyed Parameter label/input rows. Props содержат title,
editable, controlled query/selection and ordered keyed Node/Parameter items.

Node and Parameter IDs сохраняют every element, Text and generated control id
through updates/reorder. Query отражается standard `hidden`; expanded,
selected, readOnly and disabled используют standard properties/ARIA.

Controller не создаёт focus/editing/default actions поверх DOM и не
fabricate-ит input/change events.

## NodeWorkbench

### `NODES-UI-DOM-WORKBENCH-001` — owner composition

`createNodeWorkbench()` не рисует Node entities заново. One stable wrapper
удерживает exact `GraphCanvas`, `NodeTreeEditor` and `ParameterSocket`
controller elements. Keyed standard `figure/img` владеют preview/reference
media; semantic listbox владеет popup evidence.

Controlled mode выбирает aggregate, NodeEditor, Frame, Link or Comparison
composition. Update сохраняет wrapper and surviving nested controller
identities. Comparison order places accepted reference beside one live
Noise-style Graph Node and its standard Parameter projection.

Production composition не устанавливает listeners; application/story owner
binds standard events to complete nested props.

## Private Storybook adapters

### `NODES-UI-DOM-SINGLE-NODE-001` / `NODES-UI-DOM-SINGLE-NODE-002`

`SingleNodeCanvas` остаётся private minimal fixture/controller and story for
one keyed Node identity. Он не является public alias GraphCanvas.

### `NODES-UI-DOM-MULTI-NODE-001` / `NODES-UI-DOM-MULTI-NODE-002`

`MultiNodeCanvas` остаётся private keyed transform/selection fixture for exact
Storybook routes. Public multi-entity contract is GraphCanvas.

### `NODES-UI-DOM-GRAPH-002`

Private Graph story binds standard controlled Frame/Link/Node selection to the
public GraphCanvas controller and remains outside package exports.

## Acceptance

1. Exact self-imports каждого public subpath compile and build.
2. Все factories возвращают elements того же `@zavx0z/dom` realm.
3. CPU renderer smoke подтверждает geometry, transform, culling и hit identity
   без renderer imports в production package.
4. Source and manifest scans подтверждают отсутствие retained owners и generic
   Field facade при exact dependencies на `@ui/components/fields/*`.
5. Focused tests доказывают rich Node structure, concrete Field identity, Socket presets,
   Link corridors, selection, pan/zoom/pinch, grid и keyed reconciliation.
6. Exact Blender-reference capture остаётся обязательным browser acceptance
   gate; route count и non-black canvas его не заменяют. Comparison route
   использует immutable accepted raster без производного baseline и показывает
   exact `Noise Texture` scope `x=498, y=558, width=228, height=385` в CSS px
   source viewport `1920 × 1200` при DPR `2`. Рядом materialize-ится production
   `@nodes/ui/node` в том же `228 × 385` viewport и при scale `1`; full-window
   `object-fit` thumbnail, independently fitted live Node и несопоставимые
   scene/scale запрещены. Presentation crop использует standard scroll offset
   clipped `overflow` container; derived raster, private Canvas и manual image
   painting не создаются.
