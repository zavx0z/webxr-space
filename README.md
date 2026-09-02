# @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` is the Blender-like compiled component projection for the canonical
Core `NodeTree`. One caller-owned component root materializes one semantic DOM
subtree; the package creates no Document, Canvas, Renderer, Space or parallel
graph/value store.

```tsx
import {createNodeTreeExternalStore} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import {NodeEditor} from "@nodes/ui/node-editor"
import {createRoot} from "@zavx0z/react"

const editor = new NodeTreeEditor(tree)
createRoot(container).render(<NodeEditor
  store={createNodeTreeExternalStore(tree)}
  layout={layoutResult}
  onParameterInput={({nodeId, parameterId, value}) => editor.setParameterValue({
    expectedRevision: tree.revision,
    nodeId,
    parameterId,
    value,
  })}
/>)
```

Public subpaths:

- `@nodes/ui/node-tree` — exact Core external-store projection and culling;
- `@nodes/ui/node-editor` — selection, grid, fit, pan, zoom and pinch;
- `@nodes/ui/frame` — Frame relation/presentation owner;
- `@nodes/ui/node` — compact header, collapse, preview and Node composition;
- `@nodes/ui/parameter` — concrete Text/Number/Slider/Checkbox/Switch/Select/
  Cycle/OptionGroup/Color/Vector/Matrix/Path/Reference/Collection/Output
  presentations over current UI Fields;
- `@nodes/ui/socket` — 19 kinds, 8 shapes and independent side/direction;
- `@nodes/ui/link` — one semantic retained `vector-path` with historical
  rounded orthogonal/cubic routing and hit corridor.

There are no factory/controller exports, `NodeSystem` snapshot vocabulary,
private controls, public CSS strings or one-root-per-Field mounts. Integer uses
`NumberField` with Core validation, rotation uses `VectorField`, boolean and
enum presentation follow the selected interaction, and unknown/read-only values
use Node-owned output composition.

Aggregate `NodeTree`/`NodeEditor` never invent geometry: a completed
`@nodes/layout` `LayoutResult` is required, including exact Node/Frame/Port/Edge
coverage; Socket ports use exported `nodeSocketLayoutPortId(nodeId, socketId)`.
Missing or contradictory geometry fails before rendering. Direct
authored Frame/Node/Link Components keep explicit `rect`/`route` props.

Runtime connection to CPU/WebGPU remains application-owned through the one
Document/Renderer/Engine Experience. `@nodes/ui` uses `@zavx0z/react` plus the
build-time `@zavx0z/template` compiler, never npm React/Fiber.

Performance evidence is split deliberately:

- `bun run bench:node-system` materializes 1k/10k semantic Nodes and reports
  culling, p50/p95/p99, input-to-present, mutations, heap and Renderer/backend
  work;
- `bun run bench:node-visible` proves separate 1k/10k simultaneously visible
  cold Renderer counts;
- `bun run bench:node-paths` measures 512/2048/10k retained Links;
- `bun run bench:ui-bundle` separates root, exact subpath and leaf bundle cost.

Benchmarks fail rather than hiding unmet tail-latency, memory or bundle gates.

Dev-only route data and stories remain under `storybook/` and are not public
exports or production dependencies.
