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

```bash
git clone --recurse-submodules git@github.com:zavx0z/webxr-space.git
cd webxr-space
(cd projects/engine/packages/core && bun link)
(cd projects/layout/packages/core && bun link)
(cd projects/ui/packages/elements && bun link)
(cd projects/ui/packages/components && bun link)
(cd projects/node/packages/layout && bun link)
(cd ../highlighter && bun link)
(cd ../storybook && bun link)
bun install --frozen-lockfile
bun run check
```

## Live UI dependency graph

The development catalog derives a symbol-level `may-call` graph from the
pinned UI sources and places its nodes with the public top-down Node layout.
Each graph node loads the matching UI story lazily and renders the real
Element or Component on the shared WebGPU surface.

```bash
bun run catalog
```

Open `http://127.0.0.1:4015/ui/component-graph`.

`bun run graph:ui` refreshes the deterministic projection in
`graphs/ui-component-graph.json`. The snapshot records the exact UI revision,
dirty bit, digest, declarations, and call-chain evidence; it is never a second
canonical source.

The local catalog resolves independently owned Highlighter and Storybook
through the Bun links above, not through submodules.

For an existing checkout:

```bash
git submodule update --init --recursive
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

The superproject is never imported by production packages. It owns only
development integration, revision pins, analyzers, catalogs, budgets, and
cross-repository evidence.

The former WebXR 3D Gallery remains available in Git history at commit
`01084cfd61d8` and earlier; it is not part of the new development contour.

GitHub resource constraints and internal guardrails are recorded in
[`docs/GITHUB-BUDGETS.md`](docs/GITHUB-BUDGETS.md) and
[`budgets/github.json`](budgets/github.json).
