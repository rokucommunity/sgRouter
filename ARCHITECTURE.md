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
| `__router_navigationInProgress` | Bool | Set true on `NavigationStart`, false on `NavigationEnd`/`NavigationError` (and by the catches/`NavigationCancel` callers). When true, a new `navigateTo`/`goBack`/`popToCheckpoint` **cancels** the in-flight navigation rather than being rejected (see [Interruptible navigation](#interruptible-navigation-navigatetogobackpoptocheckpoint)). |
| `__router_activeNavRoute` | Node | The route of the navigation currently in flight; stashed on `NavigationStart`. Doubles as the **supersession token**: chain checkpoints compare their route id against it (`_isSuperseded`) and bail if a newer request replaced/invalidated it. |
| `__router_pendingNavigation` | AA \| Invalid | Single "pending redirect" slot for a `navigateTo({ abortCurrentNavigation: false })` made while a nav was in flight: `{ path, options, deferred }`. Run after the current nav's `NavigationEnd` (see [Interruptible navigation](#interruptible-navigation-navigatetogobackpoptocheckpoint)). Last-wins; dropped+rejected on cancel/error/destroy. Not a queue. |
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

`_navigateTo` is a thin wrapper: if `navigationInProgress`, it **cancels** the in-flight navigation
(see [Interruptible navigation](#interruptible-navigation-navigatetogobackpoptocheckpoint)) and then
runs `_navigateToImpl(...)`. The steps below describe `_navigateToImpl`.

1. **Gate**: reject if not initialized; reject invalid path. (The in-progress check lives in the
   wrapper — the impl assumes it is clear to run.)
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
6. `catch` resets `navigationInProgress` and re-rejects — **except** for a cancellation
   (`error.cancelled`), where it just re-rejects (the superseding request owns the terminal
   event and in-progress state). Chain checkpoints (`_isSuperseded`) reject `{ cancelled: true }`
   when a newer request has taken over.

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

**`_goBack`**: a wrapper — if `navigationInProgress`, it **cancels** the in-flight navigation
(`_cancelActiveNavigation`) and returns `true` **without popping history** (stay on the current
view); otherwise runs `_goBackImpl`. Always a `Boolean`, never a promise, so `onKeyEvent` can use
it. `_goBackImpl` needs ≥2 history entries, resolves the second-to-last entry's view (tolerating
stale ids), re-attaches if detached, dispatches `NavigationStart`, `closeOrSuspendView`s the current
view, then in `.then`: bails if `_isSuperseded`, else applies pop navigation state, **pops** the
history stack, `showView(view, onResume=true)`. The `back` key in `Outlet.bs`/`View.bs onKeyEvent`
calls `sgRouter.goBack()`.

**`_setCheckpoint(identifier)`**: stamps `hasCheckpoint`/`checkpointIds[identifier]=true` onto the
**last** history entry. Identifier defaults to the active route's `path`. Idempotent; no-op on
empty stack.

**`_popToCheckpoint(identifier)`**: a wrapper — if `navigationInProgress`, it **cancels** the
in-flight navigation and then runs `_popToCheckpointImpl(...)`.
`_popToCheckpointImpl` searches the stack backward from `count()-2` for a matching checkpoint (any
checkpoint if identifier omitted/`"__INVALID__"`). It then runs in **two phases, split by the
supersession checkpoint**, so that a cancelled pop rolls back:
1. *Reversible.* Dispatch `NavigationStart`, collect `viewsToPop` (in-tree children above the
   target, plus non-keepAlive views in the detach store; keepAlive detached views stay suspended),
   and run their **exit hooks only** — `_beforeViewSuspend` for keepAlive, `_beforeViewClose`
   otherwise. Nothing is destroyed, removed from the store, hidden or truncated yet.
2. *Commit (after `_isSuperseded` passes).* Truncate the stack to `[0..targetIndex]`, re-attach the
   target if it was detached, `finalizePoppedViews(viewsToPop)` (keepAlive: hide → `_onViewSuspend`
   → final placement, **awaited**; others: destroyed), then `showView(target, true)`.

Rejects on no match. No `canDeactivate` guards exist.

---

## Interruptible navigation (`navigateTo`/`goBack`/`popToCheckpoint`)

Only one navigation runs at a time. A request made while `navigationInProgress` **cancels** the
in-flight navigation and takes over (it is **not** queued or rejected):
- `navigateTo` / `popToCheckpoint` → cancel the in-flight navigation, then run themselves.
- `goBack` → cancel the in-flight navigation and return `true` **without** popping history (stay on
  the current view).

Each public entry point is a thin **wrapper** over an `Impl` (`_navigateToImpl` /
`_popToCheckpointImpl` / `_goBackImpl`): if `navigationInProgress`, call `_cancelActiveNavigation()`
first, then run the impl (except `goBack`, which returns after cancelling).

Mechanism — supersession token:
- `m.__router_activeNavRoute` is the route of the in-flight navigation, stashed on `NavigationStart`.
- `_cancelActiveNavigation()` dispatches a route-bearing `NavigationCancel` for it, sets
  `m.__router_activeNavRoute = Invalid`, and clears `navigationInProgress`/`processingGoBack`. A
  subsequent `navigateTo`/`popToCheckpoint` then dispatches its own `NavigationStart`, installing a
  fresh token; `goBack` leaves it `Invalid` (nothing new starts).
- `_isSuperseded(route)` returns true when `route.id` no longer matches `m.__router_activeNavRoute`
  (or the token is `Invalid`). The navigation chain calls it at each checkpoint — before guards,
  after guards, after the incoming view's `beforeViewOpen` (the dominant window), before `showView`,
  and inside `showView`'s `.finally` — and bails by rejecting `{ cancelled: true }`.
- On bail, `_cleanupSupersededIncomingView(view, fromKeepAlive)` destroys a freshly-created incoming
  view (or, for a resumed keepAlive view, returns it to the detach store so it is not lost). The
  outgoing view is untouched at the dominant checkpoint (post-`beforeViewOpen`), so the current view
  stays intact. The terminal catches short-circuit on `error.cancelled` (no `NavigationError`, no
  flag reset — the superseding request owns that).

Events an observer sees when nav A is superseded by nav B: `...A NavigationStart... → NavigationCancel (A) → NavigationStart (B) → ... → NavigationEnd (B)`. A's returned promise rejects with `{ cancelled: true }`.

**Cancel during the commit phase.** A cancel can arrive after the dominant `beforeViewOpen` window,
while the outgoing view is suspending or the incoming view is opening. The router handles these so a
cancel with no replacement navigation (a `goBack` cancel-only) does not corrupt state:
- **During the outgoing view's `beforeViewClose` / `beforeViewSuspend`:** `closeOrSuspendView`,
  `closeView` and `suspendView` all take the requesting navigation's route. If that navigation was
  superseded while the hook ran, the teardown is abandoned — `closeView` skips `removeNode`,
  `suspendView` skips `hideView` / `_onViewSuspend` / final placement — leaving the outgoing view
  visible and active (no blank screen), and `_resumeAfterAbortedTeardown` fires the view's
  `onViewResume` so it can undo an exit animation (and, after a close, regain focus eligibility,
  which `_beforeViewClose` had cleared). **Any new teardown call site must pass the nav route**, or a
  cancelled navigation destroys the screen it was leaving. (`_popToCheckpointImpl` tears several
  views down at once, so it gets the same guarantee structurally instead — see below.)
- **`showView` uses `.then`/`.catch`, not `.finally`.** The success `.then` re-checks `_isSuperseded`
  *before* committing and, if superseded, **rejects** (so the caller's post-show cleanup is skipped
  too — it no longer destroys a dead navigation's `closeViews` or reverts its override). A committed
  navigation that then spawns a deferred successor is not treated as superseded (the check runs before
  the commit). The `.catch` turns a rejected `onViewOpen`/`onViewResume` into a **`NavigationError`**
  (not a bogus `NavigationEnd`).
- **Cancel after the incoming view was shown:** if the cancel lands while the incoming view's
  `onViewOpen` is still running (it has already been shown and made active — e.g. an animated
  entrance), a `goBack` cancel-only calls `_restoreCurrentViewAfterCancel()`: it tears down that
  half-committed incoming view (destroying a fresh view / re-suspending a keepAlive one) and restores
  the history-top view as active and visible (re-attaching it if it was detached, firing
  `onViewResume`). So `goBack` genuinely returns to the current screen instead of stranding the user
  on the view that was animating in. This runs only for `goBack` cancel-only; `navigateTo`/
  `popToCheckpoint` cancels are followed by a replacement navigation that adopts the incoming view as
  its own outgoing.

**A cancelled `popToCheckpoint` rolls back.** A pop touches many views and the stack at once, so
instead of aborting each teardown it splits into a reversible phase and a commit phase either side
of its `_isSuperseded` check (see [goBack & checkpoints](#goback--checkpoints)). Cancelled before
the target is shown, it has changed nothing: the stack is untruncated, every view is alive and still
in its place (in the tree or the detach store), and the target was never re-attached. The rollback
only calls `_resumeAfterAbortedTeardown` on the one view that was on screen — and skips even that
when `m.__router_activeNavRoute` is live, because a replacement navigation has adopted that view as
its own outgoing and is suspending it. **The target view is never touched on rollback**: a
replacement navigation may already have resumed it, and re-detaching it would blank the screen.

The one window that is not reversible is the same as for a forward navigation: once `showView` has
started, the stack is truncated and the views above the target are gone. A cancel there behaves like
any other post-commit cancel.

### Opt-out: `abortCurrentNavigation: false` (redirect after the current nav)

`abortCurrentNavigation` (an option on `navigateTo`) **defaults to `true`** — the cancel-and-take-over
behavior above. Passing `false` inverts it when a nav is in flight: instead of cancelling, the request
is stashed in the single `m.__router_pendingNavigation` slot and run once the current nav completes.
Push semantics — the current screen finishes (pushed to history), then the deferred one is a normal
forward nav on top; back returns to it. Wiring:
- The `_navigateTo` wrapper checks `options.abortCurrentNavigation = false` *before*
  `_cancelActiveNavigation`: if false and busy, it stashes `{ path, options, deferred }` (via
  `promises.create()`) and returns the deferred (last-wins: a second deferred request rejects and
  replaces the first). Any other value (true/absent) → cancel, the default.
- `showView`'s `.finally` calls `_runPendingNavigation()` immediately after `NavigationEnd` (the only
  trigger). At that point `navigationInProgress` is false, so the pending `_navigateTo` runs cleanly;
  `_settleInto` forwards its settlement to the returned deferred. Since Y's `NavigationStart` fires
  synchronously and Y parks, X's post-show `.then` (override revert from X's own chain context) runs
  before Y resumes — no interference; Y captures `m.__router_activeView` (still X) as its outgoing.
- `_clearPendingNavigation(true)` (rejects the deferred so no caller hangs) runs from
  `_cancelActiveNavigation`, the three terminal-error catches, and `_destroy` — so a pending redirect
  is dropped whenever the nav it was attached to is cancelled/errors/torn down.
- **Deadlock:** never `return`/await the deferred from the hook that created it — the pending nav only
  runs after that hook's nav reaches `NavigationEnd`, which awaits the hook. Fire-and-forget.

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
`{ id, type, url?, state?, error? }`, where `state` is the route snapshot
`{ routeConfig, routeParams, queryParams, navigationState, hash }` (see `createRouteSnapshot`).
`dispatchRouterState` also flips the `navigationInProgress` flag on Start/End/Error.

**Terminal-event guarantee:** every navigation that dispatched `NavigationStart` ends with exactly
one terminal event — `NavigationEnd`, `NavigationError`, or `NavigationCancel` — and all of them
carry the route (so `state`/`navigationState`/`url` are populated). All three navigation entry
points (`_navigateTo`, `_goBack`, `_popToCheckpoint`) have a catch-all `.catch` that emits a
route-bearing `NavigationError` for rejections that would otherwise be silent (invalid guard
result, view-creation failure, a lifecycle hook rejecting) and clears the in-progress flags so a
later navigation is not permanently blocked. `dispatchRouterState` tracks this via
`m.__router_terminalDispatched` (set on End/Error/Cancel, cleared on Start) so a catch never
double-dispatches or converts a `Cancel` into an `Error`; `m.__router_activeNavRoute` is stashed on
`NavigationStart` to give each catch a route to report. Note `NavigationCancel` is terminal but
does **not** reset `navigationInProgress` — its caller (or the catch) does.

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
- **Inline functions don't close over outer locals; pass data via the chain context or `m`.**
  BrighterScript anonymous functions compile to standalone functions — they cannot read the
  enclosing function's local variables. In a `promises.chain(p, ctx)`, the `ctx` is delivered as the
  **2nd arg to `.then` *and* `.catch`** callbacks (`.finally` gets it as its only arg) — so the
  `addViewToStack` catch reverts the outgoing override from `internalContext` (its own captured
  values, immune to a later navigation clobbering them). For state not threaded through a chain,
  read from `m` (e.g. `_isSuperseded` reads `m.__router_activeNavRoute`). What does *not* work is
  referencing a plain outer local inside the callback.
- **History stack ≠ tree child order.** Back navigation reads `__router_historyStack`. Detached
  views aren't even in the tree. Never infer order from `viewTarget` children.
- **A new navigation cancels the in-flight one; it never queues or rejects.** See
  [Interruptible navigation](#interruptible-navigation-navigatetogobackpoptocheckpoint). If you add
  a code path that dispatches `NavigationStart`, stash the route as `m.__router_activeNavRoute` (the
  supersession token) and add `_isSuperseded` checkpoints at each async boundary, or a cancelled
  navigation will keep running and corrupt state. Ensure exactly one terminal event
  (`End`/`Error`/`Cancel`) fires per navigation. A guard redirect briefly clears
  `navigationInProgress` before re-navigating — that is a continuation, not a cancel.
- **A cancellation must never destroy the outgoing view.** The view the user is looking at is torn
  down only by a navigation that goes on to show something in its place. Two mechanisms enforce
  this, and a new teardown path must use one of them: pass the nav route to
  `closeOrSuspendView`/`closeView`/`suspendView` so the teardown aborts on supersession (`goBack`,
  forward nav), or split the exit hooks from the destructive work either side of the `_isSuperseded`
  check (`popToCheckpoint`). See
  [Cancel during the commit phase](#interruptible-navigation-navigatetogobackpoptocheckpoint).
- **A genuine failure still runs `finalizeCloseViews`; a cancellation doesn't.** `addViewToStack`
  tears its `closeViews` down on both the success and the error path — they already had
  `beforeViewClose` called on them, so skipping it strands them in the tree. Only a superseded
  navigation skips it, because the request that superseded it owns those views now.
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
