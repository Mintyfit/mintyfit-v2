# MintyFit v2 Build Fixes - Working Document

## Current Status (Apr 10, 2026)

### What's Working (Apr 10, 2026 - CONFIRMED)
- ✅ Local dev server runs on port 3000
- ✅ Recipes page shows data
- ✅ Plan page opens (after login)
- ✅ No hydration errors on home page
- ✅ Top menu bar shows up
- ✅ Supabase API key fixed - uses `supabase` not `supabase`

### What Needs Testing
- Plan page - adding recipes (drag & drop)
- Shopping list functionality
- Login/signup flow end-to-end

---

## Key Issues Fixed

### 1. Auth Context - Invalid API Key

**Problem:** Login failed with "Invalid API key" error

**Root Cause:** 
- Used `getUser()` instead of `getSession()` 
- Missing auth functions (signUp, signInWithEmail, etc.)
- Profile fetching missing

**Fix:** `contexts/AuthContext.jsx`
```javascript
// Before (WRONG):
supabase.auth.getUser().then(...)

// After (CORRECT):
supabase.auth.getSession().then(...)
```

**Also added:**
- `signUp()`, `signInWithEmail()`, `signInWithGoogle()`, `signOut()`, `resetPassword()`
- Profile fetching from `profiles` table
- `authReady` state

---

### 2. Hydration Errors - Theme Context

**Problem:** 
```
Hydration failed because the server rendered HTML didn't match the client
```
- Different `<nav>` rendering on server vs client
- `dark` value changed after hydration

**Root Cause:** 
- ThemeContext started with `false` and then changed to actual value from localStorage
- Navbar tried to render immediately with variable `dark` value

**Fix:** `contexts/ThemeContext.jsx`
```javascript
// Start with undefined instead of false
const [dark, setDark] = useState(undefined)
const [loading, setLoading] = useState(true)
```

**Fix:** `components/landing/Navbar.jsx`
```javascript
// Use stable default during render
const isDark = dark === true  // undefined === false, so isDark = false
```

---

### 3. Recipe/Menu Pages Not Loading

**Problem:** Recipes and menus not displaying from Supabase

**Root Cause:** 
- Had null check guards that blocked queries
- Used wrong auth method

**Fix:** `app/recipes/page.jsx`, `app/menus/page.jsx`
```javascript
// REMOVED the overly-aggressive null checks
// Just run the query:
const { data: publicRecipes, error } = await supabase.from('recipes').select('*')...
```

---

### 4. Nav Missing / Not Showing

**Problem:** 
- Top nav didn't show up on home page

**Root Cause:** 
- Navbar was waiting for `themeLoading` to be false
- Loading state blocked rendering during SSR

**Fix:** `components/landing/Navbar.jsx`
```javascript
// REMOVED the loading check
// Before:
const loading = authLoading || themeLoading
if (loading) return <nav style={{height:64}} />

// After: Just render with stable defaults
const { dark } = useTheme()  // removed loading check
```

---

### 5. API Key Setup - CRITICAL!

**The CORRECT API key uses `supabase` not `supabase` in the JWT issuer!**

Get the correct key from Supabase Dashboard → Project Settings → API → `Project API keys` → `anon public` key.

**Required Environment Variables in `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://gqpdgopvzgtpupymxkva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key-from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase>
```

**The wrong key has this pattern (OLD):**
```
eyJpc3MiOiJzdXBiYWJzZSIsInJlZiI6...
```

**The correct key has this pattern:**
```
eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

Note: `supabase` vs `supabase` - one has `a` after `sup`. You provided `supabase` which is CORRECT.

---

### 6. Nav Not Rendering

**Problem:** Top nav empty / not showing

**Root Cause:** Loading state check was blocking render during SSR

**Fix:** Removed `loading` check from Navbar - render immediately with stable defaults

---

## Testing Results (Apr 10, 2026)

| Test | Status |
|-----|--------|
| Home page loads | ✅ |
| Top nav shows | ✅ |
| Recipes page data | ✅ |
| Plan page opens | ✅ |
| Hydration errors | ✅ Fixed |

---

## Architecture Notes

### Old vs New Version

**Old Version (Backup):**
- Vite + React Router DOM (SPA)
- `react-router-dom` for routing
- Uses `VITE_` prefix for env vars

**New Version (Current):**
- Next.js 15 App Router (SSR)
- File-based routing in `app/` directory
- Uses `NEXT_PUBLIC_` prefix for env vars

### Key Files

| File | Purpose |
|------|---------|
| `app/layout.jsx` | Root layout with ThemeProvider, AuthProvider |
| `app/page.jsx` | Home page (landing) |
| `app/plan/page.jsx` | Meal planner (protected) |
| `contexts/AuthContext.jsx` | Auth state, login functions |
| `contexts/ThemeContext.jsx` | Dark/light theme state |
| `lib/supabase/client.js` | Browser client (singleton) |
| `lib/supabase/server.js` | Server client for SSR |

---

## Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Kill node processes (if port in use)
taskkill /F /IM node.exe

# Clear Next.js cache
Remove-Item -Recurse -Force ".next"
```

---

## Testing Checklist

- [ ] Home page loads with nav
- [ ] Login/signup works
- [ ] /plan redirects to login if not authenticated
- [ ] /plan works after login
- [ ] Recipes page shows data
- [ ] Menus page shows data
- [ ] Shopping list works
- [ ] No hydration errors

---

## Known Issues

1. Theme toggle button may cause hydration on some routes
2. Need to verify shopping list API endpoints
3. Need to verify plan + recipe integration

---

## Next Steps

1. Test all functionality when logged in
2. Fix any issues discovered during testing
3. Deploy to Vercel and verify production works
4. Compare with old version features and port missing functionality