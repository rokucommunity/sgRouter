# sgRouter — agent guide

Roku SceneGraph routing library (BrightScript). Maps URL paths → components, manages view lifecycles.

## Read these first
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how the router works internally (state, navigation pipeline, suspension model, lifecycle ordering, invariants). **Read this before changing routing logic.**
- **[README.md](README.md)** — end-user usage (route config, lifecycle hooks, guards, examples).

## Where things live
- `src/components/Router.bs` — all core logic and state (`m.__router_*`).
- `src/source/router.bs` — public `sgRouter` API namespace (view-scoped wrappers).
- `src/components/View.bs` — base view class + lifecycle hooks.
- `src/components/{Outlet,Router,View,KeyPathGuard}.{bs,xml}` — node components.
- `src/source/router.spec.bs` — rooibos unit tests (the executable spec).

## Non-obvious rules (full list in ARCHITECTURE.md → Invariants & gotchas)
- Routes are stored **as provided**; normalization happens only at match time.
- `callFunc` **lowercases AA keys** — don't rely on case-sensitive key matches across that boundary.
- Nested AAs don't reliably survive the promise context — keep promise-context payloads flat.
- Back navigation reads `m.__router_historyStack`, **not** tree child order.
- Suspended `detach`-mode views live in the `m.__router_detachedViews` AA, not a SceneGraph node.
- Not implemented (do not assume): `canDeactivate`, child/nested routes, `ttl`.
