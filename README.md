# webxr-space

Development-only superproject for the retained WebGPU/XR interface stack.

This repository pins the exact revisions used together for development,
cross-repository checks, dependency analysis, Storybook catalogs, and live
graph projections. Production code remains owned by the child repositories.

## Repositories

| Path | Repository | Role |
| --- | --- | --- |
| `engine/` | `zavx0z/engine` | Retained WebGPU renderer and scene objects |
| `layout/` | `zavx0z/layout` | UI runtime, surfaces, FlexBox, clipping and input |
| `ui/` | `zavx0z/ui` | Elements, Components, HUD and UI Storybook |
| `node/` | `zavx0z/node` | Node model, layout policies and retained editor |
| `highlighter/` | `zavx0z/highlighter` | Theme-neutral source tokenization |
| `storybook/` | `zavx0z/storybook` | Shared private Storybook infrastructure |

## Checkout

```bash
git clone --recurse-submodules git@github.com:zavx0z/webxr-space.git
cd webxr-space
bun run check
```

For an existing checkout:

```bash
git submodule update --init --recursive
```

## Development workflow

Make and deliver a source change inside its owning submodule, then update the
superproject pointer separately:

```bash
cd ui
git switch main
# edit, check, commit and push UI
cd ..
git add ui
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
