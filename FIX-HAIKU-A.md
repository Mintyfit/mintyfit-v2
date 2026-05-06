# Fix A — Navigation + Redirect

Project: D:\WORKS\Minty\NewMintyAprill2026\AprillBuild

## Fix A1 — Add /planner redirect to /plan

The app uses /plan but the Vercel URL /planner is being hit. Add a redirect.

Open `next.config.mjs`. Add a `redirects` function alongside the existing `headers` function:

```js
async redirects() {
  return [
    { source: '/planner', destination: '/plan', permanent: true },
    { source: '/journal', destination: '/plan', permanent: true },
  ]
},
```

## Fix A2 — Remove duplicate landing Navbar, keep AppNav always visible

Currently the landing page (`/`) renders `LandingClient` which includes its own `Navbar`. AppNav in the layout returns null on `/`. This creates two navbars on landing and no nav elsewhere for logged-out users.

The fix: make AppNav render on ALL pages, remove the separate landing Navbar.

**Step 1:** Open `components/shared/AppNav.jsx`. Remove the early return:
```js
if (pathname === '/') return null
```
Delete that line entirely.

**Step 2:** Open `components/landing/LandingClient.jsx`.
- Remove the `import Navbar from './Navbar'` line
- Remove `import AuthModal from './AuthModal'` if AuthModal is only used via Navbar (check first)
- Remove the `<Navbar onOpenAuth={() => openAuth('signin')} />` line from the JSX
- Remove the `openAuth`, `authOpen`, `authTab` state and the `<AuthModal .../>` at the bottom IF they were only used by Navbar. Check carefully — if AuthModal is used elsewhere in LandingClient keep it.

**Step 3:** AppNav currently has no Sign In button for logged-out users on the landing page. Open `components/shared/AppNav.jsx`, find the auth section (around where it renders `user ? ... : <Link href="/?auth=login">Sign in</Link>`). Make sure it shows a Sign In button for unauthenticated users. It should already have this — verify it's there and if not add it.

**Step 4:** Open `components/landing/Navbar.jsx` — you can leave this file as-is (don't delete it) but it won't be used anymore.

## Fix A3 — Handle /?auth=login modal trigger in AppNav

The Sign In link in AppNav points to `/?auth=login`. The landing page's AuthModal was previously triggered by this. Now that LandingClient no longer manages auth state via its own Navbar, we need AppNav to handle the modal.

Open `components/shared/AppNav.jsx`. Add state and AuthModal import:

```js
import AuthModal from '@/components/landing/AuthModal'
```

Add state:
```js
const [authOpen, setAuthOpen] = useState(false)
const [authTab, setAuthTab] = useState('signin')
```

Add a `useEffect` to detect `?auth=login` or `?auth=signup` in the URL and auto-open the modal:
```js
import { useSearchParams, useRouter } from 'next/navigation'
// inside component:
const searchParams = useSearchParams()
const router = useRouter()
useEffect(() => {
  const auth = searchParams.get('auth')
  if (auth === 'login' || auth === 'signin') { setAuthTab('signin'); setAuthOpen(true) }
  if (auth === 'signup') { setAuthTab('signup'); setAuthOpen(true) }
}, [searchParams])
```

Change the Sign In link from a `<Link>` to a `<button>`:
```jsx
<button
  onClick={() => { setAuthTab('signin'); setAuthOpen(true) }}
  style={{ background: 'var(--primary)', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}
>
  Sign in
</button>
```

Add the AuthModal at the bottom of the return, before the closing fragment:
```jsx
<AuthModal
  isOpen={authOpen}
  onClose={() => { setAuthOpen(false); router.replace(pathname, { scroll: false }) }}
  onSuccess={() => { setAuthOpen(false); router.replace(pathname, { scroll: false }) }}
  defaultTab={authTab}
/>
```

Also wrap AppNav in `<Suspense>` in the layout because `useSearchParams` requires it. Open `app/layout.jsx` and wrap `<AppNav />` with:
```jsx
import { Suspense } from 'react'
// then:
<Suspense fallback={null}><AppNav /></Suspense>
```

## Verification

Run `npx next build`. Build must pass with 0 errors.
