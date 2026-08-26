# GitHub resource budget

Verified against current GitHub documentation and the authenticated repository
APIs on 2026-08-26.

## Official GitHub Free limits

- Standard GitHub-hosted runners are free for public repositories. The 2,000
  included minutes per month apply to private-repository standard runner use.
- GitHub Free includes 500 MB of pooled Actions artifact and GitHub Packages
  storage.
- Actions cache storage is a separate 10 GB allowance per repository. Cache
  entries unused for more than seven days are normally evicted.
- Workflow artifacts and logs default to 90 days, but public repositories may
  reduce retention to one day. Every explicit artifact in this contour uses the
  one-day policy.
- A published Pages site may be at most 1 GB. Pages has a soft bandwidth limit
  of 100 GB per month and a ten-minute deployment timeout.
- Larger runners are always paid and are prohibited by this repository policy.

Primary references:

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Artifact retention](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Budgets and hard stops](https://docs.github.com/en/billing/how-tos/set-up-budgets)

## Observed account footprint

The API snapshot covered `engine`, `layout`, `ui`, and `node` after the shared
Storybook migration:

- active one-day Pages artifacts: 8,976,335 bytes total;
- largest current Pages artifact: about 3.35 MB (`node`);
- Bun cache: about 35.7 MB in each of four repositories;
- no generic long-lived build artifacts were found in the new shared Storybook
  repository or MetaFor.

This is a dated observation, not an invariant. The current authentication token
does not have `user` or `read:packages`, so the GitHub billing screen remains
the authority for plan and Packages usage. zavx0z identified the account plan as
GitHub Free.

## Internal budget

The stricter machine-readable policy is `budgets/github.json`:

- no automatic push, pull-request, or scheduled workflows;
- no superproject workflow that builds every submodule by default;
- standard `ubuntu-latest` only;
- no larger runners;
- Pages artifact retention: one day;
- maximum Pages artifact: 25 MiB;
- maximum active Actions artifacts across the account: 50 MiB;
- maximum cache target per repository: 256 MiB;
- no GitHub Packages, LFS, generic artifact uploads, or automatic Pages deploys
  without an explicit request from zavx0z.

## Superproject strategy

Submodules keep this repository small: the superproject records gitlinks rather
than copying child histories. CI should use shallow submodule checkout and build
only a selected graph or Storybook target.

The former `webxr-space` workflow deployed on every push and pull request while
copying the checkout into `dist`. It was removed before the first superproject
push. Any replacement workflow must be manual and pass the budget checks above.

For monetary protection, configure an account-level GitHub Actions budget at
<https://github.com/settings/billing> with alerts enabled and a hard stop for
paid usage. Also enable the included-usage alerts at 90% and 100%.
