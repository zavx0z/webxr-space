# Требования @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` владеет reference-aligned компонентной библиотекой Node Editor.
Она отображает готовую projection и управляет view. Exact `node-editor`
solver-free; explicit `projection` адаптирует живой root `NodeTree` к
`@nodes/layout` и нейтральный Node renderer.

## Публичный словарь

1. Единственный публичный словарь:
   `NodeTree → Frame / Node → Parameter → Socket → Link`.
   Интерактивный компонент называется `NodeEditor`, read-only — `NodeCanvas`.
2. `Socket` является видимым input/output/bidirectional endpoint. `Link`
   соединяет exact sockets. Port/Edge остаются только терминами старого layout
   и не входят в новый component API.
3. `Frame` является отдельным visual owner вложенности. Node ссылается на него
   через `frameId`; обычная Node не может исполнять роль Frame.
4. `Parameter` является устойчивой identity внутри Node и владеет одним
   universal `Field`. `Socket` может ссылаться на Parameter через
   `parameterId`, но не владеет и не дублирует его Field.
5. У одного Parameter может быть один Socket слева, один справа либо оба
   одновременно. Это разные exact endpoints с разными IDs, относящиеся к одному
   Parameter.
6. Component API допускает только visual sides `left | right`. `direction`
   (`input | output | bidirectional`) является независимой capability и не
   выводится из стороны. Fixed/adaptive выбор стороны принадлежит layout.
7. Node также может содержать Properties, не являющиеся connection Parameter.
   `Fact`, `Card`, Port и Edge не являются сущностями новой библиотеки.

## Component contracts

1. `NodeEditor` и read-only `NodeCanvas` принимают независимые typed
   `FrameRenderer`, `NodeRenderer`, `ParameterRenderer`, `SocketRenderer`,
   `LinkRenderer` и готовую projection. Отдельный `PositionedNodeTree` остаётся
   component-level входом.
2. Renderer contracts сохраняют consumer fields и не импортируют старые
   `NodeSystemDocument`, Card model/layout/metrics, HUD, Hamiltonian или product
   code.
3. Projection adapter владеет intrinsic measurement и внутренним размещением
   Parameter. Он выполняет один typed local plan после точного measurement и
   передаёт `ParameterPlan` в NodeEditor; materialization не планирует тот же
   subtree повторно. В component-level `setTree` renderer может планировать
   локально. Socket type preset задаёт только имя типа, shape/color и endpoint
   presentation; default Field принадлежит Parameter.
4. Публичный Parameter contract называется только `Parameter`,
   `ParameterPlan`, `ParameterRenderer` и `ParameterRendererContext`. Имена
   для его визуальной строки или slot не входят в public API: это только
   приватная геометрия конкретного planner.
5. Node renderer делегирует каждый видимый Parameter ровно одному
   ParameterRenderer и не рисует его Field или label повторно. ParameterRenderer
   сохраняет exact Parameter identity, получает его ParameterPlan и собирает
   presentation из одного public `Field` и связанных Socket, не создавая value,
   callback или Field copy.
6. Consumer может зарегистрировать собственный Node/Parameter/Socket/Link
   renderer без изменения NodeEditor или central switch.
7. Поля внутри Node и standalone controls вызывают один renderer из
   `@ui/components`; node package не копирует field implementation.
8. `@nodes/ui` применяет upstream-контракты
   [Layout `LAYOUT-SLOT-001` и `LAYOUT-FLEX-001`](https://github.com/zavx0z/layout/blob/main/packages/core/requirements.md#semantic-child-slots)
   и [UI `UI-COMPOSITION-001`, `UI-COMPOSITION-003`, `UI-COMPOSITION-004`](https://github.com/zavx0z/ui/blob/main/ARCHITECTURE.md#ui-composition-law).
   Вся внутренняя композиция Node, Socket labels/default fields, catalog panels
   и storybook regions выполняется `flexRow`/`flexColumn` либо
   `flexRowCss`/`flexColumnCss` из `@layout/core`. Ручные UI-grid offsets запрещены.
9. Принятый compact preset использует intrinsic Field density. Parameter Field
   и его left/right Socket получают одну приватно спланированную local Flex
   композицию и вместе наследуют transform retained Node parent; renderer
   context не передаёт canvas scale.
10. Node UI собирает Parameter controls только из public `@ui/components`.
   HTML-подобные `@ui/elements` используются для chrome, а Node-specific
   direct drawing разрешён Socket, Link и внешней scene geometry; Node не
   реализует собственные IconButton, ControlGroup, picker или Field input.
11. Link сохраняет утверждённую ортогональную route geometry вместо кривой
   исходного интерфейса. Это исключение не меняет принятые законы thickness, colors,
   hover/selected/invalid states, exact Socket attachment и interaction.

## Node view presets

1. Первый catalog покрывает `boolean`, `float`, `integer`, `vector`, `rotation`,
   `color`, `string`, `menu`, `object`, `collection`, `image`, `material`,
   `texture`, `geometry`, `matrix`, `shader`, `bundle`, `closure`, `custom`.
2. Socket shapes: `circle`, `square`, `diamond`, `circle-dot`, `square-dot`,
   `diamond-dot`, `line`, `volume-grid`. Первые шесть являются обычными public
   принятыми display shapes; последние два сохраняют specialized source states.
3. Type color является presentation preset и может быть переопределён consumer.
   Link и связанные sockets одного типа получают одну color identity.
4. Unconnected Parameter может показать default Field независимо от того,
   находится его Socket слева, справа или с обеих сторон. Connected state не
   меняет Parameter identity.
5. Loose right-side Socket рисуются над Properties и Parameters, loose
   left-side Socket — под ними. Порядок является visual-side presentation и не
   выводит `direction` из стороны; Socket Parameter остаются на своей общей row.
6. Пропорции header, body, Parameter, controls и Socket, их padding и
   centers сверяются с точным принятым raster reference при сопоставимом масштабе.
   Fixture-specific offsets и свободный подбор размеров запрещены.
7. Node имеет мягкую симметричную тень со всех четырёх сторон. Обычная тень
   нейтральна; selection не меняет border, а окрашивает тень в прозрачный
   оттенок фактического header. Тень непрерывно наследует scale retained Node
   parent и не запускает отдельный blur-pass при pan/zoom.
8. Node header radius/collapse/selection не являются project divergence и
   сверяются с exact accepted capture и его provenance manifest.

## View и compositing

1. NodeEditor применяет upstream-контракты
   [Layout `LAYOUT-RETAINED-001`](https://github.com/zavx0z/layout/blob/main/packages/core/requirements.md#retained-ui-subtrees),
   [`LAYOUT-CLIP-001`](https://github.com/zavx0z/layout/blob/main/packages/core/requirements.md#clip-parity)
   и [UI `UI-COMPOSITION-002`, `UI-COMPOSITION-004`](https://github.com/zavx0z/ui/blob/main/ARCHITECTURE.md#ui-composition-law).
   Он поддерживает fit, pan, zoom, culling и selection независимо от
   конкретного renderer preset. NodeCanvas хранит один retained content-root:
   pan/zoom меняет только его engine position/scale, а Grid, Frame passes, Links
   и Nodes остаются устойчивыми children с локальной geometry.
2. Frame background рисуется под Links, его label/chrome и child Nodes — над
   Links. Link stroke доходит до exact Socket center.
3. Stroke, Socket, text, padding, radius и другие visual metrics являются
   intrinsic local geometry и непрерывно наследуют parent transform.
   Screen-visible minimum допустим только отдельному невидимому hit target.
4. Controlled selection и canvas transform сообщаются consumer callback-ами;
   скрытого product state нет.
5. Ручными координатами остаются только входная positioned Node geometry,
   exact Socket centers и Link route points. Это scene data, не layout children.
   Renderer может вернуть отдельный culling envelope для внешнего overlay,
   но ordinary Node presentation rect остаётся единственным body hit и не
   меняет positioned tree geometry.
6. NodeCanvas рисует intrinsic dot grid как retained child того же content-root.
   Linked Parameter определяется из `NodeTree.links`: его default control
   скрывается без дублирования connected state во входной модели.
7. Collapsed Node сохраняет exact Socket endpoints вокруг compact header;
   Frame может быть вложен в другой Frame.
8. Selection различает Frame, Node и Link. First-class Parameter renderer не
   добавляет новый selection kind: Parameter и Socket controls остаются
   интерактивным содержимым owning Node. Link получает hit corridors по готовым
   route segments; selected Link рисуется отдельным последним проходом поверх
   ordinary Links, но под Node.
9. Mobile NodeEditor использует тот же positioned tree и renderers. Один touch
   панорамирует canvas, два touch выполняют anchor-preserving pinch; единый
   responsive FlexBox flow, заданный CSS-style declarative form, скрывает
   catalog surfaces, но не создаёт отдельную mobile Node.
10. На overview-scale Node сохраняет структуру body через progressive LOD в тех
    же Flex rows; детали controls возвращаются после pinch без второй Node model.
11. Content viewport переводится через inverse `matrixWorld` единственного
    content-root для culling Frame, Link и Node. Те же retained parents владеют
    selection hits: invisible ancestor не принимает input, actual paint order
    определяет победивший target, а selected Link остаётся последним среди
    Links. Node container регистрируется перед внутренними controls, поэтому
    поздний control получает input первым. Frame выбирается только своей
    intrinsic header area высотой не более `36` local px; body не перекрывает
    Links и вложенные controls. Изменение hover/press/tooltip одного retained
    control materializes только owning component parent; siblings сохраняют
    identity, а чистый transform не становится interaction dirty.
12. Wheel и pinch получают local anchor через Surface↔content-root matrix
    conversion и меняют тот же retained root. Transform-only input обновляет
    culling, hit mapping и material clip, не увеличивая layout или
    materialization counters.
13. Node Preview является controlled Node capability, не Field и не Socket.
    Только previewable Node показывает right-header eye toggle; node flag
    сохраняется независимо от view-owned global Overlays/Previews. При обоих
    global flags и enabled node flag drawable image buffer рисуется отдельной
    extra-info panel над body: inset `3`, свой translucent TH_BACK/TH_NODE
    material, top corners и aspect-preserving image inset `3`. Missing/zero
    buffer не создаёт fake panel. Preview расширяет только renderer culling
    envelope; body size/hit, Socket centers, Links, topology и values не
    меняются. Несколько Node могут держать независимые enabled flags.

## Package boundary и удаление legacy

1. Старые Card model, Card layout/adapters, `NodeSystemSurface` и Card HUD
   удаляются без aliases, deprecated exports или compatibility bundles.
2. Прежний root `NodeSystem*` format удалён. Живой `@nodes/core` Parameter-store и
   `projection` являются единственным новым parent integration path;
   product consumers подключаются отдельно.
3. Package-level tests, Node UI stories и Editor integration story доказывают
   разные границы внутри одного Workbench и не подменяют друг друга.
4. Dev-only stories принадлежат `@nodes/ui` и живут в `storybook/`
   рядом с production owner. Они владеют metadata, fixtures, lazy modules,
   preview adapters и evidence. Repository Storybook владеет единственными
   entry, style, Router, canvas, `UiRuntime` и Workbench; owner prefix `/ui/`
   является веткой общего route tree, а не отдельной page или mount shell. Его
   exact lifecycle маршрутизирует один global `$storybook` target для
   `@nodes/storybook`. Общие routes, stories и Workbench импортируются только из
   точных subpaths `@zavx0z/storybook/*`.
   `storybook/` не входит в production exports, а `@zavx0z/storybook` не является
   production dependency `@nodes/ui`. Выбор Component
   сначала открывает его overview: `/ui/socket/` показывает все Socket types,
   `/ui/socket/boolean/` — все варианты Boolean, и только
   `/ui/socket/boolean/input` задаёт exact detail story. Каждый prefix overview
   имеет собственные aggregate preview и source внутри того же Workbench; он не
   подставляет первый detail descendant. Catalog показывает
   NodeEditor, Параметры, Сокеты, Frame, Link и Сравнение как самостоятельных
   semantic owners главной панели; disclosure-only группы не являются routes.
   `/ui/parameter/` является каноническим overview публичного Parameter API;
   его sections точно повторяют все public Field kinds, а каждый kind показывает
   `field | input | output | both | connected` без нового Parameter vocabulary. Для
   выбранного раздела `Сокеты` вторая панель перечисляет все concrete Socket
   type presets. На `/ui/socket/` ни один type не выбран, dock пуст, а center
   показывает все production Socket kinds. На `/ui/socket/boolean/` выбран
   Boolean, dock перечисляет `input | output | bidirectional`, но ни один detail
   ещё не выбран; center показывает все три направления. Exact leaf показывает
   один production detail preview, а правая панель хранит TypeScript/copy и
   controls/events того же presentation state. Story metadata и lazy implementation
   принадлежат package consumer и импортируют production через exact public
   subpath; общий Workbench не получает Node vocabulary. Standalone Fields
   принадлежат storybook `@ui/components`; Nodes catalog показывает те же
   controls только как принадлежащий Parameter `Field`.
   Comparison сохраняет maintained accepted screenshot и representative live
   Node; asset и Surface не экспортируются production package. Client-side
   смена route повторно применяет layout без fake resize или page reload.
5. NodeEditor detail stories имеют exact ordinary/selected variants отдельно
   для развёрнутой и свёрнутой production Node. Route, target Node id, args,
   controls, preview, source и `NodeEditor` selection образуют одно состояние;
   legacy default route остаётся ordinary expanded. Выбранное состояние не
   создаётся manual browser input и не подменяется Frame или Link selection.

## Evidence provenance

Точный источник, версия, revision, viewport, DPR, SHA-256 и owner acceptance
хранятся только в `../storybook/assets/references/catalog.json`. Production API,
routes и user-facing labels используют нейтральные имена.
