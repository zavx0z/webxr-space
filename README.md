# @nodes/ui

**Built for [MetaFor](https://github.com/zavx0z/metafor).**

`@nodes/ui` provides retained WebGPU views for `NodeTree → Frame / Node → Parameter → Socket → Link`.

```ts
import {NodeEditor} from "@nodes/ui/node-editor"
import {
  createNodeRenderers,
  type FrameView,
  type LinkView,
  type NodeView,
  type NodePlan,
  type SocketView,
} from "@nodes/ui/node"

const editor = new NodeEditor<NodeView, SocketView, LinkView, FrameView, NodePlan>({
  renderers: createNodeRenderers(),
})
```

`NodeEditor` accepts a ready projection or `PositionedNodeTree`, owns fit, pan, zoom, selection, and interaction, and delegates presentation to independent Frame, Node, Parameter, Socket, and Link renderers. The exact `node-editor` entrypoint is solver-free.

The explicit `projection` entrypoint adapts a live `@nodes/core` tree through `@nodes/layout`. Runtime and retained layout primitives come directly from `@layout/core`; shared controls and element semantics come from `@ui/components` and `@ui/elements`.

Public view presets use neutral names: `NodeView`, `SocketView`, `FrameView`, `LinkView`, `NodePlan`, `createNodeRenderers`, `socketPreset`, and `createNodeTreeProjector`. Source-product identity is confined to Storybook evidence provenance.

The normative contracts remain in [`requirements.md`](./requirements.md). Live examples belong to [`@nodes/storybook`](../storybook/README.md) at `/ui/`.
