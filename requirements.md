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
collapse, preview, embedded Parameter/Property Fields, typed Socket endpoints,
Frame/Link/Node paint order, controlled selection, fit/pan/zoom, grid, culling,
hit semantics и stable keyed identity. Реализация не обязана сохранять прежние
`UiSurface` signatures, но обязана сохранять наблюдаемое поведение и данные.

Accepted raster
`../storybook/assets/references/blender-4.5.5-reference.png` является exact
visual boundary. DOM migration считается завершённой только после
сопоставимого live Node capture, а не по количеству DOM routes, отсутствию
retained imports или размеру bundle.

## Public contract

### `NODES-UI-DOM-PUBLIC-001` — exact owners

Public exports ограничены следующими exact subpaths:

- `@nodes/ui/graph-canvas` → `createGraphCanvas`, CSS и Graph types;
- `@nodes/ui/node-workbench` → `createNodeWorkbench`, CSS и composition types;
- `@nodes/ui/parameter-socket` → `createParameterSocket`, CSS и control types;
- `@nodes/ui/node-tree-editor` → `createNodeTreeEditor`, CSS и tree types.
- `@nodes/ui/node` → Blender-like Node article, typed presets and controller;
- `@nodes/ui/parameter` → embedded Parameter/Property Field composition;
- `@nodes/ui/socket` → typed Socket kinds, shapes, colors and controller;
- `@nodes/ui/link` → typed Link geometry and keyed hit corridors;
- `@nodes/ui/node-editor` → Graph composition and interaction controller.
- `@nodes/ui/node-system` → compiled TSX `NodeSystem → NodeCard → ParameterRow
  → SocketPort / NodeConnection` composition over a structural external-store
  read contract.

Root `@nodes/ui` экспортирует standard-DOM owner modules. Новые exact leaves
используют естественные Node names; они не являются aliases к старым Surface
constructors и не восстанавливают параллельную runtime hierarchy.

Каждая factory принимает exact `@zavx0z/dom` `Document`, возвращает один
стандартный `HTMLElement`, typed refs, frozen controlled props, `update()` и
`dispose()`. Observable hierarchy остаётся стандартной
`Node → Element → HTMLElement`; factory не вводит параллельную runtime class
hierarchy.

### `NODES-UI-DOM-PUBLIC-002` — package boundary

Production DOM owners импортируют `@zavx0z/dom`, exact
`@ui/components/field` contract и друг друга. Compiled owners дополнительно
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

### `NODES-UI-COMPILED-001` — canonical store projection

`NodeSystem` принимает стабильные `subscribe()` / `getSnapshot()` из
`createNodeTreeExternalStore()` и читает их через `useSyncExternalStore`.
Компоненты не копируют NodeTree, Parameter values, topology или revision в
локальный store. Запись Parameter является callback boundary; canonical
adapter вызывает `NodeTreeEditor.setParameterValue()` с текущей revision.

Node, Parameter, Socket и Link materialize-ятся keyed по canonical id. Value и
topology commits сохраняют identity каждого surviving semantic element.
Произвольное количество Parameters/Sockets компонуется без slot limit;
boolean, number и string имеют native controlled inputs, а составное JSON
value остаётся read-only canonical representation, не string Store.

Каждый compiled public component имеет один `style` prop. Owner defaults
создаются class-free `defineStyles`, caller override идёт последним; `class`,
`className` и `sx` не являются public styling paths.

### `NODES-UI-COMPILED-PERF-001` — 1k / 10k interaction budget

Reproducible gate запускается `bun run bench:node-system` на сценах 1 000 и
10 000 canonical Nodes. Каждый Node имеет четыре Parameters (vector source,
number, boolean, vector result), два typed Sockets и участвует в ordered Link
chain. Viewport `850 × 500` materialize-ит шесть Nodes; culling является pure
projection над snapshot и не хранит второй tree/index.

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
без manual backend hints. Benchmark завершает process non-zero при любом
budget/correctness failure.

## GraphCanvas

### `NODES-UI-DOM-GRAPH-001` — keyed semantic scene

`createGraphCanvas()` владеет стабильной цепочкой
`section → header + viewport → scene`. Controlled props содержат finite scene
translate, positive scale and ordered keyed Frames, Links and Nodes.

Scene children всегда имеют semantic paint order:

1. Frame `section` backgrounds/labels;
2. Link groups с ordered absolute horizontal/vertical segment `div`;
3. Node `article` elements.

Frame/Node rectangles используют finite absolute coordinates and positive
size. Link segment имеет четыре finite endpoints, меняет ровно одну axis и не
может быть diagonal или zero-length. Invalid complete props отклоняются до
mutation.

Frame, Link and Node IDs unique внутри entity family. Их Element/Text identity
сохраняется через update/reorder. Link segment identity сохраняется по
`(link id, segment index)`. Removed key detach-ится; повторное добавление
создаёт новую identity.

GraphCanvas является keyed paint owner. Он materializes production Node и Link
controllers, а не label-only substitutes. Selection отражается controlled
`aria-selected`; interaction listeners принадлежат exact NodeEditor owner.

## Node

### `NODES-UI-DOM-NODE-001` — Blender-like article

`createNode()` возвращает stable semantic `article` с compact 24px coloured
header, controlled disclosure, optional preview toggle/panel, embedded
Properties и Parameters, loose typed Sockets и symmetrical selection shadow.
Properties используют exact `createField()`; Parameter сохраняет один Field и
не дублирует value/control implementation. Collapse скрывает body, сохраняя
Node, Field, Parameter и Socket identities.

Public socket inventory сохраняет 19 kinds и 8 shapes parent contract. Kind
задаёт color/shape preset, а `side` и capability `direction` остаются
независимыми. Socket является standard button endpoint с exact Node/Socket ids.

## Parameter

### `NODES-UI-DOM-PARAMETER-002` — exact shared Field

`createParameter()` принимает `FieldDefinition` из `@ui/components/field` и
встраивает exact `createField()` controller между максимум одним левым и одним
правым Socket. Color, vector, rotation, matrix, reference, collection и path не
сериализуются в строковый substitute. Connected state скрывает только editor,
сохраняя label, Field controller и endpoint identities.

## Link

### `NODES-UI-DOM-LINK-001` — route and hit identity

`createLink()` принимает typed Socket kind, optional exact endpoints и ordered
axis-aligned route segments. Segment visuals и 16px hit corridors имеют stable
identity `(link id, segment index)`. Kind color совпадает с Socket preset;
selected Link остаётся последним среди Links, но перед Nodes.

## NodeEditor

### `NODES-UI-DOM-EDITOR-001` — interaction without Surface signatures

`createNodeEditor()` владеет одним GraphCanvas, intrinsic grid, controlled
Frame/Link/Node selection, fit, wheel pan, anchor-preserving zoom, pointer pan,
two-pointer pinch, transform-only scene mutation и viewport culling. Standard
DOM events являются единственным input API. Transform меняет stable scene и
не пересоздаёт Frame, Link, Node, Parameter, Field или Socket subtrees.

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
`@ui/components/field` definitions.
Каждый Parameter отражает `fieldKind`, variant
`field|input|output|both|connected`, value/checked/options/range metadata,
visibility, disabled/readOnly and connected state. Connected input скрывает
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
4. Source and manifest scans подтверждают отсутствие retained owners при exact
   dependency на `@ui/components/field`.
5. Focused tests доказывают rich Node structure, Field identity, Socket presets,
   Link corridors, selection, pan/zoom/pinch, grid и keyed reconciliation.
6. Exact Blender-reference capture остаётся обязательным browser acceptance
   gate; route count и non-black canvas его не заменяют.
