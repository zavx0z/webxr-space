# webxr-space

Development-only superproject for the DOM-driven WebGPU/XR interface stack.

This repository pins the exact revisions used together for development,
cross-repository checks, dependency analysis, optional Storybook declaration composition, and live
graph projections. Production code remains owned by the child repositories.

## Repositories

| Path | Repository | Role |
| --- | --- | --- |
| `projects/engine/` | `zavx0z/engine` | Retained WebGPU renderer and scene objects |
| `projects/ui/` | `zavx0z/ui` | DOM/CSS Components, HUD compositions and UI Storybook |
| `projects/node/` | `zavx0z/node` | Node model, layout policies and DOM editor |

The DOM pipeline is an authoring/runtime migration, not a product redesign.
UI and Node retain their repository-owned Blender-compatible composition,
density, material and interaction contracts while implementing them with
standard DOM/CSS and the shared renderer.

The shared Renderer presentation-host contract also preserves the former
topology law: one application Experience owns one semantic Document, native
Canvas, Engine Renderer and Space; displays, world UI and HUD are movable
projection roots of that same owner. The normative details live in
[`renderer/ARCHITECTURE.md`](../renderer/ARCHITECTURE.md) and
[`renderer/packages/browser/requirements.md`](../renderer/packages/browser/requirements.md).

Only the three direct UI-stack repositories belong to this superproject.
Libraries and development tools such as highlighters, Storybook infrastructure,
parsers, generators, and analyzers remain independent repositories even when
the UI stack consumes them.

## Checkout

Keep the independent `highlighter`, `storybook`, `renderer` and `template`
checkouts beside `webxr-space`; they are development owners, not submodules.

```bash
git clone --recurse-submodules git@github.com:zavx0z/webxr-space.git
cd webxr-space
bun run bootstrap
bun run check
```

`bun run bootstrap` registers every linked package from a path relative to this
checkout, including the sibling Renderer, Highlighter and Template repositories,
then performs frozen installs sequentially in the superproject, Engine, UI,
and Node. It verifies every consumer's own `node_modules` links,
including links resolved by each package declared through `packages/*`, not
only the hoisted superproject links. The nearest installed dependency must be
the exact package owner. Run bootstrap again after moving the checkout; stale
global Bun registrations are replaced with the paths from the current
superproject.

Pinned linked-owner revisions remain declared in `scripts/workspace.ts`.
External Storybook is deliberately not a Bun dependency or pinned link: its one
server discovers this workspace through JSON declarations.

## External Storybook composition

The optional [workspace manifest](./.storybook/manifest.json) composes only the
Engine, UI and Node project declarations. It contains no stories, catalog,
runtime, server or layout metadata. Each child owns its package declarations,
stories, README and resources; the standalone external Storybook owns one
server/origin, Workbench and isolated package sessions.

Renderer is not a submodule or workspace child. When needed, attach its sibling
project declaration independently to the same server.

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

Before committing a gitlink, `bun run gitlinks:check` requires the exact three
declared submodules, clean worktrees, indexed revisions, and proof that every
pinned commit is contained by its advertised remote `main`. The same command
checks pinned linked-tool revisions and all consumer-local
link identities. It never fetches or advances a child repository implicitly.

The superproject is never imported by production packages. It owns only
development integration, revision pins, optional declaration composition, analyzers, budgets, and
cross-repository evidence.

The former WebXR 3D Gallery remains available in Git history at commit
`01084cfd61d8` and earlier; it is not part of the new development contour.

GitHub resource constraints and internal guardrails are recorded in
[`docs/GITHUB-BUDGETS.md`](docs/GITHUB-BUDGETS.md) and
[`budgets/github.json`](budgets/github.json).
