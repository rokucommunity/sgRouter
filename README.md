# Roku Router – Modern View Management for Roku Applications

<p align="center">
  <img src="https://github.com/user-attachments/assets/734ca644-8d42-49be-84b3-2a717e6f3267" alt="sgRouter-logo" width="120px" height="149px"/>
</p>

<p align="center">
  <em>A lightweight, modern router for Roku SceneGraph apps. Roku Router maps URL-style paths to components, manages view lifecycles, handles parameters, and supports route guards — enabling dynamic and seamless navigation experiences.</em>
</p>

<p align="center">
  <a href="https://github.com/rokucommunity/sgRouter/actions?query=branch%3Amaster+workflow%3Abuild"><img src="https://img.shields.io/github/actions/workflow/status/rokucommunity/sgRouter/build.yml?logo=github&branch=master" alt="Build Status"/></a>
  <a href="https://npmcharts.com/compare/sgrouter?minimal=true"><img src="https://img.shields.io/npm/dm/sgrouter.svg?logo=npm" alt="Downloads"/></a>
  <a href="https://www.npmjs.com/package/sgrouter"><img src="https://img.shields.io/npm/v/sgrouter.svg?logo=npm" alt="Version"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/rokucommunity/sgRouter.svg" alt="License"/></a>
  <a href="https://join.slack.com/t/rokudevelopers/shared_invite/zt-4vw7rg6v-NH46oY7hTktpRIBM_zGvwA"><img src="https://img.shields.io/badge/Slack-RokuCommunity-4A154B?logo=slack" alt="Slack Community"/></a>
</p>

---

## 🚀 Features

- **URL-style navigation** for Roku apps
- **Dynamic routing** with parameter support
- **Named routes** — navigate by intent, not by hardcoded path strings
- **Route guards** (`canActivate`) for protected screens
- **View lifecycle hooks** for fine-grained control
- **Stack management** (root routes, suspension, resume)
- **Observable router state** for debugging or analytics

---

## 🧩 Installation

> Requires [Roku Promises](https://github.com/rokucommunity/promises)

Install via **[ropm](https://www.npmjs.com/package/ropm)**:

```bash
npx ropm install promises@npm:@rokucommunity/promises
npx ropm install sgrouter
```

---

## 🧠 Core Concepts

### Route Configuration

A **route** defines how your Roku app transitions between views. Routes are typically registered in your main scene.

Each route object can include:

| Property | Type | Required | Description |
|-----------|-------|-----------|-------------|
| `pattern` | string | ✅ | URL-like path pattern (`"/details/movies/:id"`) |
| `component` | string | ✅ | View component to render (must extend `rokuRouter_View`) |
| `name` | string | ❌ | Stable identifier for named navigation (e.g. `"movieDetail"`) |
| `clearStackOnResolve` | boolean | ❌ | Clears stack and resets breadcrumbs when true |
| `canActivate` | function | ❌ | Guard function to control route access |

### View Lifecycle Methods

Views extending `rokuRouter_View` can define:

- `beforeViewOpen` → Called before the view loads (e.g. async setup, API calls)
- `onViewOpen` → Called after previous view is closed/suspended
- `beforeViewClose` → Invoked before a view is destroyed
- `onViewSuspend` / `onViewResume` → Handle stack suspensions/resumptions
- `onRouteUpdate` → Fired when navigating to the same route with updated params/hash
- `handleFocus` → Defines focus handling when the view becomes active

---

## 🧱 Example: Main Scene Setup

### **MainScene.xml**
```xml
<component name="MainScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/source/roku_modules/rokurouter/router.brs" />
    <script type="text/brightscript" uri="MainScene.bs" />
    <children>
        <rokuRouter_Outlet id="myOutlet" />
    </children>
</component>
```

### **MainScene.bs**
```brightscript
sub init()
    ' Initialize the router at your main outlet
    rokuRouter.initialize({ outlet: m.top.findNode("myOutlet") })

    rokuRouter.addRoutes([
        { pattern: "/", component: "WelcomeScreen" },
        { pattern: "/shows", component: "CatalogScreen", root: true },
        { pattern: "/movies", component: "CatalogScreen", root: true },
        { pattern: "/details/series/:id", component: "DetailsScreen" },
        { pattern: "/details/series/:id/cast", component: "CastDetailsScreen" },
        { pattern: "/details/movies/:id", component: "DetailsScreen" },
        { pattern: "/details/movies/:id/cast", component: "CastDetailsScreen" },
        { pattern: "/:screenName", component: "DefaultScreen" }
    ])

    rokuRouter.navigateTo("/") ' Go to the welcome view

    ' set the focus to the router
    rokuRouter.setFocus({ focus: true })
end sub
```

---

## 👋 Example: Welcome View

### **WelcomeScreen.xml**
```xml
<component name="WelcomeScreen" extends="rokuRouter_View">
    <script type="text/brightscript" uri="pkg:/source/roku_modules/promises/promises.brs" />
    <script type="text/brightscript" uri="WelcomeScreen.bs" />
    <children>
        <Label id="label" />
    </children>
</component>
```

### **WelcomeScreen.bs**
```brightscript
sub init()
    m.label = m.top.findNode("label")
end sub

' Called before the view is shown
function beforeViewOpen(params as dynamic) as dynamic
    m.label.text = "Hello!"
    return promises.resolve(invalid)
end function
```

---

## 🧭 Observing Router State

You can observe `routerState` for debugging or analytics:

```brightscript
sub init()
    rokuRouter.getRouter().observeField("routerState", "onRouterStateChanged")
end sub

sub onRouterStateChanged(event as Object)
    data = event.getData()
    print `Router state changed: ${data.id} ${data.type} ${data.state}`
end sub
```

**Router State Structure:**
```json
{
  "id": "",
  "type": "",
  "state": {
    "routeConfig": {},
    "queryParams": {},
    "routeParams": {},
    "hash": ""
  }
}
```

---

## 🔒 Route Guards

Route guards let you **allow/deny navigation** based on custom logic (e.g., authentication, feature flags).
A guard is simply any node that exposes a `canActivate` function.

### 1) Create a Guard (Auth example)
**`components/Managers/Auth/AuthManager.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<component name="AuthManager" extends="Node">
    <interface>
        <field id="isLoggedIn" type="boolean" value="false" />
        <function name="canActivate" />
    </interface>
</component>
```

**`components/Managers/Auth/AuthManager.bs`**
```brightscript
import "pkg:/source/router.bs"

' Decide whether navigation should proceed.
' Return true to allow, false or a RedirectCommand to block/redirect.
function canActivate(currentRequest = {} as Object) as Dynamic
    if m.top.isLoggedIn then
        return true
    end if

    dialog = createObject("roSGNode", "Dialog")
    dialog.title = "You must be logged in"
    dialog.optionsDialog = true
    dialog.message = "Press * To Dismiss"
    m.top.getScene().dialog = dialog

    ' Redirect unauthenticated users (e.g., to home or login)
    return rokuRouter.createRedirectCommand("/login")
end function
```

### 2) Register the Guard

Create an instance and expose it globally (so routes can reference it):

**`components/Scene/MainScene/MainScene.bs` (snippet)**
```brightscript
' Create AuthManager and attach to globals
m.global.addFields({
    "AuthManager": createObject("roSGNode", "AuthManager")
})

' (Optional) observe auth changes
m.global.AuthManager.observeField("isLoggedIn", "onAuthManagerIsLoggedInChanged")
```

### 3) Protect Routes with `canActivate`

Attach one or more guards to any route using the `canActivate` array:

```brightscript
rokuRouter.addRoutes([
    { pattern: "/", component: "WelcomeScreen", clearStackOnResolve: true },
    { pattern: "/login", component: "LoginScreen" },

    ' Protected content – requires AuthManager.canActivate to allow
    { pattern: "/shows", component: "CatalogScreen", clearStackOnResolve: true, canActivate: [ m.global.AuthManager ] },
    { pattern: "/movies", component: "CatalogScreen", clearStackOnResolve: true, canActivate: [ m.global.AuthManager ] },
    { pattern: "/details/:type/:id", component: "DetailsScreen", canActivate: [ m.global.AuthManager ] },
    { pattern: "/details/:type/:id/cast", component: "CastDetailsScreen", canActivate: [ m.global.AuthManager ] }
])
```

### 4) What `canActivate` should return

- **`true`** → allow navigation
- **`false`** → block navigation (stay on current view)
- **`RedirectCommand`** → redirect elsewhere without showing the target route
  - Create via `rokuRouter.createRedirectCommand("/somewhere")`

### 5) Accessing the Current Request (optional)

Your guard receives `currentRequest` with the full navigation context, useful for deep-links or conditional flows:

```brightscript
function canActivate(currentRequest as Object) as Dynamic
    ' currentRequest.route.pattern, currentRequest.routeParams, currentRequest.queryParams, currentRequest.hash, etc.
    if currentRequest?.queryParams?.requiresPro = true and not m.top.isProUser then
        return rokuRouter.createRedirectCommand("/upgrade")
    end if
    return true
end function
```

### 6) Example: Feature Flag Guard

You can implement a reusable feature flag guard for gradual rollouts:

```brightscript
function canActivate(currentRequest as Object) as Dynamic
    feature = currentRequest?.routeParams?.feature ' e.g. "/feature/:feature"
    if m.global?.features[feature] = true then
        return true
    end if
    return rokuRouter.createRedirectCommand("/")
end function
```

### 7) Testing Guards Locally

- Toggle login in development: `m.global.AuthManager.isLoggedIn = true`
- Verify redirects by attempting to navigate to a protected route while logged out:
  ```brightscript
  rokuRouter.navigateTo("/shows")
  ```
- Listen to router state changes to confirm block/redirect behavior:
  ```brightscript
  rokuRouter.getRouter().observeField("routerState", "onRouterStateChanged")
  ```

> The included test project already wires up an `AuthManager` and protects `/shows`, `/movies`, and `/details/*` routes using `canActivate`.

---

## 🏷️ Named Routes

Named routes let you navigate by a stable identifier instead of a hardcoded path string. If a path pattern ever changes, only the route config needs updating — every `navigateTo` call site remains valid.

### 1) Add a `name` to your routes

```brightscript
rokuRouter.addRoutes([
    { pattern: "/",                  component: "WelcomeScreen",  name: "home",        clearStackOnResolve: true },
    { pattern: "/movies/:id",        component: "DetailsScreen",  name: "movieDetail"  },
    { pattern: "/settings",          component: "SettingsView",   name: "settings"     },
])
```

`name` is optional — routes without one continue to work exactly as before.

### 2) Navigate by name

Pass an associative array with a `name` key instead of a path string:

```brightscript
' Static route — no params needed
rokuRouter.navigateTo({ name: "home" })

' Dynamic route — params are substituted into :segment placeholders
rokuRouter.navigateTo({ name: "movieDetail", params: { id: 42 } })
' Resolves to: /movies/42

' Extra params beyond what the pattern requires become query parameters
rokuRouter.navigateTo({ name: "movieDetail", params: { id: 42, autoplay: true } })
' Resolves to: /movies/42?autoplay=true
```

String arguments are unchanged — literal path logic runs with zero overhead:

```brightscript
rokuRouter.navigateTo("/movies/42")   ' still works exactly as before
```

### 3) Backend-driven navigation

Named routes remove the need for client code to reconstruct URL strings from backend responses:

```brightscript
' Backend response: { screen: "movieDetail", id: 42 }
response = m.global.ApiManager.getDeepLink()
rokuRouter.navigateTo({ name: response.screen, params: { id: response.id } })
```

### 4) Error handling

If the name is not found or a required param is missing, a warning is printed and navigation is cancelled. The history stack is unchanged and no lifecycle hooks are triggered.

```brightscript
rokuRouter.navigateTo({ name: "doesNotExist" })
' [WARN] Roku Router: no route found with name "doesNotExist"

rokuRouter.navigateTo({ name: "movieDetail" })
' [WARN] Roku Router: missing required param "id" for route "movieDetail" (/movies/:id)
```

Extra params beyond what the pattern requires are silently appended as query parameters — no warning is logged.

Duplicate names at registration time log a warning and the first registration wins:

```brightscript
' [WARN] Roku Router: duplicate route name "home" — first registration wins (pattern: /)
```

---

## 🧭 Route Snapshot in lifecycle hooks `beforeViewOpen`, `onViewOpen`, `onRouteUpdate`

Every view lifecycle receives a **route snapshot** so your screen logic can react to the URL that triggered navigation.

### What you get in `params`

`params` is constructed by the router just before the lifecycle is called, and includes:

```text
params.route.routeConfig   ' the matched route definition
params.route.routeParams   ' extracted from pattern placeholders (e.g. :id, :type)
params.route.queryParams   ' parsed from ?key=value pairs
params.route.hash          ' parsed from #hash
```

The snapshot is sourced from the URL you navigated to (e.g. `"/details/movies/42?page=2&sort=trending#grid=poster"`). The router builds this object and passes it into `beforeViewOpen(params)`, `onViewOpen(params)`, and `onRouteUpdate(params)`.

### Example: Using it in a Catalog view

```brightscript
' CatalogScreen.bs (excerpt)
function beforeViewOpen(params as object) as dynamic
    ' Read route params (e.g., /:type and /:id)
    contentType = params.route.routeParams?.type    ' "shows" or "movies"
    itemId      = params.route.routeParams?.id      ' e.g., "42"

    ' Read query params (?page=2&sort=trending)
    pageIndex = val(params.route.queryParams?.page)    ' 2
    sortKey   = params.route.queryParams?.sort         ' "trending"

    ' Optional: hash fragment (#grid=poster)
    gridMode = params.route.hash

    ' Kick off data loading based on URL snapshot
    ' ... start tasks or fetches here ...

    ' Return a promise to delay opening until ready,
    ' or return true to open immediately and manage loading UI yourself.
    return promises.resolve(invalid)
end function

' If you navigate to the **same route pattern** with different params or hash,
' `onRouteUpdate(params)` will fire (when `allowReuse` is enabled),
' allowing you to update the view without rebuilding it.
' CatalogScreen.bs (excerpt)
function onRouteUpdate(params as object) as dynamic
    oldRoute = params.oldRoute
    newRoute = params.newRoute

    return promises.resolve(invalid)
end function
```


### Where the snapshot comes from

The route snapshot is assembled by the router by parsing:
- the **pattern match** result → `routeParams`
- the **query string** → `queryParams`
- the **hash** → `hash`

That structured object is then provided to the view lifecycles mentioned above. This keeps your screens URL-driven and easy to test (you can navigate with different URLs and assert behavior based on `params`).

---
## 💬 Community & Support

- Join the [Roku Developers Slack](https://join.slack.com/t/rokudevelopers/shared_invite/zt-4vw7rg6v-NH46oY7hTktpRIBM_zGvwA)
- Report issues or request features via [GitHub Issues](https://github.com/rokucommunity/sgRouter/issues)

---

## 📄 License

Licensed under the [MIT License](LICENSE).
