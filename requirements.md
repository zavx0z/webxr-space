# Требования @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` владеет одной compiled component projection:

```text
Core NodeTree
└── NodeTree
    └── NodeEditor / Frame / Node / concrete Parameter / Socket / Link
```

Нормативная поведенческая база — public Node UI parent revision
`8130b370e287a3abb71fecb9d0bbe6fdc68d0fb7`: compact coloured header,
collapse, preview, concrete Parameter Fields, полный Socket inventory,
Frame/Link/Node paint order, selection, fit/pan/zoom/pinch, grid, culling,
hit semantics и stable identity. Старые `UiSurface`, `@ui/elements`,
`@layout/core` и ручной paint runtime не возвращаются.

Accepted raster `.storybook/references/blender-4.5.5-reference.png` остаётся
visual law и immutable resource, но не namespace или production dependency.

## Public contract

### `NODES-UI-COMPONENT-PUBLIC-001` — exact owners

Package публикует только:

- `@nodes/ui/node-tree` → `NodeTree` и exact Core external-store projection;
- `@nodes/ui/node-editor` → `NodeEditor` interaction composition;
- `@nodes/ui/frame` → `Frame`;
- `@nodes/ui/node` → `Node`;
- `@nodes/ui/parameter` → `Parameter` и concrete presentations:
  `TextParameter`, `NumberParameter`, `SliderParameter`,
  `CheckboxParameter`, `SwitchParameter`, `SelectParameter`,
  `CycleParameter`, `OptionGroupParameter`, `ColorParameter`,
  `VectorParameter`, `MatrixParameter`, `PathParameter`,
  `ReferenceParameter`, `CollectionParameter`, `OutputParameter`;
- `@nodes/ui/socket` → `Socket`, 19 kinds, 8 shapes and presets;
- `@nodes/ui/link` → `Link`, bounded route projection and cubic adapter.

Root экспортирует те же semantic owners. Public factory/controller,
`update()/dispose()`, `*Css` string, `GraphCanvas`, `NodeWorkbench`,
`ParameterSocket`, `NodeTreeEditor`, `NodeSystem`, `NodeCard`, `ParameterRow`,
`SocketPort`, `NodeConnection` и compatibility alias отсутствуют.

### `NODES-UI-COMPONENT-ROOT-001` — one root, one Document

Application/Storybook создаёт ровно один `@zavx0z/react` root для всего Node
subtree. UI не создаёт `Document`, Canvas, Renderer, Space, Store значения или
parallel semantic tree. Один Core `Parameter` остаётся единственным value Store.

`NodeTree` читает cached immutable topology через
`createNodeTreeExternalStore()`. Каждый materialized `Parameter` подписывается
на exact `store.parameter(nodeId, parameterId)`. Value commit не remount-ит
surviving Node/Parameter/Field/Socket/Link и не запускает global layout.

### `NODES-UI-COMPONENT-STYLE-001` — governed CSS

Каждый public component имеет максимум один `style?: CssStyle`. Production
TSX использует один реальный `style={css\`...\`}` с owner defaults и последним
caller fragment. `sx`, class/className API, JS style objects/arrays,
`CSSProperties`, `defineStyles`, public CSS strings и runtime global запрещены.

## Semantic owners

### `NODES-UI-FRAME-001`

Core `parentFrameId` и Node `frameId` сохраняются как exact same-Document
relations. Projection не создаёт вторую Frame topology. Geometry может прийти
из exact `@nodes/layout` `LayoutResult`; metadata geometry разрешена только как
bounded fixture/default projection.

Paint law:

1. Frame backgrounds;
2. ordered Links;
3. Frame labels/foreground;
4. Nodes.

### `NODES-UI-NODE-001`

`Node` materialize-ит stable semantic `article` с:

- header `24px`, compact title/category and owner color;
- controlled selection shadow;
- controlled disclosure that hides body without replacing descendants;
- optional preview panel/image above the Node;
- loose right Sockets → Parameters → loose left Sockets;
- one public `Socket` for every endpoint.

Отсутствующий preview image не materialize-ит пустой `<img src="">` и не
создаёт network request.

### `NODES-UI-PARAMETER-001` — current Field classification

Node presentation policy, а не UI aliases, выбирает interaction:

- integer → `NumberField`, `step=1`; validation остаётся Core/Node-owned;
- boolean → `CheckboxField` либо `SwitchField`;
- enum/menu → `SelectField`, `CycleField` либо `OptionGroupField`;
- rotation → `VectorField` с Node-owned axes/units semantics;
- readonly/unknown JSON → semantic `<output>` composition;
- vector/matrix/color/path/reference/collection → exact current UI Field.

Удалённые `IntegerField`, `BooleanField`, `EnumField`, `RotationField`,
`ReadonlyField` не восстанавливаются. Connected Parameter скрывает editor через
standard `hidden`, сохраняя Parameter, Field label relation и Socket identity.

### `NODES-UI-SOCKET-001`

Socket inventory содержит exact 19 kinds и 8 shapes. `kind`, capability
`input|output|bidirectional`, visual `side=left|right` и shape независимы.
Ordinary endpoint имеет `10px` intrinsic geometry и `1px` outline. Loose row —
тот же public `Socket` с row presentation, не скрытый `SocketPort` owner.

### `NODES-UI-LINK-001`

Один Link — один keyed semantic `<vector-path>` без segment/hit children.

- ordinary width `2.2px`, selected `3.4px`;
- `pointer-hit-width: 16px`;
- Socket kind color;
- selected-last paint через stacking, без DOM reparent;
- transform/clip наследуются от общей scene;
- pan/zoom не меняют `d` или retained geometry;
- disabled opacity `.45` остаётся correctness fallback.

Orthogonal route сохраняет endpoints, прямые runs — `M/L`, corner — local cubic
radius `min(10, adjacentLength / 2)` и historical control `2/3` к corner.
Typed cubic chain передаётся как `M/C` без sampling в Nodes. Route ограничен
`256` non-degenerate commands и DOM coordinate bound
`VECTOR_PATH_COORDINATE_LIMIT = 16777216`.

Optional exact Link external-store read contract разрешён для caller-owned
selection/route projection; snapshot обязан быть stable между notifications.
Он не является копией Core graph/value state.

### `NODES-UI-EDITOR-001`

`NodeEditor` композирует один `NodeTree`, grid, controlled/uncontrolled
selection, fit, wheel pan, anchor-preserving zoom, pointer pan, two-pointer
pinch и viewport culling. Standard DOM events — единственный input API.

Transform меняет shared scene/grid transform. Surviving Node, Parameter, Field,
Socket и Link identities и Link geometry сохраняются. Link visible, когда
видим endpoint или route bounds пересекает viewport. Ancestor Frame сохраняется
для visible descendant.

`materializeCulled` является diagnostic/large-scene mode: semantic owners
остаются в DOM с standard `hidden`, а visible Renderer count отчётливо
отделяется от materialized count.

## Performance and evidence

### `NODES-UI-PERF-001` — distributions and identity

Каждый benchmark записывает p50/p95/p99, input-to-present, scheduler work,
DOM/state records, allocations/heap, post-GC retained memory, upload bytes,
draw counts, geometry invalidations and clean-frame reuse. p95 не маскирует
красный p99.

### `NODES-UI-PERF-NODES-001` — two honest dense scopes

`bun run bench:node-system` materialize-ит 1k/10k real Nodes, четыре Parameters,
два Sockets и полный Link chain. Отчёт отдельно содержит materialized и visible
counts.

`bun run bench:node-visible` запускает отдельный dense-visible cold scope, где
все Nodes/Links одновременно участвуют в Renderer evidence.

Текущая воспроизводимая evidence на этом checkout:

- 1k semantic/culling: `1000` materialized, `12` visible; value
  input-to-present p95/p99 `139.349/169.337ms`, transform
  `33.436/45.688ms`; identity/local mutation/zero Path uploads green;
- 10k semantic/culling: `10000` materialized, `12` visible; value
  p95/p99 `1401.059/1670.054ms`, transform `376.186/1922.756ms`;
  semantic retained heap about `2.592GB` (`250883 B/Node`);
- 1k dense-visible cold: `41052` boxes, `13511` display items,
  `5000` Rects, `999` Paths; mount/Renderer/backend
  `2.631s/3.409s/.860s`;
- 10k dense-visible cold: `410052` boxes, `135011` display items,
  `50000` Rects, `9999` Paths; mount/Renderer/backend
  `30.161s/41.215s/19.700s`; retained baseline about `4.978GB`.

Эти timings являются красным acceptance, не новым budget. Exact Node-owned
reproduction: `bench/node-system.ts`.

### `NODES-UI-PERF-LINKS-001`

`bun run bench:node-paths` materialize-ит exactly `512 / 2048 / 10000` Links.
Один shared Path draw, 15 historical sampled segments per Link, zero transform
uploads, bounded one-Link route/style writes, selected-last order and retained
identity обязательны.

Два повторных 100-sample 10k run сохраняют все invariants. Selection p99
повторяется в диапазоне `40.271–42.786ms` и превышает frame `16.667ms`;
transform p99 наблюдался `9.935–16.858ms`. Post-GC interaction delta
`9.03–9.22MB` (`~903–922 B/Link`) против предыдущей принятой evidence около
`6.8MB` (`~680 B/Link`). Поэтому R5 остаётся красным.

### `NODES-UI-BUNDLE-001`

Старый incomplete ceiling `245000 / 61000` не повышается автоматически.
`bun run bench:ui-bundle` обязан разделять root/exact/leaf builds и доказывать
отсутствие legacy/story/dev retention.

После отделения authored concrete Parameter modules текущий comparable exact
full NodeEditor build: `270750 raw / 68200 gzip`; root: `270679 / 68516`;
NodeTree: `262560 / 65708`; complete aggregate Parameter interaction graph:
`203065 / 49796`; Link: `121815 / 32945`. Root-vs-exact не объясняет дельту,
а unused concrete presentation/story templates отсутствуют в exact build.
Exact full path больше historical incomplete evidence на `+10.8% raw / +12.4%
gzip`; новый ceiling требует owner decision.

## Storybook and visual acceptance

Canonical declaration family сохраняет все `159` leaves, из них `145` —
`@nodes/ui`. Category/subject routes и `.storybook/overview-remap.json`
сохраняют historical route strings; obsolete implementation не сохраняется.

Exact live route `ui/node-editor/scene/default` обязан иметь current active
revision, ready/presented, empty diagnostics/console and non-black shared canvas.

Comparison route `ui/comparison/reference/default` использует:

- source viewport `1920×1200`, DPR `2`;
- exact source rect `x=498, y=558, width=228, height=385`;
- live viewport `228×385`, scale `1`;
- production `Node`/concrete Parameters, не derived raster/private Canvas.

Mechanical route/canvas evidence не является visual parity. Окончательный
equal-scale visual verdict остаётся за `zavx0z`.

## Known platform gates

Node-owned tests доказывают exact identity и local mutation, но current generic
pipeline не выполняет полную performance/lifecycle acceptance:

1. Local Parameter state change при 1k/10k materialized hidden owners приводит
   к full CPU Renderer traversal: expected ≤16.667ms, actual Renderer p95
   `135.158ms` / `1396.404ms`. Предполагаемый owner: `@zavx0z/renderer` dirty
   subtree/incremental layout-display projection.
2. Dense Link selection p99 повторяется `40.271–42.786ms` при зелёном p95;
   retained invariants и one draw green. Предполагаемый owner: Renderer
   display-order tail allocation.
3. 10k dense-visible component unmount не завершился за несколько минут active
   CPU и был остановлен после evidence. Предполагаемый owner:
   `@zavx0z/react`/Template component-range disposal complexity.
4. Compiled author composition через один authored Component child поддержана
   и проверена для `Frame → Node → concrete Parameter`. Прямая передача
   нескольких intrinsic children через component boundary отсутствует в first
   compiler profile; Node не добавляет nested root/imperative compatibility
   workaround. Предполагаемый owner оставшейся generic capability:
   `@zavx0z/template`.
5. Full component bundle превышает historical incomplete ceiling; threshold
   остаётся owner gate, а не silently raised test.

## Acceptance

1. Full typecheck and repository tests green, кроме явно красных performance/
   bundle owner gates.
2. Focused Core/Editor/Layout/Worker/UI/Link checks green.
3. Value update сохраняет Node/Parameter/Field/Socket/Link identities и меняет
   только exact Field state.
4. Transform сохраняет semantic identities, `d`, retained Path geometry and
   zero Path uploads.
5. 1k/10k semantic и dense-visible counts названы и доказаны раздельно.
6. 512/2048/10k Link report содержит p50/p95/p99, heap, uploads and draws.
7. External Storybook exact route ready, console zero, canvas non-black.
8. Equal-scale accepted reference показан рядом с live production Node; visual
   acceptance требует явного owner verdict.
