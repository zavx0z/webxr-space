# @webxr-space/storybook UI component graph requirements

The Storybook is development integration owned by `webxr-space`. It projects
the exact pinned child revisions; no child repository imports the package or
the superproject.

## Source projection

1. The V1 source scope is exactly `projects/ui/packages/elements` and
   `projects/ui/packages/components`. Engine, Layout, Node, Highlighter,
   Storybook, parsers, generators, and analyzers do not become graph nodes or
   submodules merely because UI consumes them.
2. A node is a callable public render export from an exact non-barrel package
   leaf. Detection uses the TypeScript checker and the `UiSurface` plus numeric
   geometry signature; names and casing are not semantic proof.
3. An edge means the source export may call the target export. Conditional
   branches are included. Private helper chains are collapsed only until the
   first public render export and retain exact call-site evidence.
4. The graph is deterministic and contains only repository-relative paths. It
   records the UI Git revision, dirty bit, source digest, declaration
   locations, and call chains. It is a read-only projection, never a canonical
   component store or runtime tree.

## Live presentation

1. The complete UI graph uses only the width-bounded
   `@nodes/layout/coffman-graham` policy. The source snapshot retains
   `consumer → dependency`; the visual adapter explicitly reverses it to
   `dependency → consumer` so lower-level owners appear above consumers.
2. The graph page owns one `UiRuntime`, one graph `UiSurface` and the shared
   passive `StorybookStatusBarSurface`. `planStorybookStatusBarShell` reserves
   sibling content/status frames, so the lower owner text never overlays the
   graph. The page imports pinned UI story registries only through a
   webxr-space adapter, lazily loads one representative route, and calls the
   real story module with immutable default args inside the node frame.
3. Existing UI story registries remain private development sources, not new
   `@ui/*` exports. The adapter must not copy their descriptors or make UI
   depend on Node or webxr-space.
4. Simultaneous nodes are live production renders but V1 does not claim fully
   independent interaction: existing story control bridges are package-global.
5. A public render export without a story may receive an exact direct adapter
   that imports and calls that same production function with explicit default
   content. Unknown or unavailable mappings remain visible as status; they
   never receive a fabricated renderer or raster substitute.
6. The page has no zoom control. It materializes the intrinsic graph once, then
   initially fits and centers the entire graph through one retained-root
   transform. Viewport resize updates only that transform; it does not rerun the
   Coffman–Graham solver or mutate the source projection.
7. Presentation does not derive `tree`, `cross`, `shortcut`, `constraint` or
   any other placement subtype. Every source relation participates in one
   Coffman–Graham layering pass with at most four real nodes per layer and one
   rounded-corner cubic pipeline, and stays addressable through the layout ID
   map.
8. Каждый relation получает собственные source/target route ports. Ports одного
   node+role распределяются детерминированно по ширине карточки. Coffman–Graham
   сохраняет набор measured X-слотов и упорядочивает их edge identities по
   соседним dummy-lanes. Совпадающие
   endpoints, общие trunks и физический bundling запрещены.
9. The exact route always draws the complete 85-relation projection. Query
   parameters do not hide a backbone subset or select another edge renderer;
   filtering belongs to a future explicit product interaction, not layout.
10. The catalog imports the production solver and public geometry types only
    from `@nodes/layout/coffman-graham`. Its browser bundle contains that exact
    policy and excludes the Dagre top-down implementation.
11. Avoidable corridor crossings are removed by cost-aware track ordering.
    Every residual fixed-anchor inversion arrives as one typed crossing event;
    the under-edge is rendered with a short deterministic gap while the
    diagonal over-edge stays continuous. Crossing presentation is not a second
    edge type or router.
12. The target ingress zone from the Coffman–Graham policy remains clear:
    every avoidable port-order inversion is removed before routing, and every
    remaining lateral transition finishes before the final straight section
    into a node's assigned `NORTH` port.
