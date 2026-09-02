# Migration workflow

M0 is safe because it contains metadata, checks and empty destinations only.
Production source moves package by package after explicit gates.

For each package:

1. Select one exact accepted source revision.
2. Prove the source checkout is clean and the revision is remote-backed.
3. Obtain an explicit source freeze/read-only and cutover decision.
4. Fetch that exact ref into the monorepo without modifying the source.
5. Derive unsquashed package-prefix history with `git subtree split`.
6. Add the split commit under its reserved destination.
7. Run the unchanged package check and affected-consumer checks.
8. Change the ownership ledger so only the destination is writable.
9. Cut consumers over without aliases or bidirectional synchronization.

The operation is blocked before step 3 today. Commands are intentionally not
executed speculatively because an import would create a second writable owner.

Node follows `migration/node-cutover.json`. The clean component rewrite is
committed in the canonical checkout and R1-R4 are verified. Exact owner
`LayoutResult` is mandatory at `9cccb58`; consumer-local fallback is gone.
Renderer `1cd3243`/`5d5a06c` closes only part of R5. Remaining R5 gates and R6
stay blocked. No Node package history is imported and `source:node` remains the
only writable canonical owner. The former dual production path was never
imported as an intermediate package.
