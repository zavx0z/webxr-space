# @nodes/core

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/core` — независимый runtime универсального нодового графа. Пакет
владеет живыми `NodeTree`, `Parameter`, `Frame`, `Node`, `Socket`, `Link`,
ревизиями, подписками, JSON-снимком и координацией производных проекций.

Core не знает о renderer, WebGPU, DOM, the adopted reference или конкретном layout solver.
Действующие законы находятся в [требованиях core](requirements.md), а карта
всего семейства пакетов и storybook — в [родительском обзоре](../../README.md).

Dev-only примеры Core находятся в [`storybook/`](storybook/). Репозиторий
показывает их в общем Storybook, но этот каталог не экспортируется как часть
`@nodes/core` и не добавляет UI-зависимости в production runtime.

```bash
bun run --cwd packages/core typecheck
bun test packages/core
```
