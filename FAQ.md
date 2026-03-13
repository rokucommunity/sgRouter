# sgRouter FAQ

## Getting Started & Installation

**What is sgRouter?**
sgRouter is a router for Roku SceneGraph applications. It maps URL-style paths to components, manages view lifecycles, and handles navigation state. It's designed to make view management in Roku apps more predictable and easier to reason about.

**What are the requirements?**
sgRouter requires [Roku Promises](https://github.com/rokucommunity/promises). Both packages can be installed via [ROPM](https://github.com/rokucommunity/ropm).

**How do I install it?**
We recommend installing via [ROPM](https://github.com/rokucommunity/ropm) (Roku Package Manager), which handles dependency management and keeps your project up to date:

```
npx ropm install promises@npm:@rokucommunity/promises
npx ropm install sgRouter@npm:@rokucommunity/sgrouter
```

**Do I need to use ROPM?**
[ROPM](https://github.com/rokucommunity/ropm) is the recommended approach, but it is not strictly required. [ROPM](https://github.com/rokucommunity/ropm) makes it easier to manage dependencies and pull in updates as the project evolves.

**Is sgRouter production ready?**
Not yet. sgRouter is currently in early alpha. The API may change slightly between releases. We'd encourage you to try it out and share feedback, but hold off on shipping it in production apps until a stable release is available.

**Where can I find the source code and report issues?**
The repository is on GitHub: https://github.com/rokucommunity/sgRouter. Bug reports and feature requests can be filed via GitHub Issues.

---

## Focus Management

**Does sgRouter manage focus for me?**
No. sgRouter is deliberately hands-off when it comes to focus. Your views are fully responsible for their own focus logic. sgRouter will tell a view when it's active via lifecycle hooks like `handleFocus`, `onViewOpen` and `onViewResume`, but what you do with focus at that point is entirely up to you.

**Why doesn't sgRouter handle focus automatically?**
Focus management in Roku SceneGraph apps is highly application-specific. Different screens have different focus requirements, and making assumptions about that would cause more problems than it solves. Keeping focus management in your views means you stay in control.

**How do I know when to set focus in my view?**
The recommended approach is to implement the `handleFocus` lifecycle hook in your view. This is called by the router when the view becomes active and should take over focus, making it the right place to set your initial focus logic.

**What does `sgRouter.setFocus` do then?**
`sgRouter.setFocus` records a focus request and, if there is an active view that implements focus handling, notifies that view (via its public `handleFocus` hook and internal `_handleFocus(...)` logic) so it can move focus to the appropriate node. `sgRouter.setFocus` itself does **not** fall back to calling `setFocus(true)` on the outlet or Router node when the view returns `false`. The only built-in fallback focus behavior is a `m.top.setFocus(true)` call on the Router node that runs after `showView(...)` completes. It's not related to the internal focus management logic within individual views.

---

## View Lifecycle Hooks

**What lifecycle hooks are available?**
Views extending `sgRouter_View` can define the following:

- `beforeViewOpen(params)` — called before the view is shown, useful for async setup or API calls
- `onViewOpen(params)` — called when the view opens
- `beforeViewClose(params)` — called before the view is destroyed
- `onViewSuspend(params)` — called when a new view navigates on top of this one, or when the view is kept alive in the background via `keepAlive`
- `onViewResume(params)` — called when the view returns to the top of the stack
- `onRouteUpdate(event)` — called when navigating to the same route; receives `{ oldRoute, newRoute }` — see below. To reuse the existing view when only route params or query params change, set `allowReuse: true` on the route. Hash-only navigations or re-navigating to the identical path can still trigger `onRouteUpdate` without `allowReuse`.
- `handleFocus()` — called when the view becomes active and needs to handle focus

**What is `beforeViewOpen` useful for?**
It's the right place to do any setup work before a view is shown, such as kicking off a network request or preparing data. You can return a Promise to delay the view opening until the work is done, or return immediately and manage a loading state yourself.

**What is the difference between `onViewSuspend` and `beforeViewClose`?**
`onViewSuspend` is called when a view is pushed down the stack by a new view, or when it is kept alive in the background via `keepAlive`. In both cases the view is still alive and can be resumed later. `beforeViewClose` is called when a view is about to be permanently destroyed.

**What params does each lifecycle hook receive?**
`beforeViewOpen`, `onViewOpen`, `beforeViewClose`, `onViewSuspend`, and `onViewResume` all receive a `params` object containing a route snapshot:

- `params.route.routeConfig` — the matched route definition
- `params.route.routeParams` — values extracted from URL placeholders like `:id`
- `params.route.queryParams` — values parsed from `?key=value` pairs
- `params.route.hash` — the hash fragment
- `params.route.navigationState` — how the navigation was triggered (forward push, back, keepAlive resume, or redirect)

`onRouteUpdate` is different — it receives a `RouteUpdateEvent` with both the old and new route:

- `event.oldRoute` — the route that was active before the update
- `event.newRoute` — the incoming route (with updated params, query params, or hash)

**What is `onRouteUpdate` and when does it fire?**
`onRouteUpdate` fires whenever the router reuses the currently active route instead of destroying and rebuilding it. This includes navigating to the same route with different params or query params (when `allowReuse: true` is set), navigating with only the hash fragment changed, and navigating again to an identical path. Use this hook to update the view in place when the route changes but the underlying view instance is kept alive.

Unlike the other lifecycle hooks, `onRouteUpdate` receives a `RouteUpdateEvent` with both the old and new route (`event.oldRoute` and `event.newRoute`), so you can diff the two and respond to exactly what changed.

---

## Comparison to Other Routers

**Are there other routers for Roku?**
There are a small number of community projects that touch on navigation for Roku apps, but purpose-built URL-style routers for SceneGraph are rare. Most Roku apps handle navigation manually.

**Why build sgRouter instead of using an existing solution?**
The existing approaches tend to be tightly coupled to specific app architectures or require you to give up a lot of control. sgRouter was built to be flexible enough to fit into different app structures without dictating how you write your views.

**How is sgRouter different from managing views manually?**
Manual view management works fine for simple apps, but gets difficult to maintain as the number of screens grows. sgRouter gives you a consistent pattern for defining routes, a predictable lifecycle for each view, and a single place to manage navigation state and guards. The goal is to reduce the amount of custom wiring you need to write yourself.

**Does sgRouter work with BrightScript as well as BrighterScript?**
Yes. sgRouter works with both BrightScript and BrighterScript.
