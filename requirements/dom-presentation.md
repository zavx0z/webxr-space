# Standard DOM presentation for layout results

This document owns only the package-private presentation law used by the Nodes
development catalog. Numeric policy laws remain in the other files in this
directory and the public `@nodes/layout/*` entrypoints remain pure synchronous
solver graphs.

1. `dom/layout-presentation.ts` receives already computed geometry. It never
   selects a policy, reads a live NodeTree, calls a solver, measures DOM layout
   as graph input or imports generic `@layout/core`, Elements, Engine or a
   renderer.
2. A case contains the exact result bounds, node rectangles, resolved ports,
   semantic edge samples and diagnostics produced by its domain policy. The
   controller materializes semantic `section`/`article`/`output`/`dl` elements
   and absolute CSS positions through `@zavx0z/dom`.
3. Case, node, port, edge and diagnostic IDs are unique. Reconcile preserves
   their standard DOM identities while order, visibility and computed values
   change. Malformed or non-finite geometry is rejected before mutation.
4. The controller installs no event listeners and changes no policy state.
   Route stories own controlled standard button events for route/port
   visibility.
5. Exact story providers import one of `@nodes/layout/fixed`, `adaptive`,
   `top-down` or `coffman-graham`. A leaf computes only its selected fixture;
   an overview explicitly aggregates its registered descendants. There is no
   runtime policy registry or fallback solver.
6. The DOM controller and story providers are package-private. No DOM path is
   added to production exports and the existing solver artifacts remain the
   public domain contract.
