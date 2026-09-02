# Visual monorepo architecture

## Accepted laws

1. The monorepo owns the visual platform, not every MetaFor product or tool.
2. One extended `Document` is the canonical visual graph; `Space` is the scene.
3. Engine, Object3D and WebGPU data are retained derived projections.
4. Display and HUD are peer targets of the same Document/Space.
5. Same-Document target moves preserve semantic and component identity, state,
   listeners, focus and retained resources.
6. R3F-level ergonomics is required without React Fiber, VDOM, reflective
   catalogs, string attachment or a second canonical scene graph.
7. Every package has one writable canonical owner.

## Current package contour

Existing public names are preserved. Engine, DOM, Template, component runtime,
Renderer stages, browser host, UI Components and the future accepted Node family
have explicit destination slots. Highlighter and the declaration-driven
Storybook remain external.

The presentation package split and public names are intentionally proposals.
M0 does not turn a convenient directory name into an owner decision.

## Dependency direction

```text
Document / Engine substrate
        ↓
Template and CPU Renderer
        ↓
component runtime and WebGPU projection
        ↓
one Experience host
        ↓
target-neutral UI and spatial Components
        ↓
Node authoring Components
```

The machine-readable current DAG is
`architecture/dependency-graph.json`. Production cycles fail closed. Development
edges are recorded but do not redefine the production dependency law.

## Missing platform capabilities

The existing browser host already has bounded same-Document Element reparent,
multiple planes and overlays. It does not yet prove component-range reparent
without remount, nor component-authored Mesh/Geometry/Material/ViewPoint with
typed attachment. Those gaps belong to their platform owners and cannot be
implemented inside UI or Node as workarounds.
