# sgRouter — Architecture (technical reference for AI coding tools)

> This document explains **how sgRouter works internally**, optimized for AI assistants
> (Claude Code, Codex, Cline) and contributors who need to reason about or change the
> routing logic quickly. For **end-user usage** (how to configure routes, lifecycle hooks,
> guards, examples) see [README.md](README.md).
>
> When this doc and the code disagree, the code wins — verify against the files cited below.

---

## TL;DR mental model

sgRouter is a **stack-based URL router for Roku SceneGraph**. You register routes
(`pattern → component`), call `navigateTo("/path")`, and the router creates/shows/suspends
`View` nodes inside a single container, tracking navigation order in an explicit array.

- One **`Router` node** holds all state and logic. It lives on the scene as `scene.__router`.
- One **`Outlet` node** contains a single `viewTarget` Group — the live view container.
- Each screen is a **`View` node** (extends `sgRouter_View`) with promise-returning lifecycle hooks.
- Navigation is **promise-driven** (uses `@rokucommunity/promises`); every step awaits the
  previous one, so lifecycle ordering is deterministic.
- Suspended views are either **hidden in `viewTarget`** (`suspendMode: "hide"|"show"`) or
  **detached out of the tree into an in-memory store** (`suspendMode: "detach"`).

There is **no separate keepAlive SceneGraph container** — detached views are held in the
`m.__router_detachedViews` associative array, not in a node.

---

## Scope & non-goals (design constraint — strictly enforce this)

**sgRouter is a router and nothing else.** Its only responsibilities are: match URLs →
components, own the navigation/history stack, drive view lifecycle, and emit `routerState`
events. The router answers exactly one question: *"which view is active, and what route
produced it?"*

The following are **deliberately out of scope** and must **NOT** be implemented inside the
router (`Router.bs`). The router *delegates* each to the view via a lifecycle hook — adding the
actual logic to the router is a bug, not a feature:

- **Transitions / animations.** The router shows/hides/moves view nodes **instantly**
  (`visible`, `translation = [0,0]` or `[10000,10000]`). It never animates. It *enables*
  transitions only by **awaiting** the view's `beforeViewOpen` / `beforeViewSuspend` promises —
  the **view** runs its own animation and resolves when done. Do not add interpolators, animation
  control, or timing logic to `Router.bs`.
- **Data store / fetching / caching.** The router carries route snapshots (`routeParams`,
  `queryParams`, `hash`, `context`) but never fetches, owns, or caches application data. The
  **view** loads its own data in `beforeViewOpen` (return a promise to defer the open). Do not add
  data managers, caches, or network calls to the router.
- **Focus management.** The router does **not** decide which node is focused. It hands focus to
  the active view's `handleFocus(data)` and the **view** owns placement; as a last resort it parks
  focus on its own top node. `m.__router_focusRequestMade` only tracks whether the router
  currently owns focus across reparenting — it is not focus logic. Do not add focusable-node
  tracking, focus heuristics, or "remember last focused child" behavior to the router.

**Rule of thumb:** if a feature concerns *how a screen looks, what data it shows, or where focus
lands*, it belongs in the **view**, not the router. When in doubt, expose a lifecycle hook and let
the view decide — do not absorb the responsibility into `Router.bs`.

---

## File map

| File | Role |
|---|---|
| [src/source/router.bs](src/source/router.bs) | **Public API.** `sgRouter` namespace. Thin wrappers that locate the Router node and forward to its `_`-prefixed `callFunc`s. Also `sgRouter.utils` (isOutlet/isRouter/focus chain). **Use only inside a View component**, never the main scene directly except for `initialize`/`addRoutes`/`navigateTo`. |
| [src/components/Router.bs](src/components/Router.bs) | **Core logic.** All state lives here as `m.__router_*` globals. ~1500 lines; the heart of everything below. |
| [src/components/Router.xml](src/components/Router.xml) | Router node interface: `routerState` (assocAA, observable), `__isRouter`, and the `_`-prefixed function interface. Extends `Group`. |
| [src/components/Outlet.xml](src/components/Outlet.xml) | Outlet node. Marker field `__isOutlet`, contains a single `<Group id="viewTarget" />`. Extends `Group`. |
| [src/components/Outlet.bs](src/components/Outlet.bs) | Currently just `focusable = true` on init. |
| [src/components/View.bs](src/components/View.bs) | **Base view class.** `_`-prefixed internal lifecycle wrappers (called by the router) + overridable public hooks (default to resolved promises). Focus gating via `m._allowHandleFocus`. |
| [src/components/View.xml](src/components/View.xml) | View interface: `router`, `route` (nodes), `previousNodeIds` (array), and lifecycle function declarations. Extends `Group`. |
| [src/components/KeyPathGuard.bs/.xml](src/components/KeyPathGuard.bs) | Built-in guard used when a `canActivate` entry is an AA (`{ keyPath, expectedValue, scope, denyDialog, denyRedirect }`). |
| [src/source/interfaces.bs](src/source/interfaces.bs) | Type interfaces: `Route`, `RouteConfig`, `KeepAliveConfig`, `NavigationState`, `RouteUpdateEvent`, `RouterStateEvent`. |
| [src/source/RouterState.bs](src/source/RouterState.bs) | `RouterState` enum (the event-type strings). |
| [src/source/router.spec.bs](src/source/router.spec.bs) | rooibos unit tests — the executable spec for all behavior below. |

Dependencies: [`@rokucommunity/promises`](https://github.com/rokucommunity/promises) and `rodash`.

---

## Router state (all in `m.__router_*`, initialized in `Router.bs init()`)

| Field | Type | Meaning |
|---|---|---|
| `__router_routes` | AA | `pattern → merged RouteConfig`. Populated by `_addRoutes`. |
| `__router_nameMap` | AA | `name → merged RouteConfig` for named-route resolution. |
| `__router_historyStack` | Array | Ordered navigation history. Entries: `{ path, nodeId, hasCheckpoint?, checkpointIds? }`. The **source of truth for back navigation**, not the tree child order. |
| `__router_activeView` | Node | The currently visible View. |
| `__router_viewTarget` | Node | The `viewTarget` Group inside the outlet. Holds the active view + all in-tree suspended views (`hide`/`show`). |
| `__router_detachedViews` | AA | `nodeId → View` store for `suspendMode:"detach"` suspended views (out of the tree). |
| `__router_outlet` | Node | The Outlet node. |
| `__router_navigationInProgress` | Bool | Re-entrancy gate. Set true on `NavigationStart`, false on `NavigationEnd`/`NavigationError`/`NavigationCancel`. Blocks concurrent `navigateTo`/`goBack`/`popToCheckpoint`. |
| `__router_processingGoBack` | Bool | True during `goBack`/`popToCheckpoint` so `showView` skips the history push. |
| `__router_focusRequestMade` | Bool | Tracks whether the router currently "owns" focus, so transient focus loss during reparenting doesn't clear focus state. |
| `__router_guardInstances` | AA | Cache of string-named guard nodes (`className → node`). |
| `__router_deviceInfo` | Node | `roDeviceInfo`, used only for `GetRandomUUID()` (route ids). `Invalid` until initialized. |

`_destroy()` tears all of this down, removes detached nodes, clears `viewTarget` children, and removes the `__router` field from the scene.

---

## Core data structures

**`RouteConfig`** (what `addRoutes` stores per pattern — see `_addRoutes` defaults):
```
pattern, component, name?, allowReuse=false, canActivate=[],
clearStackOnResolve=false, keepAlive={enabled:false}, suspendMode,
outgoingRouteConfigOverrides?
```
`suspendMode` default is keepAlive-aware: `"detach"` if `keepAlive.enabled`, else `"hide"`.
Unknown `suspendMode` → warning + fallback to that default. **Validation happens at ingestion
for `suspendMode` only**; otherwise routes are stored as-provided (see *Invariants*).

**`Route`** (a per-navigation node built by `createRoute`, stamped with a UUID `id`):
```
path, routeConfig, routeParams, queryParams, hash, id, navigationState, context, router
```
`navigationState`: `{ fromPushState, fromPopState, fromKeepAlive, fromRedirect }`.

**History entry**: `{ path, nodeId, hasCheckpoint?, checkpointIds? }`.

---

## The navigation pipeline (`_navigateTo`)

1. **Gate**: reject if `navigationInProgress` or not initialized; reject invalid path.
2. **Named-route resolution**: if `path` is an AA, `resolveNamedRouteArg` → literal path string
   (substitutes `:params`, leftover params → query string). Missing name/param → reject, no events.
3. **Build `newRoute`**: `findMatchingRoute(path, routes)` → `createRoute(...)` as a `Node`.
   Merge in `routeConfigOverrides`, `context`, `navigationState` from options.
4. Dispatch **`NavigationStart`** → **`RoutesRecognized`**. (Errors: no outlet / no pattern /
   no component → `NavigationError` + reject.)
5. **Promise chain** (`promises.chain(...).then(...)`):
   - `runGuardChecks(newRoute)` → `{ allow, redirect? }`.
     - blocked + redirect → returns the redirect navigation.
     - blocked, no redirect → reject.
   - **Reuse decision** (only if there's an active view): reuse the current view and fire
     `onRouteUpdate` instead of creating a new one when `allowReuse` OR same `path` OR a hash is
     present — but **only if the component (or full routeConfig, when hashed) matches**. On reuse:
     `ResolveStart → onRouteUpdate → ResolveEnd → ActivationEnd → NavigationEnd`.
   - Otherwise → `addViewToStack(newRoute, viewsToRemoveOnResolve, outgoingRouteConfigOverrides)`.
     If `clearStackOnResolve`, all current `viewTarget` children + all non-keepAlive detached
     views are collected into the close list.
6. `catch` resets `navigationInProgress` and re-rejects.

### `addViewToStack` — the heart of forward navigation

1. Dispatch `ResolveStart`.
2. **Resume-or-create**: `findSuspendedKeepAliveView(route.path)` searches the detach store then
   hidden keepAlive views in `viewTarget`.
   - **Found** → resume: drop stale store entry, record old id into `view.previousNodeIds`
     (capped to history length), reassign `view.id = route.id`, set `view.route = route`,
     mark `navigationState.fromKeepAlive`.
   - **Not found** → create the component node hidden + off-screen, then await `_beforeViewOpen`.
3. **Outgoing-override resolution** (`suspendMode` only, see below): merge route-config override
   → navigateTo-option override → `beforeViewOpen` result (highest precedence). Carried as a
   **string**, not a nested AA (marshalling — see *Gotchas*).
4. `.then`: append/reparent the new view into `viewTarget`; apply the outgoing override to the
   active view's per-navigation route node; build the lifecycle promise list:
   - active view not in close list → `suspendView(active)` (awaited).
   - close list: keepAlive → `_beforeViewSuspend` + hide + `_onViewSuspend` (only if it's the
     active view, i.e. first suspension); non-keepAlive → `_beforeViewClose`.
   - `promises.all(...)`.
5. `.then`: dispatch `ActivationEnd` → `ResolveEnd`, then `showView(view, fromKeepAlive)`.
6. `.then`: post-show cleanup — keepAlive views get `finalizeSuspendPlacement` (detach if
   `"detach"`), non-keepAlive views are destroyed; revert the per-navigation outgoing override.

### `showView(view, onResume)`
Makes the view visible at `[0,0]`, sets `activeView`, fires `_onViewResume` (resume) or
`_onViewOpen` (open). In `.finally`: restores focus, then **history bookkeeping** —
skipped entirely when `processingGoBack`; otherwise clears the stack on `clearStackOnResolve`
and pushes `{ path, nodeId }` when `fromPushState`. Resets `processingGoBack`, dispatches
`NavigationEnd`.

---

## Lifecycle hooks & guaranteed ordering

Views extend `sgRouter_View`. Internal `_`-prefixed methods wrap overridable public hooks;
hooks may return a promise and the router **awaits** it.

```
beforeViewOpen(next)        ' incoming view prepares (data load); may return outgoingRouteConfigOverrides
  → beforeViewSuspend(prev) ' AWAITED; outgoing view still visible (good for exit animations)
  → (prev hidden per suspendMode)
  → onViewSuspend(prev)
  → onViewOpen(next)        ' incoming now visible
```

- `onRouteUpdate(params)` — fired instead of open/suspend on a reuse; receives
  `{ oldRoute, newRoute }`.
- `beforeViewClose(params)` — only for views that are **destroyed** (non-keepAlive removed by
  `clearStackOnResolve` / `popToCheckpoint` / normal forward close). Suspended views get
  `beforeViewSuspend`/`onViewSuspend` instead.
- `onViewResume(params)` — fired on `goBack`/`popToCheckpoint`/keepAlive forward-resume.
- `handleFocus(data)` — gated by `m._allowHandleFocus` (true only after `onViewOpen` resolves).

Every hook except `onRouteUpdate` receives a **route snapshot** `params.route` =
`{ routeConfig, routeParams, queryParams, hash, navigationState }`.

---

## Suspension model

When you navigate away, the outgoing view is **suspended, not torn down** (unless it must be
destroyed). `suspendMode` decides where it goes:

| Mode | Placement | Default for |
|---|---|---|
| `"show"` | left rendered in place (`visible=true`, position unchanged) | — |
| `"hide"` | kept in `viewTarget`, `visible=false`, parked at `[10000,10000]` | ordinary routes |
| `"detach"` | removed from tree, held in `m.__router_detachedViews` (frees texture memory) | `keepAlive` routes |

- `hideView` applies in-place visibility; `finalizeSuspendPlacement` removes the node for
  `"detach"`; `detachView`/`reattachView` move nodes in/out of the store.
- Unknown `suspendMode` at hide time is treated like `"hide"`/`"detach"` (never left on screen).

**`outgoingRouteConfigOverrides`**: the *incoming* route can override the *outgoing* view's
`suspendMode` for one navigation only. Three sources, low→high precedence: route config →
`navigateTo` option → incoming view's `beforeViewOpen` return. Sanitized to `suspendMode` only
(`sanitizeOutgoingRouteConfigOverrides`), applied to the outgoing view's per-navigation route
node, and **reverted after the suspend completes** so it never leaks onto a resumed view.
Does not apply on `goBack`.

---

## keepAlive & stale node-id resolution

A `keepAlive` view is resumed (not recreated) on forward navigation back to its path. Because a
resumed view's `id` is reassigned to the new navigation's `id`, **history entries can point at a
stale id**. Resolution:

- `view.previousNodeIds` records prior ids (capped to history length).
- `findViewByNodeId` does an exact-id lookup (viewTarget then detach store).
- `findRetainedViewByNodeId` falls back to matching `nodeId` against each retained view's
  `previousNodeIds`. Used by both `goBack` and `popToCheckpoint`.

---

## goBack & checkpoints

**`_goBack`**: gated by `navigationInProgress`; needs ≥2 history entries. Resolves the
second-to-last entry's view (tolerating stale ids), re-attaches if detached, dispatches
`NavigationStart`, `closeOrSuspendView`s the current view, then in `.then`: applies pop
navigation state, **pops** the history stack, `showView(view, onResume=true)`. The `back` key in
`Outlet.bs`/`View.bs onKeyEvent` calls `sgRouter.goBack()`.

**`_setCheckpoint(identifier)`**: stamps `hasCheckpoint`/`checkpointIds[identifier]=true` onto the
**last** history entry. Identifier defaults to the active route's `path`. Idempotent; no-op on
empty stack.

**`_popToCheckpoint(identifier)`**: searches the stack backward from `count()-2` for a matching
checkpoint (any checkpoint if identifier omitted/`"__INVALID__"`). Re-attaches the target if
detached, dispatches `NavigationStart`, truncates the stack to `[0..targetIndex]`, then
close/suspends every in-tree view above the target and destroys non-keepAlive detached views
above the target (keepAlive detached views stay suspended), then `showView(target, true)`.
Rejects on no match or navigation-in-progress. No `canDeactivate` guards exist.

---

## Guards (`runGuardChecks`)

`canActivate` is an array; **all must pass**. Each entry can be:
- an **AA** → wrapped in a `KeyPathGuard` (`setGuardConfig`),
- a **node** exposing `canActivate` → used directly,
- a **string** class name → instantiated once and cached in `__router_guardInstances`.

A guard's `canActivate(route)` returns: `true` (allow), `false` (block → `GuardsCheckEnd` +
`NavigationCancel`), or a **RedirectCommand** AA (`{ path, ... }`, made via
`sgRouter.createRedirectCommand`) → `NavigationCancel` + a fresh `_navigateTo` to the redirect
target with `navigationState.fromRedirect=true`. Events: `GuardsCheckStart` →
(`ActivationStart` + `GuardsCheckEnd`) on allow.

---

## Router state events

`m.top.routerState` is an observable assocAA. Observe it for analytics/debugging.
Event types (`RouterState` enum): `NavigationStart`, `RoutesRecognized`, `GuardsCheckStart`,
`GuardsCheckEnd`, `ActivationStart`, `ActivationEnd`, `ResolveStart`, `ResolveEnd`,
`NavigationEnd`, `NavigationCancel`, `NavigationError`. Payload:
`{ id, type, url?, state? (route snapshot), error? }`. `dispatchRouterState` also flips the
`navigationInProgress` flag on Start/End/Error.

---

## Route matching (`findMatchingRoute`)

1. Strip `#hash` and `?query` (parsed into `hash` / `queryParams`).
2. **Exact static match wins immediately.**
3. Otherwise, among routes with the **same segment count**, pick the candidate with the **most
   static segments** (most specific). `:param` segments capture into `routeParams`.
4. No match → a "not found" route (empty pattern) → `NavigationError`.

Paths are normalized at match time only (`normalizePath`: trim, strip trailing `/`, ensure
leading `/`).

---

## Invariants & gotchas (read before changing code)

- **No normalization on ingestion.** `_addRoutes` stores patterns exactly as given (except the
  `suspendMode` validation). Normalization happens only at match time. Don't "clean up" patterns
  in `_addRoutes`.
- **`callFunc` lowercases AA keys.** Anything arriving via a node field / callFunc may have
  lowercased keys — `sanitizeOutgoingRouteConfigOverrides` compares with `LCase(...)` for exactly
  this reason. Don't rely on case-sensitive key matches across the callFunc boundary.
- **Nested AAs don't survive the promise context reliably.** Promise-chain context carries
  `suspendMode` as a plain string, not a nested override AA. Keep promise-context payloads flat.
- **History stack ≠ tree child order.** Back navigation reads `__router_historyStack`. Detached
  views aren't even in the tree. Never infer order from `viewTarget` children.
- **`navigationInProgress` is a hard re-entrancy gate.** Concurrent navigations reject. A redirect
  resets it before re-navigating; if you add a code path that dispatches `NavigationStart`, make
  sure a terminal event (`End`/`Error`/`Cancel`) always fires or navigation deadlocks.
- **Promise hooks must always resolve.** A `beforeViewSuspend`/`beforeViewOpen` that never
  resolves stalls navigation forever (the router awaits it).
- **`sgRouter` namespace is view-scoped.** It resolves the router via `m.top.getScene().__router`;
  only call it from inside a View (or its children). The main scene calls
  `initialize`/`addRoutes`/`navigateTo` only.

---

## Not implemented (do not assume these exist)

The following appear in design discussions/older notes but are **not in the current code** —
confirm in source before referencing: `canDeactivate` guards, child/nested routes
(`children`/`parentPattern`), and `ttl` route expiry. There is also **no `keepAliveViewTarget`
SceneGraph node** — detached views live in the `m.__router_detachedViews` AA.
