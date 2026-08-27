# webxr-space agent rules

## Scope

- This repository is a development-only superproject. It is not a production
  package and must never become a production dependency of a child repository.
- `projects/engine`, `projects/layout`, `projects/ui`, and `projects/node` are
  the only Git submodules and retain independent ownership, histories, checks,
  releases, and deployment decisions.
- Libraries and development tools such as highlighters, Storybook
  infrastructure, parsers, generators, and analyzers remain separate
  repositories. Consumption by the UI stack is not a reason to add a submodule.
- Work in the supplied branch and checkout. Do not create branches, clones, or
  worktrees without a direct request from zavx0z.

## Storybook lifecycle

- Use the globally installed `$storybook` with exact package identity
  `@webxr-space/storybook`; do not recreate a repository-local lifecycle skill.
- A user-facing request to "запусти", "открой", or "покажи" this Storybook is
  incomplete until both conditions hold: the exact owned server responds and
  the canonical route is open and activated in one exact CDP target. HTTP 200
  alone is not completion. The first package launch performs that open/activate
  by default and repeated `ensure` must not create another target.
- A `restart` reuses and navigates the recorded exact target in the background;
  it must not activate the tab, focus Chrome, or create another target.
- Internal checks and builds do not implicitly open or focus a browser target.

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
- Commit, push, workflow dispatch, Pages publication, GitHub settings changes,
  and artifact deletion require explicit authorization for the current task.
