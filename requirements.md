# Требования @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` владеет standard-DOM authoring contract для
`NodeTree → Frame / Node → Parameter → Socket → Link`. Application root
соединяет это semantic tree с CPU/WebGPU renderer; UI package не получает
renderer host или ручной paint surface.

## Public contract

### `NODES-UI-DOM-PUBLIC-001` — exact owners

Public exports ограничены следующими exact subpaths:

- `@nodes/ui/graph-canvas` → `createGraphCanvas`, CSS и Graph types;
- `@nodes/ui/node-workbench` → `createNodeWorkbench`, CSS и composition types;
- `@nodes/ui/parameter-socket` → `createParameterSocket`, CSS и control types;
- `@nodes/ui/node-tree-editor` → `createNodeTreeEditor`, CSS и tree types.

Root `@nodes/ui` экспортирует четыре DOM owner modules. Старые retained
Node/NodeEditor/Parameter/Link APIs удалены одним breaking change без aliases,
deprecated names или compatibility re-exports.

Каждая factory принимает exact `@zavx0z/dom` `Document`, возвращает один
стандартный `HTMLElement`, typed refs, frozen controlled props, `update()` и
`dispose()`. Observable hierarchy остаётся стандартной
`Node → Element → HTMLElement`; factory не вводит параллельную runtime class
hierarchy.

### `NODES-UI-DOM-PUBLIC-002` — package boundary

Production DOM owners импортируют только `@zavx0z/dom` и друг друга.
Engine, generic retained Layout runtime, retained UI controls,
Elements, Surface/Runtime owners и renderer отсутствуют в production source и
manifest. Domain `@nodes/layout` не является скрытой UI dependency: real
computed graph geometry передаётся в `GraphCanvasProps` владельцем domain/app.

Storybook files являются dev-only consumers и не входят в exports или
production dependency graph.

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

Selection отражается только controlled `aria-selected`; production controller
не устанавливает listeners и не создаёт события.

## ParameterSocket

### `NODES-UI-DOM-PARAMETER-001` — standard controls

`createParameterSocket()` создаёт ordered keyed Parameter rows. Каждая строка
сохраняет label/control relation, stable input and select identities, keyed
options и максимум один Socket на каждой visual side.

Exact standard projections:

- `input[type=text|number|checkbox]`;
- single `select` с keyed `option` values;
- string authoring для composite color/vector/rotation/matrix/reference/path.

Последнее является явной DOM projection, а не копией universal Field DSL.
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
3. CPU renderer smoke подтверждает geometry/hit identity без renderer imports в
   production package.
4. Source and manifest scans подтверждают отсутствие retained owners.
5. Root Node check, package typecheck, Storybook static build and diff check
   проходят без compatibility files.
