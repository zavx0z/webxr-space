# @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` is the Blender-like standard-DOM component package for Node graphs.
DOM is its authoring substrate; it does not replace Node presentation with
generic boxes. Public factories return exact `@zavx0z/dom` elements plus stable
typed controllers:

```ts
import {createDocument} from "@zavx0z/dom"
import {createGraphCanvas} from "@nodes/ui/graph-canvas"

const document = createDocument()
const graph = createGraphCanvas(document, {
  title: "Graph",
  width: 640,
  height: 360,
  scene: {translateX: 0, translateY: 0, scale: 1},
  frames: [],
  links: [],
  nodes: [],
})
document.appendChild(graph.element)
```

Public subpaths:

- `@nodes/ui/node` — compact coloured Node with embedded shared Fields and typed Sockets
- `@nodes/ui/parameter` — exact `@ui/components/field` composition
- `@nodes/ui/link` — typed route segments and hit corridors
- `@nodes/ui/node-editor` — grid, selection, fit, pan, zoom, pinch and culling
- `@nodes/ui/node-system` — compiled TSX composition subscribed directly to a
  cached Core snapshot, with Editor-owned writes and stable keyed identities
- `@nodes/ui/graph-canvas` — keyed Frame → orthogonal Link → Node scene
- `@nodes/ui/node-workbench` — composition of Graph, NodeTree and Parameter owners
- `@nodes/ui/parameter-socket` — standard input/select/checkbox Parameter rows and Sockets
- `@nodes/ui/node-tree-editor` — nested NodeTree and controlled authoring tree

The former retained Surface signatures are not aliases of these modules.
Their observable Blender-like behavior is carried by standard elements, CSS
and events. Runtime connection to CPU/WebGPU is owned by an application through
`@zavx0z/renderer` and `@zavx0z/renderer-browser`.

`@nodes/ui/node-system` uses `@zavx0z/react` plus the build-time
`@zavx0z/template` compiler. It has no npm React/Fiber path, no class names and
no second NodeTree. Owner and caller styles use the global compile-time
`css\`\`` intrinsic, semantic attributes and compiled root provenance; no
style object, array, import or manual stylesheet transport exists.

Performance acceptance is reproducible with `bun run bench:node-system`. It
runs the same realistic four-Parameter/two-Socket/link-chain fixture at 1k and
10k Nodes, checks 60/90 Hz budgets, scheduler work, DOM/state mutations,
retained identities, CPU renderer reuse and automatic backend instancing.

Dev-only route data and stories remain under `storybook/` and are not public
exports or production dependencies.
