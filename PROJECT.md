# Visual monorepo

Этот файл является основанием новой сборки visual monorepo. Он описывает
конечную архитектуру, точные исходные владельцы и порядок перехода без потери
существующей логики.

## Исходное состояние

Работа начинается заново от живых канонических репозиториев. Удалённая оболочка
предыдущей попытки не восстанавливается.

| Владелец | Путь | Принятый исходный коммит |
| --- | --- | --- |
| Engine | `projects/engine` | `a3032d960fc592296e8c5d1408a02551635d1fb3` |
| UI | `projects/ui` | `90c77080c27d92fea5ee803e8ff1e49d65885ae1` |
| Node | `projects/node` | `6aef6ab1fc038f2fbbf752746d3f328d93ad63e8` |
| Renderer | `/Users/zavx0z/repozitarium/renderer` | `e428e64003efdbc3e627d85431532abde0aed350` |
| Template | `/Users/zavx0z/repozitarium/template` | `671d19f652b2899b77bd30e50e9fd254080ef93f` |

`projects/` хранит исходные репозитории Engine, UI и Node и не является частью
будущего рабочего пространства. Renderer и Template пока остаются в своих
канонических соседних checkout. Highlighter и внешний Storybook сохраняют
самостоятельных владельцев и не импортируются как пакеты visual monorepo.

## Неподвижные архитектурные законы

1. Один расширенный semantic `Document` является единственным каноническим
   визуальным графом.
2. `Space` является сценой этого Document.
3. `ViewPoint`, `Mesh`, `Geometry`, `Material`, `Display`, `HUD`, UI и Node
   находятся в том же Document.
4. Engine, Object3D, раскладка, список рисования, области попадания и WebGPU
   являются только производными проекциями semantic nodes.
5. Один Experience владеет одним Document, Canvas, Renderer, Space, ViewPoint,
   вводом и циклом кадров.
6. `Display` и `HUD` являются равноправными целями одного Space. Один и тот же
   subtree переносится между ними без замены semantic identity, состояния
   компонентов, listeners, focus и retained resources.
7. Удобство авторства должно быть сравнимо с R3F, но без Fiber, VDOM, второго
   публичного scene graph, reflective catalog и строкового `attach`.
8. UI и Node не создают собственные Canvas, Document, Renderer, parser, event
   system, ручную раскладку или другой обход отсутствующей возможности
   платформы.
9. Каждый пакет в каждый момент имеет ровно одного изменяемого владельца.
10. Корневой пакет monorepo никогда не является производственной зависимостью.

## Конечный состав

Каждый самостоятельный производственный пакет находится непосредственно в
корне. Имя каталога совпадает с простым именем пакета. Используется единый scope
`@zavx0z`, составные имена с дефисом не создаются.

```text
engine/
dom/
template/
component/
renderer/
webgpu/
browser/
space/
ui/
graph/
layout/
nodes/
```

| Каталог | Пакет | Ответственность |
| --- | --- | --- |
| `engine/` | `@zavx0z/engine` | retained scene objects, geometry, materials и GPU resources |
| `dom/` | `@zavx0z/dom` | Document, semantic nodes, attributes и events |
| `template/` | `@zavx0z/template` | compiler, JSX lowering и compiled ABI |
| `component/` | `@zavx0z/component` | component identity, state, hooks, context и lifecycle |
| `renderer/` | `@zavx0z/renderer` | CSS, layout, display list, hit projection и scrolling |
| `webgpu/` | `@zavx0z/webgpu` | перевод Renderer frame в retained Engine/WebGPU state |
| `browser/` | `@zavx0z/browser` | Canvas, input и общий frame lifecycle одного Experience |
| `space/` | `@zavx0z/space` | spatial semantic elements и Components |
| `ui/` | `@zavx0z/ui` | target-neutral UI Components и theme |
| `graph/` | `@zavx0z/graph` | NodeTree model, Parameter stores и headless editing |
| `layout/` | `@zavx0z/layout` | чистые graph/space placement algorithms и worker execution |
| `nodes/` | `@zavx0z/nodes` | NodeTree, NodeEditor, Frame, Node, Parameter, Socket и Link Components |

DOM inspector из прежнего `@zavx0z/dom-devtools` не входит в обязательный
производственный состав. Его код остаётся в исходном Renderer до появления
реального потребителя и отдельного решения.

## Направление зависимостей

```text
dom ← template ← component

dom ← renderer ← webgpu ← browser
                  ↑         ↑
                engine ─────┘

dom + component + template ← space
dom + component + template ← ui

graph ← layout
graph + layout + ui + dom + component + template ← nodes
```

`renderer` владеет CSS layout. `layout` не дублирует его: он содержит только
чистые алгоритмы размещения graph и пространственных целей. `engine` не зависит
от UI, Node или product semantics.

## Соответствие прежних владельцев

| Прежний пакет | Новый владелец | Что должно сохраниться |
| --- | --- | --- |
| `@engine/core` | `@zavx0z/engine` | все scene objects, geometry, materials, text, paths, resources и измерения |
| `@zavx0z/dom` | `@zavx0z/dom` | весь semantic DOM, events, state и standard element behavior |
| `@zavx0z/template` | `@zavx0z/template` | parser, compiler, CSS lowering, diagnostics и compiled ABI |
| `@zavx0z/react` | `@zavx0z/component` | существующие hooks, identity, scheduling, effects и cleanup без React runtime |
| `@zavx0z/renderer` | `@zavx0z/renderer` | cascade, CSS, layout, display, hit, input state и incremental frame behavior |
| `@zavx0z/renderer-webgpu` | `@zavx0z/webgpu` | все retained backend paths, uploads, batching и cleanup |
| `@zavx0z/renderer-browser` | `@zavx0z/browser` | one-Experience host, planes, overlays, input и frame lifecycle |
| `@ui/components` | `@zavx0z/ui` | все public Components, theme, icons, interactions и Storybook routes |
| `@nodes/core` | `@zavx0z/graph` | NodeTree identity, Parameter stores, subscriptions и snapshots |
| `@nodes/editor` | `@zavx0z/graph` | все headless editing commands и JSON Patch behavior |
| `@nodes/layout` | `@zavx0z/layout` | fixed/adaptive/top-down/Coffman–Graham algorithms и их exact results |
| `@nodes/worker` | `@zavx0z/layout` | worker protocol, clients, executors и cleanup |
| `@nodes/ui` | `@zavx0z/nodes` | полный принятый компонентный Node UI и R1–R5 behavior |

Ни одна строка этой таблицы не означает переписывание с нуля. Сначала прежняя
реализация переносится целиком и доказывает прежнее поведение. Очистка и новая
архитектура начинаются только после этого.

## Что запрещено во время переноса

- одновременно переносить файлы, менять имена, объединять пакеты и менять
  поведение;
- писать приблизительную замену вместо переноса существующей логики;
- удалять старый public export, test, story или interaction без явного решения;
- оставлять две изменяемые реализации одного владельца;
- добавлять compatibility aliases и двустороннюю синхронизацию;
- считать зелёные unit tests доказательством визуального или
  производительного равенства;
- удалять исходные репозитории после переключения владельца;
- выполнять push без отдельного указания.

## Порядок миграции

### Этап 0. Чистый корень

- удалить прежнюю неудачную оболочку;
- сохранить только этот документ, минимальные корневые настройки и `projects/`;
- не импортировать код до утверждения исходных коммитов и таблицы соответствия.

Результат: понятный корень без пустых каталогов, старых заготовок и второй
копии production source.

### Этап 1. Проверяемый исходный эталон

Для каждого прежнего пакета зафиксировать на принятом исходном коммите:

- полный список файлов и их hashes;
- публичные exports и package dependencies;
- прямых production consumers;
- тесты и точные команды проверки;
- Storybook routes и interaction scenarios;
- визуальные эталоны;
- показатели времени, памяти, uploads и draw calls там, где они существенны.

Каждый старый элемент получает новый owner либо явный статус `не перенесён`.
Неучтённого удаления быть не может.

### Этап 2. Перенос неизменённой истории

Пакеты переносятся по одному в порядке зависимостей:

1. Engine и DOM как два независимых основания.
2. Template после DOM.
3. Component runtime после DOM и Template.
4. CPU Renderer после DOM.
5. WebGPU projection после Renderer и Engine.
6. Browser Experience host после DOM, Renderer, WebGPU и Engine.
7. UI Components после DOM, Template и Component runtime.
8. Graph model и editor как headless-слой.
9. Layout algorithms и worker после принятия его чистого входного контракта.
10. Node Components после Graph, Layout, UI, DOM, Template и Component runtime.

Для каждого пакета:

1. извлечь history точного source prefix без squash;
2. поместить дерево в назначенный корневой каталог без правки содержимого;
3. доказать совпадение дерева с исходным коммитом;
4. запустить исходные проверки в source checkout;
5. настроить только необходимые пути нового рабочего пространства;
6. запустить те же проверки из нового каталога;
7. зафиксировать отдельный коммит переноса;
8. оставить source checkout без изменений.

### Этап 3. Простые имена пакетов

После доказанного переноса имена меняются по одному. Один коммит содержит только:

- новое имя одного владельца;
- все его прямые imports;
- TypeScript и workspace mappings;
- Storybook declaration identity;
- проверку отсутствия старого имени.

Поведение и физический состав пакета в этом этапе не меняются.

### Этап 4. Объединение прежних пакетов

После отдельной проверки public surfaces:

- `@nodes/core` и `@nodes/editor` становятся одним `@zavx0z/graph`;
- `@nodes/layout` и `@nodes/worker` становятся одним `@zavx0z/layout`;
- `@nodes/ui` становится `@zavx0z/nodes`.

Сначала все прежние exports публикуются новым владельцем и проходят прежние
проверки. Только затем удаляются старые manifests. Внутренние каталоги
`model/`, `editor/`, `graph/`, `space/` и `worker/` сохраняют читаемые границы
реализации без создания новых пакетов.

### Этап 5. Полная приёмка переноса

До разработки новой архитектуры должны пройти:

- проверки типов и tests каждого пакета;
- проверки всех прямых consumers;
- отсутствие циклических production dependencies;
- точные Storybook routes и interactions;
- равный внешний вид принятых UI и Node scenarios;
- повтор R1–R5 Node acceptance;
- один Document, Canvas, Renderer, Space, ViewPoint, input owner и frame loop;
- отсутствие импортов из старых source checkout;
- ровно один изменяемый владелец каждого пакета.

### Этап 6. Новая пространственная архитектура

Только после полного сохранения существующей логики создаётся новый пакет
`@zavx0z/space`:

1. semantic `XRElement` hierarchy в одном Document;
2. `Space` и `ViewPoint` как Components;
3. `Mesh`, `Geometry` и `Material` с типизированным attachment;
4. `Display` и `HUD` как равноправные projection targets;
5. Document-to-Engine retained projection;
6. перенос Component subtree между Display и HUD без remount;
7. единый input и frame lifecycle;
8. conformance, dense performance и визуальная приёмка.

Прежние Browser planes/overlays и Engine behavior удаляются только после того,
как новый путь доказал их полный контракт.

### Этап 7. Перевод продуктов

MetaFor и Interpreter переводятся по одному сценарию. Каждый сценарий сохраняет
точную модель, DOM identity, interaction, внешний вид и производительность.
Consumer workaround запрещён: отсутствующая общая возможность исправляется у
правильного владельца платформы.

## Условия завершения

Миграция завершена только когда:

- все строки таблицы соответствия доказаны;
- все прежние public exports и consumers учтены;
- старые и новые результаты совпадают по принятому поведению;
- видимые части имеют явный owner verdict;
- плотные Node и Renderer проверки проходят;
- новый монорепозиторий является единственным изменяемым владельцем;
- исходные репозитории сохранены как read-only history sources;
- ни один обязательный пункт не заменён более узкой реализацией ради зелёного
  теста.
