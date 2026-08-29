# @nodes/editor

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/editor` — headless authoring-слой универсального нодового графа. Он
превращает команды добавления и удаления сущностей, изменения Parameter и
connect/disconnect в JSON Patch, применяет полученный конечный документ через
один атомарный commit `@nodes/core` и сообщает прямые и обратные операции.

Editor не содержит the adopted reference, WebGPU, canvas или layout solver. Конкретный view
сам выбирает Node, Parameter и Socket, а layout запускает через подключённый
projector только по явной команде.

`transact()` объединяет несколько structural JSON Patch операций в один
проверяемый forward/inverse batch и один Core reconcile. Scope/group/template,
instance и value-type данные остаются частью того же canonical NodeTree
document; Editor их сохраняет, но не дублирует. Canonical v1/v2 transition
входит в возвращаемые patches, а malformed или unknown entity members
отклоняются до materialization.

Built-in `addNode` сохраняет те же forward/inverse patches, но использует
atomic single-append Core reconcile path и не клонирует весь уже валидный document.

Действующие законы находятся в [требованиях editor](requirements.md).

Dev-only интерактивный пример Editor находится в [`storybook/`](storybook/),
а declaration — в `.storybook/`. Внешний tool показывает его в общем Workbench,
но этот каталог не экспортируется
как часть `@nodes/editor` и не меняет production dependencies пакета.
