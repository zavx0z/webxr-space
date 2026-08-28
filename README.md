# @nodes/core

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/core` — независимый runtime универсального нодового графа. Пакет
владеет живыми `NodeTree`, `Parameter`, `Frame`, `Node`, `Socket`, `Link`,
ревизиями, подписками, JSON-снимком и координацией производных проекций.

Core не знает о renderer, WebGPU, DOM, the adopted reference или конкретном layout solver.
Действующие законы находятся в [требованиях core](requirements.md), а карта
всего семейства пакетов и storybook — в [родительском обзоре](../../README.md).

Тот же `NodeTree` хранит semantic graph/subgraph scopes, groups, отдельные
visual Frames, versioned templates и stable instance references. Typed
Parameters/Sockets проверяются до Link commit, directed cycle policy задаётся
явно, `subscribeDelta()` отдаёт incremental changes, а
`createNodeTreeExternalStore()` образует cached external-store boundary без
React dependency и без второго дерева. Exact document versions `1 | 2`
гидратируются через root `@nodes/core` entrypoint.
Topology-only и per-Parameter subscriptions позволяют view не перечитывать
полный value snapshot. Exact single-append `reconcile()` validates/owns только
additive candidate, обновляет derived canonical indexes и публикует exact nested delta.
Advanced definitions создаются `createNodeTree(definition, policy)`, поэтому
та же неподлежающая подделке fail-closed policy применяется и к каждому dynamic
reconcile. Для runtime schema enforcement один `createValidatedParameter()`
удерживает pure value policy без соседнего Store.

Dev-only примеры Core находятся в [`storybook/`](storybook/). Репозиторий
показывает их в общем Storybook, но этот каталог не экспортируется как часть
`@nodes/core` и не добавляет UI-зависимости в production runtime.

```bash
bun run --cwd packages/core typecheck
bun test packages/core
```
