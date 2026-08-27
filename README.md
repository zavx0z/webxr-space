# webxr-space

Development-only superproject for the retained WebGPU/XR interface stack.

This repository pins the exact revisions used together for development,
cross-repository checks, dependency analysis, Storybook catalogs, and live
graph projections. Production code remains owned by the child repositories.

## Repositories

| Path | Repository | Role |
| --- | --- | --- |
| `projects/engine/` | `zavx0z/engine` | Retained WebGPU renderer and scene objects |
| `projects/layout/` | `zavx0z/layout` | UI runtime, surfaces, FlexBox, clipping and input |
| `projects/ui/` | `zavx0z/ui` | Elements, Components, HUD and UI Storybook |
| `projects/node/` | `zavx0z/node` | Node model, layout policies and retained editor |

Only the four direct UI-stack repositories belong to this superproject.
Libraries and development tools such as highlighters, Storybook infrastructure,
parsers, generators, and analyzers remain independent repositories even when
the UI stack consumes them.

## Checkout

Keep the independent `highlighter` and `storybook` checkouts beside
`webxr-space`; they are linked development tools, not submodules.

```bash
git clone --recurse-submodules git@github.com:zavx0z/webxr-space.git
cd webxr-space
bun run bootstrap
bun run check
```

`bun run bootstrap` registers every package from a path relative to this
checkout, including the sibling `highlighter` and `storybook` repositories,
then performs frozen installs sequentially in the superproject, Engine,
Layout, UI, and Node. It verifies every consumer's own `node_modules` links,
including links resolved by each package declared through `packages/*`, not
only the hoisted superproject links. The nearest installed dependency must be
the exact package owner. Run bootstrap again after moving the checkout; stale
global Bun registrations are replaced with the paths from the current
superproject.

The sibling Highlighter and Storybook revisions are pinned beside the link
owners in `scripts/workspace.ts`. Bootstrap and link checks require those exact
clean `HEAD`s; the delivery check additionally requires remote `main` to
contain both revisions.

## Live UI dependency graph

The package-owned `@webxr-space/storybook` derives a symbol-level `may-call` graph from the
pinned UI sources and places its nodes with the public width-bounded
Coffman–Graham Node layout.
Each graph node loads the matching UI story lazily and renders the real
Element or Component on the shared WebGPU surface.

Launch it through the global `$storybook` by the exact package name
`@webxr-space/storybook`. The operating system allocates its port and the first
launch opens the canonical `/ui/component-graph` route automatically.

`bun run graph:ui` refreshes the deterministic projection in
`graphs/ui-component-graph.json`. The snapshot records the exact UI revision,
dirty bit, digest, declarations, and call-chain evidence; it is never a second
canonical source.

The package resolves independently owned Highlighter and Storybook
through the Bun links above, not through submodules.

For an existing checkout:

```bash
git submodule update --init --recursive
bun run bootstrap
```

## Development workflow

Make and deliver a source change inside its owning submodule, then update the
superproject pointer separately:

```bash
cd projects/ui
git switch main
# edit, check, commit and push UI
cd ../..
git add projects/ui
git commit -m "chore: update UI revision"
```

Before committing a gitlink, `bun run gitlinks:check` requires the exact four
declared submodules, clean worktrees, indexed revisions, and proof that every
pinned commit is contained by its advertised remote `main`. The same command
checks the pinned Highlighter and Storybook revisions and all consumer-local
link identities. It never fetches or advances a child repository implicitly.

The superproject is never imported by production packages. It owns only
development integration, revision pins, analyzers, catalogs, budgets, and
cross-repository evidence.

The former WebXR 3D Gallery remains available in Git history at commit
`01084cfd61d8` and earlier; it is not part of the new development contour.

GitHub resource constraints and internal guardrails are recorded in
[`docs/GITHUB-BUDGETS.md`](docs/GITHUB-BUDGETS.md) and
[`budgets/github.json`](budgets/github.json).
