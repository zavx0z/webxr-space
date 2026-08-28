# Требования @nodes/core

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

Этот документ владеет живым runtime-контрактом универсального нодового графа и
получением его производных представлений. Алгоритмические законы расположения
принадлежат [`@nodes/layout`](../layout/README.md), а WebGPU view и renderer
contracts — [`@nodes/ui`](../ui/requirements.md).

## Сущности и identity

1. Единственный runtime-словарь:
   `NodeTree → Frame / Node → Parameter → Socket → Link`.
2. `Frame` является отдельным владельцем визуальной вложенности. Node ссылается
   на него и не исполняет роль Frame.
3. `Parameter` является устойчивой identity строки Node и Store одного значения.
   `Socket` может ссылаться на Parameter, но не хранит и не дублирует его value.
4. Link соединяет два exact Socket по `nodeId + socketId`. Capability
   `input | output | bidirectional` не выводится из visual side.
5. ID Frame и Node уникальны во всём дереве; Parameter и Socket уникальны внутри
   owning Node; Link уникален в дереве. Неизвестные ссылки, циклические Frame и
   несовместимые endpoints отклоняются до проекции.
6. Topology является живой, но не изменяется через выданные массивы. Одно
   структурное изменение проходит через атомарный reconcile конечного
   состояния.

## Parameter как Store

1. `Parameter.value` является единственным текущим значением Parameter.
2. `Parameter.set(value)` изменяет значение атомарно, увеличивает revision и
   уведомляет подписчиков только при фактическом изменении.
3. `NodeTree` подписывается на принадлежащие ему Parameter и публикует одно
   типизированное change-событие с новой revision дерева.
4. Field renderer читает `Parameter.value`, а пользовательское изменение
   вызывает тот же `Parameter.set`. Отдельные `Record`, callback-owned copies и
   скрытый Store внутри NodeEditor запрещены.
5. Значение и presentation metadata должны иметь чистую snapshot-проекцию.
   Методы, subscriptions, closures и callbacks в snapshot не попадают.

## NodeTree и snapshot

1. Живой `NodeTree` владеет topology, Parameter subscriptions, общей revision и
   topologyRevision.
2. `snapshot()` возвращает новый JSON-compatible снимок сущностей и значений.
   Изменение снимка не меняет runtime, а runtime methods в снимке отсутствуют.
3. `NodeTree` существует без canvas, Engine и browser. Закрытие NodeEditor не
   уничтожает граф или значения Parameter.
4. Один `NodeTree` может одновременно обслуживать несколько независимых view.
   Selection, pan, zoom, hover, viewport и overlay state не являются состоянием
   графа.
5. `getSnapshot()` возвращает одну и ту же frozen identity до следующего
   committed revision, а `createNodeTreeExternalStore()` возвращает стабильную
   callback-only пару `subscribe/getSnapshot`, совместимую с
   `useSyncExternalStore`. Это adapter к тому же NodeTree, не второй
   snapshot/store. Snapshot/document/generation capture фиксирует начальные
   revision и topologyRevision, повторяется при синхронном reentrant изменении
   и fail closed после 25 попыток, поэтому mixed generation не кэшируется.
6. External-store adapter дополнительно даёт topology-only subscription и
   стабильный per-Parameter `subscribe/getSnapshot`. Value commit уведомляет
   только exact Parameter consumer; topology snapshot не становится вторым
   Store. Exact append delta структурно переиспользует прежние immutable Node
   snapshots и добавляет один новый; любой другой topology delta идёт через
   полный snapshot fallback.

## Универсальная структура, типы и инстансы

1. Semantic `GraphScope` отделён от визуального `Frame`: root graph и nested
   subgraph образуют ацикличную scope ancestry. `NodeGroup` образует отдельную
   ацикличную grouping hierarchy внутри exact scope. Frame и Node могут
   ссылаться на scope/group, но эти сущности не подменяют друг друга.
   Definitions с foundation fields создаются через `createNodeTree()`, который
   удерживает ту же validation policy для каждого последующего reconcile;
   прямой constructor fail closed, а package-private policy token нельзя
   передать или подделать через public `NodeTree` API.
2. `NodeTemplate` имеет exact `(id, version, kind)`. Node и subgraph scope могут
   хранить `NodeInstanceReference`; `(instance id, local id)` Node уникален, а
   ссылка на неизвестную или неверного kind template отклоняется.
   `instantiateNodeTemplate()` и `instantiateGraphTemplate()` создают frozen
   deeply-owned instance descriptors и не клонируют переданные Parameter Stores.
   Автоматическое раскрытие произвольной template topology не скрывается внутри
   NodeTree.
   Один document содержит одну active version каждого template id; совместное
   хранение нескольких версий требует разных template id либо явной миграции.
3. `NodeValueType` — serializable `(id, version)`. Typed Socket, связанный с
   Parameter, обязан иметь тот же type. Link с одним typed и одним untyped
   endpoint запрещён. По умолчанию два typed endpoint совместимы только при
   exact equality; явная pure compatibility policy может расширить это правило.
   Parameter generic сохраняет compile-time value type. Для runtime schema
   consumer передаёт `validateParameterValue`; его `false` отклоняет definition
   до commit. `createValidatedParameter()` сохраняет ту же pure policy внутри
   единственного Parameter Store для всех последующих `set()`; hydration
   создаёт такой Store автоматически при переданной policy. Без registry
   `(id, version)` остаётся номинальной переносимой
   identity и не притворяется встроенным schema language.
4. `cyclePolicy: "acyclic"` проверяет directed Node graph целиком до commit;
   default `"allow"` сохраняет general cyclic dataflow. Frame, Scope и Group
   ancestry циклы запрещены независимо от graph cycle policy.

## Живая topology и authoring document

1. `definition()` возвращает текущую runtime-структуру с живыми Parameter, а
   `document()` — отдельный JSON-compatible authoring document без методов и
   вычисляемых revisions.
2. Authoring document адресует Frame, Node, Parameter, Socket и Link по
   устойчивым ID через `byId`; явные `order` сохраняют порядок отображения.
   Entity paths не зависят от позиции сущности в массивном snapshot.
3. `reconcile({expectedRevision, definition})` сначала целиком копирует и
   проверяет конечную структуру и только затем одним commit заменяет topology.
4. Устаревшая revision, невалидное конечное состояние и ошибка подготовки не
   меняют runtime, revisions, subscriptions или projection cache.
5. Одно фактическое structural изменение увеличивает `revision` и
   `topologyRevision` ровно на один и публикует ровно одно topology-событие.
   Полный no-op не создаёт revision или событие.
6. Сохранившийся `(nodeId, parameterId)` сохраняет exact Parameter object.
   Подмена его другим Store отклоняется. Добавленный Parameter подписывается,
   удалённый отписывается и после удаления остаётся самостоятельным Store у
   внешнего владельца.
7. Ошибки listeners сообщаются после commit и не откатывают уже принятое
   состояние; каждый listener всё равно получает возможность увидеть целый
   результат. Change и delta одной revision образуют одну publication record;
   reentrant commits ставятся после неё, поэтому ни один канал не наблюдает
   revision N+1 раньше revision N.
8. Exact `@nodes/core/json-patch` применяет `add | remove | replace | test` к
   отдельной JSON-копии и возвращает только полностью применённый результат.
   Pointer parsing не проходит через prototype chain, а операции, path depth и
   array indexes имеют конечные проверяемые границы.
9. Projector получает согласованный generation view точной revision. Изменение
   живого дерева во время асинхронной работы не подменяет topology, с которой
   был начат расчёт; устаревший итог по-прежнему отклоняется.
10. У созданного через `createNodeTree()` runtime `subscribeDelta()` публикует
    один frozen detailed topology delta после одного reconcile:
    added/removed/updated Scope/Group/Template/Frame/Node/Parameter/Socket/Link
    addresses. Nested Parameter/Socket address содержит owning nodeId, Template
    address использует canonical document id. Legacy constructor сохраняет
    revision-only topology delta с пустыми address-массивами ради прежнего
    browser bundle budget. Parameter delta в обоих профилях совпадает с exact
    committed Parameter event. Delta является производной нотификацией и не
    становится вторым деревом.
11. Exact single-append `reconcile({expectedRevision, definition})` является
    additive fast path того же canonical NodeTree. Он owns и валидирует новый Node против существующих
    Scope/Group/Frame/Template, cached Node/Parameter/instance indexes и
    retained foundation policy; новые Parameter subscriptions готовятся до
    revision recheck. Commit добавляет Node ровно один раз и публикует exact
    Node/Parameter/Socket delta. Duplicate identity, invalid candidate,
    subscription failure или stale revision не меняют topology. Cached indexes
    являются revision-fenced производными от canonical arrays, а не вторым
    деревом.

## Serialization и versioning

1. Legacy document без foundation fields сохраняет `formatVersion: 1`.
   Scope/group/template/instance/value-type fields требуют `formatVersion: 2`.
2. `hydrateNodeTree()` принимает только exact versions `1 | 2`, проверяет
   complete `order ↔ byId`, создаёт новые canonical Parameter stores и затем
   проходит полную NodeTree validation. Неизвестная версия и v2 fields под
   меткой v1 отклоняются. Каждая entity имеет exact required/optional members;
   неизвестные поля, primitive entity payload и JSON глубже 128 отклоняются без
   silent normalization.
3. `serializeNodeTreeDocument()` переносит только JSON authoring document;
   runtime listeners, projection cache, view state и Store identity не
   сериализуются. Hydration намеренно создаёт новую Parameter identity.
4. Foundation specialization не добавляет runtime-class discriminator в JSON:
   единственный serialization discriminator — canonical `formatVersion`.
   Hydration вновь создаёт тот же один NodeTree owner с общей revision/delta и
   additive reconcile law, а не соседний runtime state.

## Projection

1. `tree.project(projector, request)` является единым входом получения
   производного представления. Конкретные измерения приходят от projector;
   `NodeTree` не содержит методов `measureNode` и не зависит от renderer.
2. Request явно задаёт всё, что может изменить результат: точный viewport,
   renderer identity, font/theme/density и layout policy либо их устойчивый key.
3. Intrinsic measurement содержит размеры Node, нижнюю границу собственного
   content и local offsets exact Socket. Он не содержит глобальных координат.
4. Positioned result содержит rect Frame/Node, resolved side и center Socket,
   points Link и bounds точного view.
5. Local render plan строится один раз после получения окончательного rect и
   затем передаётся Node renderer для materialization. NodeEditor не повторяет
   measurement или plan той же projection revision.
6. Projector не записывает размеры, стороны или coordinates обратно в
   канонические entities.

## Кэш и invalidation

1. Кэш проекции различает как минимум measurement key, layout key и plan key.
2. Тот же projector/request на той же применимой revision возвращает тот же
   результат без нового measurement, layout и plan.
3. Value-only изменение, не влияющее на intrinsic geometry, не меняет layout
   key и не запускает solver повторно.
4. Изменение label, состава Field/Parameter/Socket, font/theme/density либо
   intrinsic presentation перемеряет только затронутую Node; изменение topology
   или viewport пересчитывает layout.
5. Pan/zoom меняет только transform конкретного view. Оно не увеличивает
   measurement, layout или plan counters.
6. Асинхронный результат применяется только к generation дерева и request, для
   которых был запущен; устаревший результат отклоняется.

## Package boundary

1. Runtime entities, snapshot и generic projection contracts не импортируют
   другие `@nodes/*`, `@ui/*`, Engine, DOM или product vocabulary.
2. `@nodes/layout` получает только минимальный numeric structured-clone graph.
3. Application adapter может переводить public runtime contracts `@nodes/core`
   в готовые standard-DOM graph props; `@nodes/ui` не импортирует Core или solver.
4. Reference-aligned Field binding принадлежит UI adapter: root Parameter хранит value и
   renderer-neutral metadata, но не `FieldDefinition` callbacks.
5. Legacy `NodeSystem*`, Port/Edge contracts и compatibility aliases не
   сохраняются.

## Package-owned dev stories

1. Dev-only stories, fixtures и lazy story modules, которые объясняют
   семантику `@nodes/core`, принадлежат каталогу `./storybook` рядом с Core.
2. Repository Storybook подключает эти файлы в один общий Workbench, но Core не
   владеет отдельным entrypoint, shell, runtime, server, process, port, static
   build или Pages lifecycle.
3. `./storybook` не входит в production exports и не добавляет Storybook, DOM,
   UI или Engine в runtime dependencies `@nodes/core`. Примеры импортируют
   production Core и общую инфраструктуру только через их exact public
   subpaths.
