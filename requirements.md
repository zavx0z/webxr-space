# Требования @nodes/editor

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

Этот документ владеет универсальными командами изменения живого
[`@nodes/core`](../core/requirements.md) NodeTree. UI-композиция и selection
принадлежат [`@nodes/ui`](../ui/requirements.md), а расчёт геометрии —
[`@nodes/layout`](../layout/README.md).

## Authoring transaction

1. `NodeTreeEditor` не хранит копию графа. Обычная structural команда получает
   свежий ID-keyed document из NodeTree; additive `addNode` читает только
   canonical arrays/indexes Core. Обе фиксируют exact `expectedRevision`.
2. Обычная команда создаёт serializable forward JSON Patch, применяет его к отдельной
   копии document, материализует конечную runtime-definition с повторным
   использованием существующих Parameter и вызывает один core reconcile.
3. Успешная команда возвращает forward и inverse operations. Inverse
   восстанавливает JSON document, но после удаления не воскрешает прежний
   runtime Store object; history, сохраняющая такую identity, должна отдельно
   удерживать удалённый ресурс. History не является скрытой частью editor.
4. Ошибка patch, конфликт revision или невалидная конечная topology не оставляет
   частичного изменения.
5. `addParameter`, `removeParameter`, `addNode`, `removeNode`, `connect`,
   `disconnect` и `setParameterValue` возвращают тот же transaction evidence;
   пункт 10 задаёт эквивалентный additive commit path `addNode`.
6. Удаление Parameter, на который ссылается Socket, по умолчанию отклоняется.
   Удаление Node с принадлежащими Link допускается только явной составной
   командой, где все disconnect operations видимы в одном patch.
7. Core проверяет direction endpoints: исходный Socket предоставляет
   `output | bidirectional`, целевой — `input | bidirectional`.
8. `transact({forward, inverse})` принимает bounded serializable structural
   batch только если inverse на отдельной копии восстанавливает exact source
   document. Весь batch materialize-ится один раз и выполняет один Core
   reconcile, revision и topology delta. Изменение value retained Parameter
   через structural patch по-прежнему запрещено. Переход между canonical
   formatVersion 1/2 добавляется в forward/inverse автоматически до commit, так
   что возвращённый inverse применяется к фактически committed document.
9. Editor сохраняет Scope, Group, Template, Frame, instance и value-type поля
   format 2 при любой команде; он не создаёт для них соседний Store. Exact shape
   каждой patched entity проверяется до materialization, unknown members и
   primitive payload не нормализуются молча.
10. Built-in `addNode` формирует те же exact forward/inverse JSON Patch
    operations, но не клонирует весь уже валидный document. Он materialize-ит
    только новый Node и вызывает exact single-append Core `reconcile`; Core остаётся владельцем
    atomic validation, Parameter observation, revision и detailed delta.
    Returned patches обязаны применять committed document вперёд и назад, а
    listener failure после commit сохраняет точный `NodeTreeEditorCommittedError`.

## Layout gate

1. Editor сравнивает последнюю принятую layout topologyRevision с текущей и
   сообщает `layoutDirty`, но не импортирует и не запускает solver.
2. Обычное value-only изменение Parameter не делает layout устаревшим.
   Подключённая consumer policy может пометить geometry-sensitive Parameter;
   его изменение и изменение состава Frame, Node, Parameter, Socket или Link
   делают layout устаревшим.
3. View явно запрашивает новую проекцию и подтверждает её точные `revision` и
   `topologyRevision`. Устаревшая проекция не очищает `layoutDirty`.

## Package boundary

1. Главный entrypoint `@nodes/editor` зависит только от exact public contracts
   `@nodes/core` и не импортирует `@nodes/layout`, `@nodes/ui`, `@ui/*`, Engine,
   DOM или product vocabulary.
2. Selection, hover, pan, zoom, открытые меню и выбранная строка Parameter
   принадлежат конкретному view, поэтому не записываются в NodeTreeEditor.
3. Parameter остаётся единственным Store значения. Editor не создаёт соседний
   value Record и не переносит callbacks в JSON presentation.

## Package-owned dev stories

1. Dev-only Core/Editor routes используют общий standard-DOM NodeTreeEditor
   story в repository Storybook; отдельного retained dock/preview adapter нет.
   Repository Storybook подключает routes в один общий DOM Workbench and static
   build без второго entrypoint, runtime, Router or shell.
2. Story-owned ordinary input/click events изменяют только controlled DOM props;
   они не становятся скрытой частью headless Editor runtime.
3. Editor package не имеет локального Storybook export/dependency. Repository
   examples получают semantic data через exact Core/Editor contracts и
   materialize стандартный UI отдельно.
