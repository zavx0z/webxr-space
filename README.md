# @nodes/worker

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/worker` owns structured-clone-safe transport plus exact fixed, adaptive,
top-down and Coffman–Graham clients and executors. Client entrypoints do not
import the numeric solver; executor entrypoints import only their selected
`@nodes/layout` policy.

Public imports use `@nodes/worker`, `@nodes/worker/types`,
`@nodes/worker/transport`, and exact `fixed/*`, `adaptive/*`, `top-down/*` or
`coffman-graham/*` subpaths. Compatibility package names and aliases are not
retained.

## Dev Storybook

Dev-only lazy stories принадлежат `@nodes/worker` и находятся в
`packages/worker/storybook`. Репозиторный `@nodes/storybook` показывает их в
разделе `Worker` одного общего Workbench и владеет entrypoint, canvas, runtime,
процессом, route tree и static build. Каждый story рендерит точный
request/result/error contract выбранной policy в общей preview Surface.
Storybook не экспортируется из `@nodes/worker` и не входит в его production
dependencies.
