# webxr-space visual monorepo foundation

This worktree implements M0 of the future visual monorepo: a strict workspace
shell, package/owner evidence, migration gates and automated boundaries. It does
not yet own production package source.

The architectural target is one extended semantic `Document` as the canonical
visual graph, one `Space` as its scene and retained Engine/WebGPU structures as
derived projections. Display and HUD are peer targets of that same
Document/Space. Component authoring will eventually cover ViewPoint, Mesh,
Geometry, Material and the accepted Node component family without Fiber, VDOM
or a second scene graph.

## M0 contents

```text
architecture/   package inventory, dependency DAG, owner and Storybook records
capabilities/   accepted decisions, current evidence and explicit gaps
evidence/       exact observed repository/package snapshot
migration/      staged manifest, history-import plan and Node R1-R6 gates
packages/       empty, tracked destination slots with no package manifests
scripts/        discovery, boundary enforcement and package-check orchestration
```

The authoritative files are:

- `architecture/package-inventory.json`
- `architecture/dependency-graph.json`
- `architecture/ownership-ledger.json`
- `migration/manifest.json`
- `migration/node-cutover.json`
- `capabilities/evidence-matrix.json`
- `evidence/history-snapshot.json`
- `evidence/node-cutover-snapshot.json`
- `evidence/node-r4-r5-checkpoint.json`
- `evidence/node-r4-closure-r5-checkpoint.json`
- `evidence/node-r5-append-checkpoint.json`
- `evidence/node-r5-topology-commit-checkpoint.json`
- `evidence/node-r5-topology-closure-checkpoint.json`
- `evidence/node-r5-transform-calibration-checkpoint.json`
- `evidence/node-r5-transform-closure-checkpoint.json`

Every existing package still has exactly one writable canonical source owner.
Adding `package.json` or production source to a reserved destination fails the
foundation check until an explicit history-preserving cutover changes the
ownership ledger.

## Checks

```bash
bun install --frozen-lockfile
bun run check
bun run evidence:check
bun run packages:check
bun run packages:check:plan
```

`bun run check` is the self-contained M0 acceptance. `packages:check` runs the
same foundation through the unified package-check orchestrator. The plan command
prints each external repository's exact existing `bun run check` command without
executing or rewriting it. External source checks are deliberately not part of
M0 because those repositories remain independent writable owners.

`evidence:check` compares the live external checkouts with the timestamped
snapshot and fails on any drift. Such a failure is not repaired by copying the
new source into M0; it means the snapshot must be reviewed at the next explicit
cutover checkpoint.

## Why production source is not imported yet

The timestamped source snapshot initially observed clean Engine, UI, Node,
Renderer and Template checkouts, but they remain independent writable canonical
owners and may move concurrently. Several observed HEAD revisions are also ahead
of the recorded local `origin/main`. Importing now would create two writable
owners, so `migration/history-import.json` records the exact package prefixes
and blocker instead of copying files.

Node completed its one-path component cutover and exact Layout contract at
`9cccb58`: R1-R4 are verified. Node `5d029c2e91b5` plus Renderer
`80ee4f5`/`21f263f` close 1k/10k end-to-end append topology through conservative
projection-neutral retained-frame reuse. Node `9d7aa6c` calibrates ordinary 10k
transform to 100 samples, and Renderer `0cb7256`/`65ec24a` closes it across three
fresh processes. Link selection,
dense-memory/disposal, bundle and final visual-owner gates also remain open. R6
is blocked because Node `5d029c2e91b5` and Renderer `21f263f` are not remote-backed
and the canonical sources have not been frozen/read-only.
The original M0 observation remains in `evidence/source-snapshot.json`; the
current live pointer is `evidence/node-r5-transform-closure-checkpoint.json`.

## Transition superproject

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
bun run legacy:check
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
