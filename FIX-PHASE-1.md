# Phase 1 — Fix Missing `await` and Add Navigation

You are fixing bugs in a Next.js 15 App Router project at `D:\WORKS\Minty\NewMintyAprill2026\AprillBuild`.

## Context

The file `lib/supabase/server.js` exports `createClient` as an **async** function:

```js
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(...)
}
```

Multiple files call it **without `await`**, which means `supabase` ends up being a Promise instead of a Supabase client. Every database operation on that variable silently fails. This is why the shopping list, menus, and several other features are completely broken.

Additionally, many of these files redundantly do `const cookieStore = await cookies()` and pass it to `createClient(cookieStore)` — but `createClient` takes **no parameters** and calls `cookies()` internally. Remove the redundant `cookies()` call and the parameter.

---

## Task 1.1 — Fix `app/api/shopping-list/route.js`

This file has 4 broken `createClient` calls. Fix ALL of them.

**Find every occurrence of this pattern:**
```js
const cookieStore = await cookies()
const supabase = createClient(cookieStore)
```

**Replace with:**
```js
const supabase = await createClient()
```

There are 4 functions in this file (GET, POST, PATCH, DELETE). Each one has this bug. Fix all 4.

Also remove the `import { cookies } from 'next/headers'` line at the top since it's no longer needed (createClient handles cookies internally).

---

## Task 1.2 — Fix `app/api/shopping-list/count/route.js`

Same bug. Find:
```js
const cookieStore = await cookies()
const supabase = createClient(cookieStore)
```

Replace with:
```js
const supabase = await createClient()
```

Remove the `import { cookies } from 'next/headers'` import.

---

## Task 1.3 — Fix `app/api/menus/apply/route.js`

Read this file. Find the same pattern where `createClient` is called without `await` or with `cookieStore` passed. Fix it to `const supabase = await createClient()`. Remove unused `cookies` import if present.

---

## Task 1.4 — Fix `app/menus/page.jsx`

This file has:
```js
const cookieStore = cookies()
let supabase = createClient(cookieStore)
```

Two bugs here: `cookies()` is async in Next.js 15 (needs `await`), AND `createClient` is async (needs `await`). Fix to:
```js
const supabase = await createClient()
```

Remove the `import { cookies } from 'next/headers'` import. The file also imports `createPublicClient` from the same module — keep that import.

---

## Task 1.5 — Fix `app/menus/[slug]/page.jsx`

This file has TWO broken calls. Look for both:
```js
const authClient = createClient(cookieStore)
```

These must become:
```js
const authClient = await createClient()
```

Remove the `cookies` import and any `const cookieStore = cookies()` lines.

---

## Task 1.6 — Fix `app/shopping-list/page.jsx`

Find:
```js
const cookieStore = await cookies()
const supabase = createClient(cookieStore)
```

Replace with:
```js
const supabase = await createClient()
```

Remove the `import { cookies } from 'next/headers'` import.

---

## Task 1.7 — Add AppNav to layout

Open `app/layout.jsx`. Currently it renders:
```jsx
<ThemeProvider>
  <AuthProvider>
    {children}
    <ThemeToggle />
  </AuthProvider>
</ThemeProvider>
```

The new version has a navigation component at `components/shared/AppNav.jsx` but it's never rendered in the layout. The old working version renders `<Navbar />` in its layout.

Add the import and render AppNav:

```jsx
import AppNav from '@/components/shared/AppNav'
```

Then in the body, render it before `{children}`:
```jsx
<ThemeProvider>
  <AuthProvider>
    <AppNav />
    <main style={{ minHeight: '100vh' }}>{children}</main>
    <ThemeToggle />
  </AuthProvider>
</ThemeProvider>
```

Note: The landing page (`app/page.jsx`) likely has its own nav. Check if `app/page.jsx` renders its own `LandingClient` with a built-in navbar. If so, AppNav should NOT render on the root `/` path. In that case, make AppNav conditionally hide on `/` by checking `usePathname()` — it already imports `usePathname`. Add at the top of the component:
```js
if (pathname === '/') return null
```

---

## Verification

After all fixes, run:
```
cd D:\WORKS\Minty\NewMintyAprill2026\AprillBuild
npx next build
```

The build must complete without errors. If there are TypeScript or import errors, fix them.
