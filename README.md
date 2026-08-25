# @nodes/worker

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/worker` owns structured-clone-safe transport plus exact fixed, adaptive
and top-down clients and executors. Client entrypoints do not import the numeric
solver; executor entrypoints import only their selected `@nodes/layout` policy.

Public imports use `@nodes/worker`, `@nodes/worker/types`,
`@nodes/worker/transport`, and exact `fixed/*`, `adaptive/*` or `top-down/*`
subpaths. Compatibility package names and aliases are not retained.

## Dev Storybook

Dev-only DOM stories принадлежат `@nodes/worker` и находятся в
`packages/worker/storybook`. Репозиторный `@nodes/storybook` собирает их в
страницу `/worker/` и владеет общим процессом, маршрутом и static build.
Storybook не экспортируется из `@nodes/worker` и не входит в его production
dependencies.
