# Tasks for Qwen — Family Invites, Nutritionist Invites, Self-Serve Apply

> **Read this file in full before starting.** Then read `CLAUDE.md` and `SYSTEM.md` for project conventions.
> Project root: `D:\WORKS\Minty\NewMintyAprill2026\AprillBuild`
> Stack: Next.js 15 App Router, React 19, Supabase, Tailwind 4. JavaScript (.jsx/.js), no TypeScript.

---

## Context — what's already done

The user flagged that family-member invites and nutritionist invites have no visible / fully-working UI. Resend account is verified for `info@mintyfit.com` and the API key is `re_d6WEeQXN_CSUjXxYsLFYL6jRxEGuB2Jha`.

### Decisions locked in (do not re-litigate)

1. **Email provider:** Resend, sender `MintyFit <info@mintyfit.com>`.
2. **Family invites** must onboard users who don't yet have an account. Email contains two paths: "I have an account" (sign in) and "Create account" (sign up + auto-accept).
3. **Nutritionist invites** mirror the family flow: a new `nutritionist_invites` table (email + token + expires_at) supports inviting people who aren't on MintyFit yet.
4. **Nutritionist self-serve apply:** new `/become-a-nutritionist` public page + an "Apply as nutritionist" tile on `/my-account`. Submitting sets `profiles.role='nutritionist'` + `profiles.is_approved=false`. Admin flips `is_approved=true`. (Not a separate `applicant` role.)
5. **My Family** entry must be promoted as a card on `/my-account`. (It's currently buried in the user-avatar dropdown.)
6. **Resend API key only in `.env.local`.** Do NOT commit to repo or push to Vercel — user will add to Vercel manually later.
7. **Dark mode is preserved.** `components/admin/AdminClient.jsx` is dead code (the route redirects to `/admin/customers`); deleting it does NOT touch the real dark mode in `contexts/ThemeContext.jsx`.

### Already completed (DO NOT redo)

- ✅ `.env.local` — added `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM`.
- ✅ `npm install resend` (in `package.json`).
- ✅ Migration `supabase/migrations/20260428_invites_and_nutritionist_apply.sql` — adds `is_approved`, `is_active`, `bio`, `credentials_url`, `applied_at` to `profiles`; creates `nutritionist_invites` table with token + RLS.
- ✅ `lib/email/sendEmail.js` — Resend wrapper, fails-soft if no key.
- ✅ `lib/email/templates.js` — `familyInviteEmail`, `nutritionistInviteEmail`, `nutritionistApprovedEmail`, `nutritionistApplicationReceivedEmail`.
- ✅ `app/api/family/invite/route.js` — POST now sends email + reuses pending invites; added DELETE (cancel) and PATCH (resend).

---

## Important schema/code notes

- **`profiles.is_approved`** is **nullable**. Treat `null` as "not applicable" (regular customer); treat `false` as "applied, awaiting review"; treat `true` as approved nutritionist.
- **`families` migration** is `supabase/migrations/20260409_family_tables.sql`. Tables: `families`, `family_memberships`, `managed_members`, `family_invites`, `weight_logs`. Use these — do not create new ones.
- **`nutritionist_client_links`** lives in `supabase/migrations/20260224_session3_tables.sql`. Status values: `pending | active | inactive`. `client_id` references `profiles(id)` so an existing user is required → that's why we added the new `nutritionist_invites` table.
- **Auth callback** is `app/auth/callback/route.js` and already supports `?next=...` redirects. Use this when sending users through signup-then-accept flows.
- **AppNav / Navbar** — `My Family` is currently in the user-avatar dropdown only. Don't add it to bottom nav per user instruction; promote via /my-account card.
- **Email helper fails soft** — if `RESEND_API_KEY` is missing it logs and returns `{skipped:true}` instead of throwing. APIs should still succeed when email skips, but they should report `emailStatus` in the response so the UI can show the manual copy-link fallback.
- **Token format** — `family_invites.token` and `nutritionist_invites.token` are both UUIDs (`gen_random_uuid()`).

---

## Remaining tasks — execute in this order

### TASK 1 — Run the migration
- File: `supabase/migrations/20260428_invites_and_nutritionist_apply.sql`
- Apply via the Supabase SQL editor (production project) OR `supabase db push` if local dev DB is wired. Verify columns + table exist before continuing.
- **Verify:** `select column_name from information_schema.columns where table_name='profiles' and column_name in ('is_approved','is_active','bio','credentials_url','applied_at');` returns 5 rows. `select count(*) from public.nutritionist_invites;` returns 0 with no error.

### TASK 2 — Family invite accept page: support new users (1b)
- File: `components/family/FamilyInviteClient.jsx`
- Current state: shows "Sign in" / "Create account" buttons when not logged in, but they go to `/?auth=login&redirect=/family-invite/${token}` — landing/AuthModal does NOT honor the `redirect` param.
- Required:
  1. Read `?signup=1&email=<addr>` from the URL on first paint. If present and no user, **embed `AuthModal` in signup mode pre-filled with that email** (or render a minimal local signup form) instead of navigating away. Most robust: render `AuthModal` from `components/landing/AuthModal.jsx` inline with `defaultTab='signup'` and pass the email through.
  2. If signed in already: keep current "Join {family}" button behavior — it works.
  3. After successful signup OR sign-in, **call `/api/family/accept-invite`** automatically with the token (poll for session if needed). Then redirect to `/my-family`.
  4. Handle the case where `invite.email !== user.email` — keep the current warning banner.
- **Verify:** open `http://localhost:3000/family-invite/<real-token>?signup=1&email=test@example.com` while logged out → see signup form pre-filled → after signup the invite auto-accepts and you land on `/my-family`.

### TASK 3 — MyFamilyClient UX polish
- File: `components/family/MyFamilyClient.jsx`
- Current state: `sendInvite()` exists. Returns inviteUrl that is rendered inline with a "Copy" button. No resend/cancel buttons on pending invites.
- Required:
  1. After `sendInvite()` succeeds, read `emailStatus` from the response. If `'sent'`: show a toast "✓ Email sent to {email}". If `'failed'` or `'skipped'`: keep the copy-link fallback visible. (Today the inviteUrl is always shown — instead show it only when email didn't send.)
  2. On each pending-invite row in the "Pending invites" section, add two small icon buttons: **Resend** (calls `PATCH /api/family/invite` with `{id}`) and **Cancel** (calls `DELETE /api/family/invite?id=<id>`). On success, update local state.
  3. Keep all existing styling — match the existing button style.
- **Verify:** invite a new email → toast appears → reload `/my-family` → the invite is in pending list → click Resend → toast confirms → click Cancel → invite disappears from list.

### TASK 4 — Nutritionist invite system
**4a.** Create `app/api/nutritionist/invite/route.js` mirroring `app/api/family/invite/route.js`:
   - **POST** — body `{email, message?}`. Verify caller's `profiles.role === 'nutritionist'` AND `is_approved === true`. Insert into `nutritionist_invites`. Send email using `nutritionistInviteEmail({nutritionistName, acceptUrl, signupUrl, message})`. Reuse pending invites. Return `{invite, inviteUrl, emailStatus}`.
   - **GET** — list this nutritionist's invites (any status).
   - **DELETE** `?id=` — cancel pending invite (set status='cancelled').
   - **PATCH** body `{id}` — resend email for an existing pending invite.

**4b.** Create `app/api/nutritionist/accept-invite/route.js`:
   - POST `{token}`. Looks up invite by token. If `expires_at < now()` → return error. Caller must be authenticated. Insert `nutritionist_client_links(nutritionist_id, client_id=auth.uid(), status='active', accepted_at=now())` (`onConflict: 'nutritionist_id,client_id'`). Update invite `status='accepted', accepted_at=now()`. Return `{ok:true}`.

**4c.** Create `app/nutritionist-invite/[token]/page.jsx` + `components/nutritionist/NutritionistInviteClient.jsx`:
   - SSR fetch invite by token (use `createClient` from `lib/supabase/server`). Show error states (not found / expired / already used).
   - If logged in: show "Connect with {nutritionist name}" + button → calls `/api/nutritionist/accept-invite`.
   - If logged out **and** `?signup=1&email=` present: embed AuthModal in signup mode, then auto-accept.
   - If logged out without signup flag: show "Sign in" + "Create account" buttons (same pattern as FamilyInviteClient).

**4d.** Update `components/nutritionist/NutritionistClient.jsx`:
   - Add a top section "Invite a client" with email input + optional textarea (personal message) + "Send invite" button → POSTs to `/api/nutritionist/invite`.
   - Add a "Pending invites" list below "Inactive connections" with Resend + Cancel buttons (mirror family pattern).
   - Pull initial pending invites in the page-level server component (`app/nutritionist/page.jsx`) and pass them as props.
- **Verify:** as a nutritionist (set `role='nutritionist', is_approved=true` for your test user), invite a non-existent email → email lands → click in incognito → accept page → sign up → connection appears active in nutritionist's dashboard.

### TASK 5 — Become-a-nutritionist apply (public + account tile)
**5a.** Create `app/become-a-nutritionist/page.jsx` (public, no auth required):
   - Marketing-ish explainer at the top (what nutritionists can do on MintyFit, screenshot or icon).
   - Form: display_name (prefill if logged in), email (prefill if logged in & disabled), bio (textarea, max 500 chars), credentials_url (optional URL field). GDPR checkbox.
   - Submit → `POST /api/nutritionist/apply`.
   - If not logged in: form should first prompt sign-up/sign-in (use existing AuthModal). After auth, the form posts.
   - Show success message after submit: "Application received — we'll email you when approved."

**5b.** Create `app/api/nutritionist/apply/route.js`:
   - POST. Auth required. Body `{bio, credentials_url, display_name?}`.
   - Update caller's profile: `role='nutritionist', is_approved=false, bio, credentials_url, applied_at=now()`. If `display_name` provided, set it.
   - Insert audit_log row `action='nutritionist_application_submitted', actor_id=user.id`.
   - Send `nutritionistApplicationReceivedEmail({name})` to the applicant.
   - Return `{ok:true}`.

**5c.** Add an "Apply as nutritionist" tile to `/my-account` (in `components/account/MyAccountClient.jsx` or wherever the account body lives):
   - Show only if `profiles.role !== 'nutritionist'` AND `profiles.role !== 'super_admin'`.
   - If `is_approved === false` (already applied): show "Application pending review" status card instead of the apply CTA.
   - CTA links to `/become-a-nutritionist`.

### TASK 6 — My Family card on /my-account
- File: `components/account/MyAccountClient.jsx`
- Add a prominent card near the top of the page:
  - If user has a family: card shows family name, member count, and a "Manage family" button → `/my-family`.
  - If not: card says "You haven't created a family yet" with a "Create family" button → `/my-family`.
- Use existing card / button styles (look at `MyAccountClient`'s other sections for the pattern).
- Data: fetch via `/api/account/family` if it covers families, otherwise fetch `family_memberships` + `families` directly via Supabase client. Server-side fetch preferred.

### TASK 7 — Admin: pending nutritionist query + approve email + pending banner
**7a.** Update `app/admin/nutritionists/page.jsx`:
   - Replace the current pending heuristic (lines ~16-22) with: `from('profiles').select(...).eq('role','nutritionist').eq('is_approved', false)`.

**7b.** Update `app/admin/nutritionists/actions.js` `approveNutritionist`:
   - After flipping `is_approved=true`, fetch the user's display_name/email and call `sendEmail` with `nutritionistApprovedEmail`.
   - Add an audit_log entry.

**7c.** Add a pending banner:
   - In `app/nutritionist/page.jsx` (or its layout/wrapper), if `profiles.is_approved === false`, render a yellow banner at the top: "Your nutritionist application is pending review. We'll notify you by email once approved." Hide the actual dashboard until approved (or render a read-only placeholder).

### TASK 8 — Cleanup
- **Delete** `components/admin/AdminClient.jsx`. Verify nothing imports it: `grep -rn "AdminClient" app/ components/` should return zero hits after deletion.
- Update `SYSTEM.md`:
  - Add `nutritionist_invites` table to the schema section.
  - Add new `profiles` columns (`is_approved`, `is_active`, `bio`, `credentials_url`, `applied_at`).
  - Add new API routes (`/api/nutritionist/invite`, `/api/nutritionist/accept-invite`, `/api/nutritionist/apply`).
  - Add new pages (`/become-a-nutritionist`, `/nutritionist-invite/[token]`).
- Update `knowledge/INDEX.md` if knowledge files change.

### TASK 9 — Build + browser verification
1. `npm run build` — must pass with zero errors.
2. `npm run dev`, then in a browser:
   - **Family invite (existing user):** create a family → invite a real email you control → check inbox → click link → sign in → accept → land on `/my-family` with new member.
   - **Family invite (new user):** invite a fresh email → click signup link → register → auto-accept → land on `/my-family`.
   - **Nutritionist apply:** logged in non-nutritionist user → `/become-a-nutritionist` → submit → email confirms receipt → admin sees pending → approves → applicant gets approval email → /nutritionist now shows full dashboard.
   - **Nutritionist invite:** approved nutritionist sends invite → email arrives → recipient signs up → connection appears active.
3. Take screenshots of each completed flow and save to `knowledge/sessions/2026-04-29-invites-completion.md`.

---

## Conventions to follow

- **No new top-level components folders.** Family stuff goes under `components/family/`, nutritionist stuff under `components/nutritionist/`, etc.
- **Server actions** for admin mutations (existing `app/admin/*/actions.js` pattern). Client uses fetch for `/api/*` routes.
- **Email failures must NOT break the API call.** The invite still gets created; the response includes `emailStatus` so the UI can fall back to a copyable link.
- **No commits to Vercel.** Local dev only. User will deploy when ready.
- **Don't add comments explaining what code does** — only comment the why if non-obvious. Match CLAUDE.md style rules.
- **Keep `CHECKPOINT.md` updated** as you complete each task. Add an entry under a new "Session 10 — Invite System" heading.

---

## Files reference (so you know where to look)

| Concern | File |
|---|---|
| Family invite API | `app/api/family/invite/route.js` (already updated) |
| Family invite accept API | `app/api/family/accept-invite/route.js` |
| Family invite accept page | `app/family-invite/[token]/page.jsx` |
| Family invite UI component | `components/family/FamilyInviteClient.jsx` |
| MyFamily UI | `components/family/MyFamilyClient.jsx` |
| Nutritionist links table | migration `20260224_session3_tables.sql` |
| Nutritionist dashboard | `components/nutritionist/NutritionistClient.jsx` + `app/nutritionist/page.jsx` |
| Admin nutritionists | `app/admin/nutritionists/page.jsx` + `actions.js` |
| AppNav | `components/shared/AppNav.jsx` (also `components/Navbar.jsx`) |
| Auth callback | `app/auth/callback/route.js` (supports `?next=`) |
| Auth modal | `components/landing/AuthModal.jsx` |
| Email helper | `lib/email/sendEmail.js` (already created) |
| Email templates | `lib/email/templates.js` (already created) |
| Migration | `supabase/migrations/20260428_invites_and_nutritionist_apply.sql` (already created — must be run) |

---

## Done definition

- All 4 verification flows in TASK 9 succeed end-to-end in a browser.
- `npm run build` is clean.
- `CHECKPOINT.md` updated.
- `SYSTEM.md` updated.
- Commit (do not push) with message `feat: family + nutritionist invite emails, nutritionist self-serve apply`.
