---
name: catalog-dev
description: Run, open, restart, and verify the webxr-space UI component-graph Storybook and its exact Chrome CDP target. Use for user requests to start, open, show, or inspect this catalog; not for child-repository Storybooks.
---

# webxr-space catalog development

The owned contour is:

- checkout: `/Users/zavx0z/repozitarium/webxr-space`
- command: `bun run catalog`
- listener: `127.0.0.1:4015`
- canonical route: `http://127.0.0.1:4015/ui/component-graph`
- browser helper: `.agents/skills/catalog-dev/scripts/catalog-browser.ts`

## Meaning of a user-facing start request

When zavx0z says `запусти`, `открой`, or `покажи` this Storybook, completion
requires both the server and the visible browser result:

1. Inspect port `4015` and verify any listener's exact CWD. Reuse only the
   process owned by this checkout.
2. If absent, run `bun run catalog` in a retained long-lived PTY and wait for
   the canonical route to return HTTP 200. Do not adopt or stop a foreign
   listener.
3. Run:

   ```bash
   bun .agents/skills/catalog-dev/scripts/catalog-browser.ts ensure --activate
   ```

   The helper reuses one exact route target or creates it when absent, then
   activates that exact target so the requested page is actually shown.
4. Report both the listener and target ID. A healthy URL without a browser
   target is not a completed start request.

For internal tests, typechecks, builds, or non-user-facing lifecycle work, do
not create or activate a browser target. Use `status` read-only:

```bash
bun .agents/skills/catalog-dev/scripts/catalog-browser.ts status
```

The catalog is no-HMR. After source changes, restart only its exact owned
process, then run `reload --activate` when the user asked to see the result:

```bash
bun .agents/skills/catalog-dev/scripts/catalog-browser.ts reload --activate
```

Never infer success from the active tab, URL text, or a generic Chrome window.
Use the exact `targetId`; reject duplicate exact-route targets rather than
choosing one silently.
