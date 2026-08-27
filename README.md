# @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` is the standard-DOM authoring package for Node graphs. Public
factories return exact `@zavx0z/dom` elements plus stable typed controllers:

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

- `@nodes/ui/graph-canvas` — keyed Frame → orthogonal Link → Node scene
- `@nodes/ui/node-workbench` — composition of Graph, NodeTree and Parameter owners
- `@nodes/ui/parameter-socket` — standard input/select/checkbox Parameter rows and Sockets
- `@nodes/ui/node-tree-editor` — nested NodeTree and controlled authoring tree

The former retained Surface and projection APIs were removed in one breaking cutover. There
are no compatibility aliases or re-exports. Runtime connection to CPU/WebGPU is
owned by an application through `@zavx0z/renderer` and
`@zavx0z/renderer-browser`; this package owns only the semantic document tree.

Dev-only route data and stories remain under `storybook/` and are not public
exports or production dependencies.
