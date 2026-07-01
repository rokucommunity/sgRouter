# sgRouter — agent guide

Roku SceneGraph routing library (BrightScript). Maps URL paths → components, manages view lifecycles.

## Scope — the router is a router ONLY (strictly enforce)
sgRouter matches URLs → components, owns the history stack, drives view lifecycle, and emits `routerState` events. It deliberately does **NOT** handle the following — each is delegated to the **view** via a lifecycle hook, and the logic must never be added to `Router.bs`:
- **Transitions / animations** — the router shows/hides/moves nodes instantly; it only *awaits* the view's `beforeViewOpen` / `beforeViewSuspend` promises so the **view** can animate.
- **Data store / fetching / caching** — the view loads its own data in `beforeViewOpen`; the router only carries route snapshots.
- **Focus management** — the router delegates to the active view's `handleFocus`; the **view** decides where focus lands.

Rule: anything about *how a screen looks, what data it shows, or where focus lands* belongs in the **view**, not the router. See [ARCHITECTURE.md](ARCHITECTURE.md) → Scope & non-goals.

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
- `navigateTo`/`goBack`/`popToCheckpoint` called while a navigation is in progress **queue** (FIFO) and run on completion — they are not rejected. Each entry point is a thin wrapper over an `*Impl`. Don't return/await a queued navigation's promise from a hook awaited by the same in-flight navigation (`beforeViewOpen`/`beforeViewSuspend`/`onViewOpen`) — it deadlocks.
- Not implemented (do not assume): `canDeactivate`, child/nested routes, `ttl`.
