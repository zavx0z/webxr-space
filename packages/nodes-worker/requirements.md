# Requirements for @nodes/worker DOM protocol presentation

The public Worker transport, clients and exact executors remain unchanged.
This bounded law covers the package-private standard DOM view used by the
Nodes development catalog.

1. `dom/worker-protocol.ts` presents structured-clone-safe request and response
   envelopes with semantic `select`, `output`, `section`, `pre` and `code`
   elements. It imports only `@zavx0z/dom`; no generic Layout runtime, Elements,
   Components, Engine or renderer is a production dependency of the view.
2. Every exchange preserves exact `type`, `requestId` and `generation` fields.
   A response whose identity differs from its request is rejected before DOM
   mutation. The view does not fabricate Worker events, transport state or
   main-thread fallback results.
3. Reconciliation is keyed by policy ID and preserves the exchange and Text
   identities when generation or message data changes. The controller itself
   installs no listeners.
4. A package-owned story binds the standard generation `change` event and
   rebuilds controlled request/response props through the selected exact
   production executor. Each policy route imports one executor; only the Worker
   owner overview explicitly aggregates all four.
5. The DOM controller and providers are private and are not added to package
   exports. Public clients remain solver-free and public executor bundle
   isolation remains governed by `@nodes/layout` performance requirements.
