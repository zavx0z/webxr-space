# UI component graph catalog requirements

The catalog is development integration owned by `webxr-space`. It projects the
exact pinned child revisions; no child repository imports the catalog or the
superproject.

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

1. Top-down placement uses only `@nodes/layout/top-down`. The source snapshot
   retains `consumer → dependency`; the visual adapter explicitly reverses it
   to `dependency → consumer` so lower-level owners appear above consumers.
2. The graph page owns one `UiRuntime` and one `UiSurface`. It imports pinned UI
   story registries only through a webxr-space adapter, lazily loads one
   representative route, and calls the real story module with immutable
   default args inside the node frame.
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
   top-down solver or mutate the source projection.
