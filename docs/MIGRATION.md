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

Node follows `migration/node-cutover.json`: clean component rewrite and R1-R6
acceptance happen in the canonical Node checkout/current branch first. The
current dual production path is never imported as an intermediate package.
