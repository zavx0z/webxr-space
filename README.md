# @nodes/worker

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/worker` owns structured-clone-safe transport plus exact fixed and adaptive clients and executors. Client entrypoints do not import the numeric solver; executor entrypoints import only their selected `@nodes/layout` policy.

Public imports use `@nodes/worker`, `@nodes/worker/types`, `@nodes/worker/transport`, and exact `fixed/*` or `adaptive/*` subpaths. Compatibility package names and aliases are not retained.
