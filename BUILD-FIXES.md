# MintyFit v2 Build Fixes - Working Document

## Current Status (Apr 10, 2026)

### What's Working
- Local dev server runs on port 3000
- Auth login redirects properly
- Hydration errors mostly fixed with theme context
- Routes work (/plan redirects to login if not authenticated)

### What Needs Testing
- Plan page - adding recipes (drag & drop)
- Shopping list functionality
- Recipes/menus display

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

### 4. Nav Missing / Route Issues

**Problem:** 
- Top nav didn't show up
- /plan showed home page content

**Root Cause:** 
- AppNav removed from layout during debugging
- Some routing issues with middleware

**Fix:** Add Navbar to LandingClient (it's there, just wasn't rendering due to theme loading)

---

### 5. API Key Setup

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://gqpdgopvzgtpupymxkva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBiYWJzZSIsInJlZiI6ImdxcGRnb3B2emd0cHVweW14a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzMyMDQsImV4cCI6MjA4NzI0OTIwNH0.jt0L_2bsfTtBCWJPIQae0Xy7RgT8lMN0cGLG_D_KwTk
```

**Note:** `.env.local` file needs to be properly formatted with no duplicate keys.

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