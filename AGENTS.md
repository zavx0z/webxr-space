# webxr-space visual-monorepo migration rules

## Scope and M0 state

- This repository is the authorized migration worktree for the future visual
  monorepo. The visual monorepo owns the visual platform, not every MetaFor
  product or development tool.
- M0 remains a development-only foundation. It contains no imported production
  package source. Directories under `packages/*` are reserved destinations and
  must not gain `package.json` or source until an explicit owner cutover.
- The root `@zavx0z/webxr-space` package is never a production dependency. A
  production package may depend only on exact package owners, never this root.
- `projects/engine`, `projects/ui`, and `projects/node` are
  the only transition Git submodules. Until each package cutover they retain
  independent ownership, histories, checks, releases, and deployment decisions.
- Libraries and development tools such as highlighters, Storybook
  infrastructure, parsers, generators, and analyzers remain separate
  repositories unless an explicit owner decision changes that boundary.
- Node is not imported or rewritten in this worktree. Its clean component
  rewrite belongs to the canonical Node checkout/current supplied branch. The
  destinations and R1-R6 gates in `migration/node-cutover.json` are the only M0
  Node work here.
- A DOM/renderer/package-boundary migration never authorizes visual redesign or
  removal of production control behavior. Preserve UI- and Node-owned
  Blender-compatible references, interactions and explicit owner acceptance.
- Work in the supplied branch and checkout. Do not create branches, clones, or
  worktrees without a direct request from zavx0z.

## Storybook lifecycle

- `.storybook/manifest.json` is an optional data-only composition of the Engine,
  UI and Node project declarations. The superproject owns no stories, catalog,
  runtime, package session, server, port or frontend shell.
- Use the globally installed external `$storybook` for one server/origin and
  exact package tabs. Child repositories remain the only story/resource owners.
- Renderer remains an independently attached sibling declaration and linked
  package owner; never add it as a Git submodule or workspace child.
- Do not rebuild an umbrella catalog from child implementation sources or add a
  dependency/private `@scope/storybook` package to this superproject.

## Package ownership and history import

- `architecture/ownership-ledger.json` is the machine-readable canonical owner
  ledger. Every existing package has exactly one writable owner.
- Never copy production source into a reserved destination. A package import is
  history-preserving, unsquashed and prefix-filtered from one exact accepted
  source revision.
- Before import, require a clean remote-backed source, explicit source
  freeze/read-only authorization, package checks and a single-owner ledger
  switch. If any gate is absent, leave the destination empty.
- Never maintain bidirectional sync, compatibility aliases or parallel
  canonical stores. A destination becomes writable only when its source owner
  stops being writable.
- Public package names remain unchanged during the first cutover. Names for new
  presentation packages remain undecided until their owner contracts exist.

## Visual graph law

- One extended semantic `Document` is the canonical visual graph and `Space` is
  the scene. Engine/Object3D/WebGPU state is retained derived projection only.
- Display and HUD are peer projection targets in the same Document/Space. A
  same-Document move preserves identity, state, listeners, focus and resources.
- Component-authored ViewPoint, Mesh, Geometry and Material require typed
  ownership and attachment. Do not add Fiber, VDOM, a reflective catalog,
  string attach or a second Three-like canonical graph.
- Do not add another Canvas, Document, semantic tree, renderer/parser/event
  system, manual layout or component-local platform workaround.

## Submodules

- Before changing a child repository, inspect its own `AGENTS.md`, status,
  branch, HEAD, remote, public contracts, and focused tests.
- Commit and push a child change inside that submodule first. Update the
  superproject gitlink in a separate commit only after its remote contains the
  exact child commit.
- Never use `git submodule update --remote` as an implicit upgrade. Every
  revision change is explicit and reviewable.
- Do not delete, reset, or replace dirty submodule state. A dirty child is a
  hard migration and delivery blocker.

## GitHub resource budget

- GitHub workflows are manual `workflow_dispatch` only unless zavx0z approves
  another exact trigger.
- Use only standard `ubuntu-latest` runners. Larger runners and paid runner
  classes are prohibited.
- Do not publish GitHub Packages, LFS objects, generic build artifacts, or
  Pages deployments without an explicit current-task request.
- When a Pages artifact is explicitly required, retain it for one day and keep
  it within the machine-readable limits in `budgets/github.json`.
- A workflow must use a concurrency group with `cancel-in-progress: true` and
  must not build every submodule when a smaller selected scope is sufficient.
- Before changing workflow storage or deployment behavior, read
  `docs/GITHUB-BUDGETS.md` and refresh its dated evidence.

## Files and delivery

- Generated dependency snapshots are read-only projections of child sources;
  they are not a second canonical store.
- Preserve exact source revision, dirty state, evidence path, and edge kind in
  every generated graph artifact.
- `bun run check` validates the M0 foundation without executing external source
  repositories. `bun run packages:check:plan` shows the exact unchanged owner
  check commands. Executing external checks requires an explicit
  `--include-external` invocation and must not mutate their tracked files.
- Commit, push, workflow dispatch, Pages publication, GitHub settings changes,
  and artifact deletion require explicit authorization for the current task.
