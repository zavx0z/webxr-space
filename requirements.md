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
immutable historical resource, но не namespace или production dependency.
Действующий cross-repository UI target — Blender 5.2 LTS. Exact official 5.2
Manual Noise Texture asset сохранён как
`.storybook/references/blender-5.2-noise-texture.webp` с SHA-256
`6d9dcb739e10bd4a82a1507deadae451fded7fec2ced50c54520d115b6d766f1`.
Он подтверждает отсутствие legacy `fBM` row и один filled contour для label +
numeric value. Asset остаётся candidate до equal-scale owner verdict; старый
4.5 full-window crop больше не классифицируется compatible для exact Noise
scope.

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
Published topology/view/geometry snapshots логически immutable. Exact additive
Node delta создаёт copy-on-write Node/Port geometry и node-id indexes, сохраняя
старые map identities и значения; internal cache не мутирует уже выданный
`useSyncExternalStore` snapshot.

### `NODES-UI-COMPONENT-STYLE-001` — governed CSS

Каждый public component имеет максимум один `style?: CssStyle`. Production
TSX использует один реальный `style={css\`...\`}` с owner defaults и последним
caller fragment. `sx`, class/className API, JS style objects/arrays,
`CSSProperties`, `defineStyles`, public CSS strings и runtime global запрещены.

## Semantic owners

### `NODES-UI-FRAME-001`

Core `parentFrameId` и Node `frameId` сохраняются как exact same-Document
relations. Projection не создаёт вторую Frame topology. Aggregate `NodeTree` /
`NodeEditor` всегда требуют completed `@nodes/layout` `LayoutResult`:

- `nodes` покрывают every Core Frame + Node id;
- `ports` покрывают every canonical `nodeId/socketId`;
- `edges` покрывают every Core Link id;
- edge start/end совпадают с exact source/target Port centers;
- missing/duplicate/mismatched geometry отклоняется до materialization.

Layout может заранее содержать extra geometry для revision-fenced следующей
topology; неиспользуемые entries не materialize-ятся. Production aggregate не
читает x/y/size/route из metadata и не строит index/default placement.
Direct authored `Frame`, `Node`, `Link` используют explicit `rect`/`route` props
и не являются aggregate fallback.

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
- `8px` vertical and zero horizontal body padding so endpoint centers attach to
  the Node contour while Fields own their row inset;
- `4px` body rhythm and `22px` compact Field contour for the exact 5.2 Node
  density;
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

Optional `spacingBefore: "small" | "medium"` remains Node presentation data.
The parent `Node` maps the bounded `4px`/`8px` rhythm onto the exact Parameter
root; it does not calculate coordinates, create a wrapper owner or move layout
into the component.

Node-owned row composition keeps full-width menus at a symmetric `12px` inset,
leading checkbox rows at `8px`, and labelled numeric rows with a left endpoint
at the contour plus `10px` right inset. These are parent/Parameter CSS flow
rules, not Field copies or manual coordinates.

Удалённые `IntegerField`, `BooleanField`, `EnumField`, `RotationField`,
`ReadonlyField` не восстанавливаются. Connected Parameter скрывает editor через
standard `hidden`, сохраняя Parameter, Field label relation и Socket identity.

### `NODES-UI-SOCKET-001`

Socket inventory содержит exact 19 kinds и 8 shapes. `kind`, capability
`input|output|bidirectional`, visual `side=left|right` и shape независимы.
Ordinary endpoint имеет `10px` intrinsic geometry, kind-color fill и `1px`
dark outline. Connected/selected остаются независимым state и не превращают
обычный unconnected endpoint в hollow circle. Loose row — тот же public
`Socket` с row presentation, не скрытый `SocketPort` owner.

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

Focused `--topology-only` evidence сохраняет тот же real 1k/10k mount и
initial Renderer/backend frame, но не выдаёт current heap за retained-memory
acceptance. Additive result обязан содержать Core-owned `append-node` delta,
одну topology notification, runtime mount count, равный exact `component:*`
markers внутри единственного added Node subtree, zero moves/disposes, retained
identities всех прежних Node/Link и exact Document mutation ledger.
Update/remove/bulk topology обязаны публиковать `full` и проходить общий точный
projection path.

Current append ledger состоит из diagnostic `data-node-count` attribute update
на NodeTree root и одной child-list вставки в Node layer: один hidden semantic
`article` плюс component-range comments. CSS, tests и consumers не используют
`data-node-count`; он остаётся обычной semantic diagnostic, а Renderer допускает
его fast path только через generic selector-dependency proof.

Текущая воспроизводимая evidence на этом checkout:

- linked Renderer `1cd32434ba8e0e5ad6422e50ec56e85cc18b645e` закрывает
  generic local input-value frame update;
- linked Renderer `5d5a06c14c2f8216cce6f5930695154f57524ea4` поверх него
  добавляет unchanged context-frame identity short-circuit;
- clean Renderer `a84672deb1573b1e16bffacf801877f1a3633628` является
  сохранённым до-оптимизационным topology baseline;
- Renderer `80ee4f56c45ce1e260e8f61e564c73bf26edaaa9` реализует generic
  selector-independent `data-*` + Comment/hidden-root retained-frame path;
  capability evidence зафиксирована в `21f263f36401f79c533917fd9b3fd8aa889fcf3d`;
- 1k semantic/culling на `1cd3243`: `1000` materialized, `12` visible;
  value input-to-present p95/p99 `3.974/7.210ms`, transform
  `14.985/18.843ms`; identity/local mutation/zero Path uploads green;
- 10k semantic/culling на `5d5a06c`: `10000` materialized, `12` visible;
  value p95/p99 `1.752/1.789ms`, transform `12.738/18.687ms`;
  semantic retained heap about `2.613GB` (`251194 B/Node`);
- focused exact append на clean `21f263f`: 1k commit `11.111ms` =
  Core/editor `3.222ms` + projection/component `7.889ms`, Renderer `0.086ms`,
  backend `0.212ms`, input-to-present `11.409ms`; 10k commit `72.838ms` =
  `28.235ms` + `44.603ms`, Renderer `0.136ms`, backend `0.238ms`,
  input-to-present `73.212ms`;
- повторный clean 10k run сохраняет topology input-to-present `88.098ms`
  при commit `87.792ms` и Renderer/backend `0.095/0.211ms`; оба 10k topology
  run проходят `100ms` budget;
- Renderer `0cb7256277d5ff9c013766c371a109ab43a7c100` исключает
  non-projected `display:none` branches из retained transform traversal;
  capability evidence зафиксирована в `65ec24a0f6c4c5e3e29b6b6b37207bf8f64a5fb0`;
- три accepted 100-sample 10k process на clean `65ec24a` дают transform
  input-to-present p95 `7.369–9.684ms`, p99 `9.251–11.396ms`, max
  `12.550–17.059ms`; correctness, identity, zero entity mutation/upload и
  один shared transform сохраняются, а общий benchmark проходит;
- historical focused runs публиковали `append-node`, одну notification,
  `32` mounts / `35` renders / zero moves/disposes. Final 5.2 subtree содержит
  `33` component mounts; benchmark теперь сверяет runtime mount count с exact
  `component:*` markers внутри единственного added Node subtree вместо stale
  magic number. Exact two-record mutation batch и identities всех прежних
  Node/Link сохраняются;
- final 5.2 focused 1k/10k append даёт `12.201/64.596ms` commit и
  `12.498/64.902ms` input-to-present, проходит `50/100ms`, сохраняет одну
  notification, exact `33` markers/mounts, `36` renders и zero moves/disposes;
- final 5.2 1k dense-visible cold: `41055` boxes, `13511` display items,
  `5000` Rects, `999` Paths; mount/Renderer/backend
  `2.205–2.473s/3.476–3.974s/.736–.979s`, retained baseline
  `566435021–566625377` bytes and all `35003` component instances disposed in
  `90.694–100.662ms`;
- final 5.2 10k dense-visible cold: `410055` boxes, `135011` display items,
  `50000` Rects, `9999` Paths; mount/Renderer/backend
  `20.992–22.654s/48.152–52.970s/21.348–24.914s`, retained baseline
  `5171008087–5171371966` bytes;
- accepted retained regression ceilings are `600000000` bytes at 1k and
  `5400000000` bytes at 10k. The benchmark publishes `memory.pass` and exits
  nonzero on a regression; these ceilings are capacity guards, not optimization
  targets;
- final 10k disposal is bounded at `3.211–5.969s`: backend
  `330.116–458.444ms`, component unmount `2.837–5.448s`, tree
  `41.104–60.747ms`, all `350003` mounted component instances disposed. Backend
  `a5c9f3e` removes the former quadratic per-entry Engine root scan; capability
  evidence is `99ce784`.

Topology timings проходят существующий budget и не заменяют остальные красные
R5 gates. Exact Node-owned reproduction: `bench/node-system.ts`.

### `NODES-UI-PERF-LINKS-001`

`bun run bench:node-paths` materialize-ит exactly `512 / 2048 / 10000` Links.
Один shared Path draw, 15 historical sampled segments per Link, zero transform
uploads, bounded one-Link route/style writes, selected-last order and retained
identity обязательны.

Три fresh 100-sample 10k run на `be37431 + 65ec24a` сохраняют все invariants.
Selection input-to-present p99 `7.111–8.146ms`, transform p99
`2.179–2.592ms`, route p99 `.689–.890ms`. После исключения временных benchmark
geometry/identity Maps из retained lifetime post-GC interaction delta составляет
`6.527–6.596MB` (`652.7–659.6 B/Link`) — на `3.0–4.0%` ниже предыдущей принятой
evidence `6.8MB` (`680 B/Link`). Link timing и retained-memory subgates закрыты.

### `NODES-UI-BUNDLE-001`

Старый incomplete ceiling `245000 / 61000` не повышается автоматически.
`bun run bench:ui-bundle` обязан разделять root/exact/leaf builds и доказывать
отсутствие legacy/story/dev retention.

После exact Blender 5.2 component slice текущий comparable exact full
NodeEditor build: `278365 raw / 70095 gzip`; root: `278294 / 70398`; NodeTree:
`270229 / 67599`; complete aggregate Parameter interaction graph:
`205339 / 50489`; Link: `122451 / 33074`. Root-vs-exact не объясняет дельту,
а unused concrete presentation/story templates отсутствуют в exact build.
Exact full path больше historical incomplete evidence на `+13.944% raw /
+15.554% gzip`.

Replacement ceiling `285000 / 72000` принят для exact fully-component
NodeEditor и исполняется обычным repository test. Он оставляет только
`6635 raw / 1905 gzip` (`2.38% / 2.72%`) запаса и не является общим резервом
для новых owners. Historical `244300 / 60660` остаётся сравнением удалённой
imperative/incomplete модели, а не скрытым обязательством удалить component
runtime или функциональность.

Exact metafile ownership: `@zavx0z/dom 72998`, `@nodes/ui 64896`,
`@ui/components 64069`, `@zavx0z/react 36258`, `@nodes/core 34097`,
`@zavx0z/template 5355`, fixture `626` raw bytes. Крупнейшие inputs — compiled
React runtime `34183`, Parameter projection `18080`, Core NodeTree `17867`,
NodeTree UI `13645`, Foundation `13565` и semantic Document `13383`.
Story/dev retention и root/subpath alias отсутствуют; private profiler code в
production graph не попадает.

## Storybook and visual acceptance

Canonical declaration family сохраняет все `159` leaves, из них `145` —
`@nodes/ui`. Category/subject routes и `.storybook/overview-remap.json`
сохраняют historical route strings; obsolete implementation не сохраняется.

Exact live route `ui/node-editor/scene/default` обязан иметь current active
revision, ready/presented, empty diagnostics/console and non-black shared canvas.

Comparison route `ui/comparison/reference/default` использует:

- official 5.2 source asset `192×328`, DPR `1`;
- exact source rect `x=0, y=0, width=192, height=328`;
- live viewport `192×328`, scale `1`;
- production `Node`/concrete Parameters, не derived raster/private Canvas.

Mechanical route/canvas evidence не является visual parity. Окончательный
equal-scale visual verdict остаётся за `zavx0z`.

Current Node-owned 4.5 compatibility slice на Storybook revision
`6f658a4daf7149e42718cfe1` исправляет exact Noise content и composition:
right-side `Fac/Color` outputs, отсутствие category, full-width menu rows,
Checkbox-before-label Normalize, 228px authored width, 2px body rhythm,
right Socket attachment без unsupported `row-reverse` и поддерживаемый header
chevron. Exact comparison capture `capture_1jaGm1KQ5hc8k1WDxD2Ly39T`, sha256
`923ed85e2b079c40e6c4cd79a71c5fd6f383e7fe5863285667f71bf86b4f1bf9`,
имеет empty diagnostics/console.

Final 5.2 candidate slice использует official Manual asset, UI owners
`f34b52c` / `f224951` / `5c35145` и Node production commits
`d1cb287` / `a85e4c3` / `11ce295` / `5db53d9` / `51f57a9` / `af514b7`.
На external Storybook revision `1a3ad15e74d2400c585c626a`, graph
`88fc2fa7ad3be10b5f16de28ab4edbaddcf519efc23113ef7e9c8557fd2ae613`:

- exact comparison route ready/presented, empty diagnostics/console; capture
  `capture_z3vy06EOn_ArstR0eIkwnkwz`, sha256
  `643cebce34e66814e7ae50d649bf487bbd8705db00ca77d98e37c073d55dda2e`;
- full `ui/node-editor/scene/default` ready/presented, empty
  diagnostics/console; capture `capture_x2dSxUXvxuLw5krh3GDX9pMa`, sha256
  `4b79ba7b8982d7e856f496960140559b72973271d61095506237fa4ab0143e7b`.

Node contour, composition, grouping, insets, solid Socket geometry, values and
material roles now align at equal scale. Remaining visible mismatch is the
collapsed native `select` disclosure indicator: Renderer emits `▾`, while the
Engine font paints a damaged vertical glyph. Expected is the 5.2 downward
chevron; actual is the captured fallback glyph. This is a generic
Renderer/Engine-font gap, not authorization for a Node/UI-local indicator.
Therefore the exact artifact remains `candidate` until that owner gap and the
explicit `zavx0z` visual verdict are closed.

## Known platform gates

Node-owned tests доказывают exact identity и local mutation, но current generic
pipeline не выполняет полную performance/lifecycle acceptance:

1. Local Parameter value path теперь green благодаря Renderer `1cd3243`:
   1k/10k input-to-present p99 `7.210/1.789ms`. Это закрытая generic gap,
   не Node-local workaround.
2. Transform закрыт на clean Renderer `65ec24a`: три fresh 100-sample 10k
   process дали p95 `7.369–9.684ms`, p99 `9.251 / 11.396 / 9.357ms` и
   отдельно max `12.550–17.059ms` против frame budget `16.667ms`.
3. Additive topology закрыта на clean Renderer `21f263f`: 1k/10k
   input-to-present `11.409/73.212ms`, повторный 10k `88.098ms`, против
   `50/100ms`. Exact mutation ledger остаётся diagnostic `data-node-count`
   attribute плюс hidden Node child-list; старые Node/Link identities сохранены.
4. Dense Link selection и retained interaction memory закрыты: три 10k process
   дали selection p99 `7.111–8.146ms` и `652.7–659.6 B/Link`, сохранив one draw,
   exact uploads, geometry и semantic identities.
5. Dense-visible lifecycle и retained capacity закрыты executable benchmark:
   final 1k/10k baselines `566435021–566625377 /
   5171008087–5171371966` bytes проходят ceilings
   `600000000 / 5400000000`, а final 10k disposal освобождает все `350003`
   component instances за `3.211s`.
6. Exact official 5.2 Noise asset подтверждает один full-width compact filled
   contour для Scale/Detail/Roughness/Lacunarity/Distortion и отсутствие legacy
   `fBM` row. UI owner `f34b52c` исправляет optional labelled `NumberField`;
   Node использует этот public owner без local Field CSS/copy. Equal-scale
   visual verdict остаётся отдельным owner gate.
7. Compiled author composition через один authored Component child поддержана
   и проверена для `Frame → Node → concrete Parameter`. Прямая передача
   нескольких intrinsic children через component boundary отсутствует в first
   compiler profile; Node не добавляет nested root/imperative compatibility
   workaround. Предполагаемый owner оставшейся generic capability:
   `@zavx0z/template`.
8. Full component bundle закрыт replacement ceiling `285000 / 72000`: current
   exact `278365 / 70095` проходит executable repository test. Historical
   incomplete evidence остаётся видимой в benchmark report.

## Acceptance

1. Full typecheck and repository tests green, кроме явно незакрытых owner
   acceptance gates.
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
