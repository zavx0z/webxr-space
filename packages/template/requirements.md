# Template requirements

## Direct DOM compiler

- `TEMPLATE-DOM-001` — `html` records an HTML template and live JavaScript
  values without converting the template into a renderer-specific tree.
- `TEMPLATE-DOM-002` — `compile` creates real `@zavx0z/dom` elements and text
  nodes through `Document.createElement`, `Document.createTextNode`,
  `Node.insertBefore`, `Node.removeChild` and attribute methods.
- `TEMPLATE-DOM-003` — `TemplateInstance.update` mutates only addressed parts.
  Unchanged elements, text nodes, attributes and event listeners keep identity;
  a whole mounted tree is never rebuilt or passed through `replaceChildren`.
- `TEMPLATE-DOM-004` — `on*` bindings use `addEventListener` and
  `removeEventListener`. Updating a handler detaches the previous listener.
- `TEMPLATE-DOM-005` — nested templates and arrays own bounded child regions.
  Equal nested template shapes update in place; a changed branch replaces only
  its region. Arrays reconcile by position until a keyed public contract is
  introduced.
- `TEMPLATE-DOM-006` — one public update is one synchronous DOM transaction.
  `dispose` removes the mounted region and every listener owned by it.
- `TEMPLATE-DOM-007` — the compiler is target-neutral. Engine, layout, paint,
  WebGPU and UI component policy are outside this package.
- `TEMPLATE-DOM-008` — dynamic values are never concatenated back into HTML
  source. Child strings become `Text` and attribute strings go through
  `setAttribute`, so data cannot introduce new markup or attributes.
- `TEMPLATE-DOM-009` — public `rootNodes` exposes authored static and dynamic
  roots only. Private `Comment` boundaries remain in the DOM for addressing but
  are not part of the public result.
- `TEMPLATE-DOM-010` — `@zavx0z/dom` is an external peer. Template never
  bundles a second DOM implementation, so producer, consumer and compiler share
  one class realm and `instanceof Node` remains exact.
- `TEMPLATE-DOM-011` — `html` and `css` use one shared cooked
  `TemplateStringsArray` identity cache, reserved marker encoding and ordered
  static/slot segment parser. Each frontend owns its grammar, but neither uses
  `String.raw`, reparses interpolation order independently or reads function
  source text.

## Deliberate first-slice limits

- Element and attribute names must be static.
- HTML comments, doctypes, raw-text elements and declarative shadow DOM are not
  compiled yet.
- Attribute interpolation accepts primitive values. `false`, `null` and
  `undefined` remove a wholly dynamic attribute; `true` creates an empty
  attribute.
- Child interpolation accepts primitives, DOM nodes, nested templates and
  arrays of those values. Functions are valid only as whole `on*` bindings.
- Array reconciliation is positional and does not claim keyed move semantics.
- Bounded template regions use standard `Comment` nodes. Comments preserve
  region identity in the DOM tree and never become text or paint content.

The older source parser is a separate syntax-analysis API. It does not
participate in the direct DOM update path.

## Shared compiled-template ABI

- `TEMPLATE-COMPILED-001` — Template owns both tagged HTML and JSX lowering.
  JSX lowers into the target-neutral `CompiledTemplate` ABI: static mount code,
  a fixed numeric binding count and a render function that writes addressed
  values. Tagged `html` currently retains its `TemplateProgram`/dynamic-part
  runtime. Both mutate the same exact DOM and obey the same identity and
  transaction laws; they do not yet claim one internal program representation.
- `TEMPLATE-COMPILED-002` — text, property, style, event, ref and bounded
  child-region bindings target exact `@zavx0z/dom` objects. Binding helpers
  validate names, ranges and slot addresses before a consumer mutates a mounted
  document.
- `TEMPLATE-COMPILED-002A` — compiled-template and binding brands use the
  process-global symbol registry, but brands are not part of public TypeScript
  interfaces. Equivalent package-resolution paths are structurally assignable
  and recognize the same immutable branded runtime values; this does not merge
  or replace the exact `@zavx0z/dom` class realm used by their Node targets.
- `TEMPLATE-COMPILED-003` — the ABI contains no scheduler, hooks, component
  state, renderer, Engine or compiler service. Component runtimes consume it;
  build-time JSX lowering produces it.
- `TEMPLATE-COMPILED-004` — build-time compiler entrypoints are separate from
  the default browser runtime entrypoint. TypeScript/Bun compiler code must not
  enter an application bundle merely because it uses `html`, `compile` or a
  previously compiled template.
- `TEMPLATE-COMPILED-005` — `jsx-runtime` exists for TypeScript JSX namespace
  resolution and as a fail-closed misconfiguration boundary. Production JSX is
  eliminated by the compiler; calling `jsx`, `jsxs` or `jsxDEV` at runtime
  throws instead of creating descriptor objects, a virtual DOM or a hidden
  fallback renderer.
- `TEMPLATE-COMPILED-006` — Template owns JSX source analysis and lowering;
  `@zavx0z/react` owns component scheduling, hooks and root lifecycle. Compiler
  output may reference the latter runtime but Template has no React, Fiber or
  virtual-DOM dependency.
- `TEMPLATE-COMPILED-007` — runtime, hook, root and component identities are
  resolved through TypeScript symbols. Same-spelling shadows are not rewritten,
  type-only/namespace runtime imports fail closed and mutable compiled component
  bindings are rejected.
- `TEMPLATE-COMPILED-008` — a compiler session fingerprints every governed
  component/custom-hook dependency used to classify an importer. A changed
  dependency invalidates both the transformed-source cache and TypeScript
  snapshot before the importer can be reused.
- `TEMPLATE-COMPILED-009` — every authored source and relative component or
  custom-hook declaration must remain within an explicitly governed canonical
  source root. Exact file roots and multiple roots are valid; an escaping
  declaration is not loaded as uncompiled JSX. Ownership canonicalizes the
  root and candidate parent chain but never asks the OS to choose a spelling
  for the final regular file: a lexical regular non-symlink stays owned even on
  filesystems that report another hard-link path. A physical mirror is admitted
  only when device, inode and public relative source identity match an exact
  governed owner. Final-file and parent-directory symlink escapes fail closed.
- `TEMPLATE-COMPILED-010` — the Bun adapter intercepts only JSX-bearing source
  extensions. Build registration owns start/end lifecycle; direct
  `Bun.plugin(...)` registration requires `persistent: true`. Caller source-map
  output is allowed, but the compiler explicitly reports `sourceMaps: false`
  until edits carry exact original-source mappings. For overlapping roots the
  adapter uses the most-specific match. A `node_modules` segment relative to
  that selected root is never transformed; an explicitly supplied physical
  owner root located under `node_modules` remains valid because its own
  relative source path starts below that boundary.
- `TEMPLATE-COMPILED-011` — authored component children are lowered directly
  into existing `@zavx0z/react` composition values. A single governed component
  uses one `ComponentValue`/`bindChild` range; component-or-null uses
  `bindConditional`; primitive text uses `bindText`; compiler-owned keyed
  components use `keyedComponents`/`bindKeyed`. No JSX descriptor, VDOM, Fiber,
  generic child walker or new compiled-template ABI field is introduced.
- `TEMPLATE-COMPILED-012` — a receiving function component renders typed exact
  `props.children`. The compiler recognizes the structural
  `JsxSourceElement` marker across physical package copies and fails closed for
  ambiguous/any/unknown mixtures. Nullable values normalize to `null` before
  the retained conditional range reaches the runtime.
- `TEMPLATE-COMPILED-013` — keyed component children are emitted only from a
  syntactically verified JSX `.map()` whose component has a non-null key, or
  from multiple explicit governed component children where every key is
  non-null. Fragments, intrinsic subtrees crossing the component boundary,
  explicit `children=` props, destructured receivers, raw/arbitrary arrays and
  unkeyed multiple children fail during compilation with a bounded diagnostic.
- `TEMPLATE-COMPILED-014` — updates reuse the fixed receiving range and nested
  component instances. Repeated child updates may change addressed props and
  Text but must not grow mounts, binding slots or a parallel runtime graph.
- `TEMPLATE-COMPILED-015` — component-local intrinsic `style` accepts only the
  typed global `css`` compiler intrinsic supplied by the exact Template JSX
  profile. JavaScript objects, camelCase declarations, author arrays and raw
  strings fail compilation. Base declarations have one canonical syntax: they
  are written directly at the top level of `css``. A redundant `& { ... }`
  base wrapper fails compilation with a migration diagnostic telling the author
  to remove the wrapper. Module-stable base declarations and supported
  selector blocks become immutable scoped
  `CompiledStyleSheet` metadata plus generated `data-z-*` markers. A static
  fragment guarded by `condition && css`` uses an addressed boolean marker
  binding; no component instance reparses that fragment.
- `TEMPLATE-COMPILED-016` — declaration values that depend on props, component locals
  or hook state remain in the existing inline `bindStyle` channel, preserving
  caller precedence. A non-base selector declaration may not directly depend on instance
  state; the explicit custom-property bridge in `TEMPLATE-COMPILED-016A` is the
  only admitted dynamic path. Nested `css``/`condition && css`` fragments flatten
  in exact authored order; `false`, `null` and `undefined` disappear, while one
  final `${props.style}` remains the caller inline fragment.
- `TEMPLATE-COMPILED-016A` — an author may explicitly bridge one dynamic base
  value into a static pseudo rule with a named CSS custom property, for example
  `css` source `--hover-color: ${props.hoverColor};` plus
  `&:hover { background: var(--hover-color); }`. Template keeps the named
  custom property in the addressed inline binding and preserves `var(...)`,
  including fallback text, unchanged in compiled CSS. It never synthesizes a
  variable name or per-instance stylesheet. CSS variable inheritance and
  substitution are Renderer-owned behavior, not Template evaluation.
- `TEMPLATE-COMPILED-017` — compiled stylesheet metadata is immutable and
  keyed by a non-empty deterministic id. Exact duplicate id/text pairs collapse;
  one id with different CSS fails closed. Template owns metadata transport only;
  the consuming Document/runtime owns registration, lifecycle and renderer
  invalidation without scanning DOM nodes or arbitrary runtime style values. One
  compiled Component with any static rules owns exactly one ordered execution
  sheet; every intrinsic target/style-array fragment keeps its distinct
  `data-z-*` marker, conditional binding and position inside that sheet so
  authored cascade order remains exact. This adds bounded metadata bytes once
  per reachable template, never per instance.
- `TEMPLATE-COMPILED-018` — direct props/state expressions inside a pseudo block
  remain a compiler error by design. The supported dynamic authoring path is an
  explicitly author-named custom property in the base declarations plus a
  static `var(--author-name[, fallback])` pseudo value. Compiler output keeps
  one shared static rule and one addressed inline custom property per instance;
  it never synthesizes a variable name or stylesheet/rule per instance, scans
  mounted style objects, or emulates pseudo state in JavaScript. Template
  transports the authored `var()` text but does not evaluate CSS substitution;
  that observable cascade/inheritance/fallback behavior belongs to Renderer.
- `TEMPLATE-COMPILED-019` — the low-level public `css` tag returns a branded immutable
  `CssTemplateResult` carrying the exact `TemplateStringsArray` and ordered
  declaration primitive values and typed nested CSS fragments. Its static shape
  is parsed once per callsite identity. Governed TSX does not import this runtime
  function: its global callable intrinsic is type-only, checker-branded, erased
  by compilation and never assigned on `globalThis`. Local or fake `css`
  declarations are ordinary symbols and are not recognized.
  Generic runtime style consumption fails explicitly; the result is never
  coerced with `String.raw`, `String()` or object-style enumeration.
- `TEMPLATE-COMPILED-020` — the global `css` intrinsic may be attached to an
  intrinsic `style` directly or through one canonical same-module immutable
  const. Direct top-level declarations represent the base element. Bounded
  static attribute compounds (`&[attr]`, `&[attr="value"]`, repeated
  attributes), an admitted native pseudo suffix, and one optional descendant
  static attribute compound (`&:hover [data-part]`) lower into the existing
  `CompiledStyleSheet`/marker IR. The descendant target may contain only one or
  more static attribute selectors; additional descendant levels, element/class/id
  targets, selector interpolation, other combinators and general selector grammar
  remain rejected.
  Module-stable value slots enter static metadata; instance-dependent slots are
  allowed only in direct base declarations and remain addressed inline values.
  A non-exported module CSS const must be referenced from at least two distinct
  compiled style sites; one-site private indirection fails with a precise
  diagnostic requiring inline `css``. It must be the only declaration in its
  `const` statement and may have no references outside those compiled style
  sites, so its compile-time intrinsic is always erased completely. A module
  CSS const may not be exported:
  the governed `css` intrinsic is compile-time-only and cross-module target
  ownership is intentionally unsupported. Shared public themes use real `.css`
  exports instead.
- `TEMPLATE-COMPILED-021` — css interpolation is restricted to declaration
  values. Selector/property/rule interpolation, unscoped/global selectors,
  at-rules, descendant/combinator selectors outside the single static
  attribute-target profile admitted by `TEMPLATE-COMPILED-020`, nested rules and
  instance-dependent pseudo slots fail during compilation. A component `style`
  prop accepts one base-only css fragment and lowers it to inline CSS;
  attribute/pseudo/descendant rules in caller style fail closed. Admitted reusable
  non-exported module css consts used only by compiled components are removed
  from production output; no global theme owner or editor-plugin contract is
  introduced.
- `TEMPLATE-COMPILED-022` — source-oriented builds may opt in with one public
  source id per governed compiler root. Only in that mode each compiled
  Component sheet carries immutable `authored-css` provenance containing
  the public module id, component name and normalized scoped CSS text. The
  source projection concatenates every compiler-extracted `css`` fragment in
  authored order and contains no tag/backticks or TypeScript interpolation.
  Static base declarations remain direct rather than being rewrapped in `& {}`;
  dynamic base declarations stay represented by their exact inline HTML style,
  while static declarations and pseudos remain syntax-highlightable CSS. Ordinary
  production builds omit this metadata and its bytes. Runtime execution uses
  only deterministic sheet id and compiled `cssText`; provenance is a read-only
  Storybook/source projection and never a second stylesheet owner.
  Distinct physical roots may intentionally use the same public source id for
  canonical/mirror package identity; most-specific root selection remains
  deterministic and no synthetic path suffix is added.
- `TEMPLATE-COMPILED-023` — compiler output may compact execution CSS with a
  fixed product-neutral dictionary containing only generic CSS selector,
  property, function and value syntax. Static and module-stable dynamic segments
  use the same escape-safe codec; `CompiledStyleSheet.cssText` is fully decoded
  before ABI validation, Document adoption or Renderer parsing. Reserved Unicode
  transport characters round-trip exactly and no UI/theme vocabulary is owned
  by Template. Markers and sheet ids use deterministic 96-bit base64url content
  hashes. At one million generated identities the birthday collision bound is
  approximately `6.3e-18`. Marker collisions remain probabilistically bounded;
  a realized execution-sheet id collision with different CSS additionally fails
  closed through the existing ABI/Document collision checks.
- `TEMPLATE-COMPILED-024` — authored intrinsic JSX uses the standard global DOM
  interface names supplied by the pinned TypeScript DOM library. Standard HTML
  tag names resolve through `HTMLElementTagNameMap`; event handlers receive the
  standard event interface with `currentTarget` narrowed to the exact authored
  element; callback refs receive that same exact element or `null`. Ordinary
  component source does not import author-facing `Event`, `Element`,
  `HTMLElement` or specialized HTML element types from `@zavx0z/dom`.
  Platform internals keep their explicit semantic class realm, and this typing
  profile alone does not claim that an unverified standard member already has
  observable runtime support.
- `TEMPLATE-COMPILED-025` — the JSX host profile admits only known standard HTML
  tags, governed standard attributes/properties, standard event bindings,
  callback refs and the existing branded `style` channel. Unknown host tags,
  properties and event props fail type checking or compilation. JSX event
  aliases lower through an explicit standard-name table rather than mechanical
  lowercasing; in particular `onDoubleClick` and its capture form bind the
  standard `dblclick` event. Object refs remain outside the Template profile
  until the component runtime implements and behaviorally proves them.
- `TEMPLATE-COMPILED-026` — every governed compilation also produces an
  immutable, source-located `CapabilityUsage` projection for the intrinsic
  tags, attributes or live properties, event bindings and capture mode,
  callback refs, parsed CSS properties and pseudo selectors, and checker-resolved
  standard DOM member reads, writes and calls found in that source. The
  projection records neutral standard identity and syntax facts only. Template
  never reads a Renderer capability matrix, assigns a platform status or owner,
  creates a capability request, or claims that consumer usage proves runtime
  implementation or conformance.
- `TEMPLATE-COMPILED-027` — `compileFile` returns transformed source together
  with its capability usages while the existing `transformFile` string API
  remains stable. The compiler cache retains both artifacts and returns the
  same immutable usage projection on a cache hit. Usage extraction is
  observational: enabling it does not change the transformed program, binding
  slots, DOM identity or runtime bundle surface.
- `TEMPLATE-COMPILED-028` — the Bun build adapter writes a neutral capability
  manifest only when the caller supplies an explicit `capabilityManifestPath`
  and the builder exposes complete start/end lifecycle hooks. Each build clears
  the previous aggregate on start, records the successful governed `onLoad`
  results, and writes the deterministic manifest after a successful
  end. Ordinary builds and persistent runtime preload registration perform no
  implicit filesystem write.
- `TEMPLATE-COMPILED-029` — an explicitly governed TypeScript JSX source must
  also belong to a configured TypeScript project. `sourceRoots` authorize Template
  transformation but do not invent compiler options, a JSX runtime or module
  paths for a source excluded from every `tsconfig.json`. An inferred project
  fails before transformation with a precise ownership diagnostic requiring the
  source to be included by a project configured with `jsx: preserve` and
  `jsxImportSource: "@zavx0z/template"`.

Capability-usage extraction deliberately resolves direct and optional-chain
property-access expressions in its first slice. Computed property names and
destructured member aliases are not guessed from spelling. CSS property and
pseudo usages retain the enclosing branded `css`` callsite range because the
parsed static shape does not yet retain a token-level authored offset map.
- `TEMPLATE-COMPILED-030` — neutral intrinsic-attribute usages retain whether
  the authored value is dynamic or a static string, number or boolean literal.
  Parsed CSS property usages retain an exact static declaration value when the
  existing CSS shape contains no slot, and each bounded CSS attribute selector
  becomes its own name/value usage fact. Capability extraction consumes the
  existing parsed CSS shape; it does not scan generated CSS or introduce a
  second parser.
- `TEMPLATE-COMPILED-031` — lowering and capability extraction use one host
  transport classifier parameterized by the exact authored value transport.
  It distinguishes static mount-time content attributes, addressed generic
  content-attribute bindings, dedicated property bindings, style, events and
  refs. `value`, `checked`, `indeterminate`, `selected`, `selectedIndex` and
  `tabIndex` always use dedicated property bindings, including literal JSX, so
  current DOM state rather than a same-spelling inert attribute is mutated.
- `TEMPLATE-COMPILED-032` — the compiler fingerprints the transitive static
  import/export closure inside the governed source roots because type-only
  declarations can change contextual DOM symbol resolution and capability
  usages without changing the importing component. A changed governed helper
  invalidates the shared code/usage cache and refreshes the TypeScript snapshot
  before reuse. External package and TypeScript standard-library revisions stay
  session-level inputs and require a new compiler session.
