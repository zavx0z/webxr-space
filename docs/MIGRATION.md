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
stay blocked. Node `0b949e7` adds accepted copy-on-write append correctness, and
Node `1f4393e` closes 1k/10k topologyCommit by retaining stable Parameter
stores on append. Renderer `80ee4f5` and evidence `21f263f` close end-to-end
append topology for selector-independent data-plus-hidden insertion. Other R5
gates remain. Renderer `0cb7256` and evidence `65ec24a` close calibrated 10k
transform; Link/memory/disposal/bundle/final-visual gates remain.
Node `f4519ea` closes Link timing and retained runtime memory; dense-visible
disposal is closed by Node `4a68482` and Renderer `a5c9f3e`/`99ce784`. Dense
retained memory awaits an approved owner ceiling and is not classified
pass/fail. At `176816b`, all technical performance gates are verified. Node
`1bce579` corrects the exact Blender 4.5 compatibility slice through owner DOM,
CSS and Components; `c399bf3` records Blender 5.2 LTS as the current normative
target. Exact full NodeEditor is now `277269 / 69694`, so the replacement bundle
ceiling remains an owner decision. The available read-only Blender 5.2 scene
contains no node graph, therefore the 4.5 raster is legacy compatibility
evidence rather than a final parity verdict. R5 waits on the bundle ceiling,
dense-memory policy, exact 5.2 node reference and explicit visual verdict.
No Node package history is imported and `source:node` remains the
only writable canonical owner. The former dual production path was never
imported as an intermediate package.
