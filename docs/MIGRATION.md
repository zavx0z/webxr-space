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

`bun run node:cutover:plan` prints the current fail-closed Node cutover plan as
JSON. The planner only inspects metadata, Git state and reserved destinations;
it never executes a command or imports production source. `executable: true`
means that every recorded cutover gate is satisfied, not that the plan has run.
The future authorized transaction removes and commits the placeholder READMEs
before `git subtree` so the worktree is clean, derives each package prefix
without squash and without creating a branch or worktree, then runs unchanged
package and affected-consumer checks. The ownership switch follows successful
checks. Push authorization is recorded separately and is never implied by
history-import or ownership-switch authorization.

Node follows `migration/node-cutover.json`. The clean component rewrite is
committed in the canonical checkout and R1-R4 are verified. Exact owner
`LayoutResult` is mandatory at `9cccb58`; consumer-local fallback is gone.
Renderer `1cd3243`/`5d5a06c` closes the local input path. R6 remains blocked.
Node `0b949e7` adds accepted copy-on-write append correctness, and
Node `1f4393e` closes 1k/10k topologyCommit by retaining stable Parameter
stores on append. Renderer `80ee4f5` and evidence `21f263f` close end-to-end
append topology for selector-independent data-plus-hidden insertion. Renderer
`0cb7256` and evidence `65ec24a` close calibrated 10k transform.
Node `f4519ea` closes Link timing and retained runtime memory; dense-visible
disposal is closed by Node `4a68482` and Renderer `a5c9f3e`/`99ce784`. Final
1k/10k retained baselines pass executable `600000000 / 5400000000` byte
ceilings; final append is `12.498 / 64.902ms` with exact marker-derived mounts.
At `776a974`, exact full NodeEditor `278365 / 70095` passes the replacement
`285000 / 72000` bundle ceiling. Official Blender 5.2 Noise Texture evidence is
stored byte-exact, and Node/UI composition at `9966197` / `5c35145` is captured
at 1:1 on Storybook revision `1a3ad15e74d2400c585c626a`. R5 technical gates
are closed. The remaining R5 boundary is a generic Renderer/Engine-font gap:
the native select indicator emits `▾` but paints as a damaged vertical glyph,
plus the explicit `zavx0z` visual verdict. No consumer workaround was added.
No Node package history is imported and `source:node` remains the
only writable canonical owner. The former dual production path was never
imported as an intermediate package.
