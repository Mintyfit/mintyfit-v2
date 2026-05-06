# Family System RLS Fix — Quick Reference

## Problem
**Error:** `infinite recursion detected in policy for relation "families"` (or "family_memberships")

**Root Cause:** Circular reference in RLS policies:
- `families` SELECT policy queried `family_memberships` table
- `family_memberships` SELECT policy queried `family_memberships` table (itself)
- Result: Infinite loop when trying to INSERT or SELECT

## Solution

### Run These 3 Migrations (in EXACT order):

1. **`20260430_00_drop_all_family_policies.sql`** — Drops ALL old policies (cleanup)
2. **`20260430_fix_family_recursion.sql`** — Recreates policies without recursion
3. **`20260430_disable_old_member_system.sql`** — Disables old Member system

### How to Apply:

1. Go to **Supabase Dashboard** → **SQL Editor**

2. **First:** Copy contents of `20260430_00_drop_all_family_policies.sql`
   - Paste and run → Drops all existing policies
   
3. **Second:** Copy contents of `20260430_fix_family_recursion.sql`
   - Paste and run → Creates new recursion-free policies
   
4. **Third:** Copy contents of `20260430_disable_old_member_system.sql`
   - Paste and run → Disables old Member system

5. **Test:** Try creating a family → Should work! ✅

### After Running:

✅ **Family creation should work** — No more infinite recursion error
✅ **Old Member system disabled** — `family_members` table inaccessible
✅ **New Family system active** — `families` + `family_memberships` tables

## What Changed

### Before (Broken):
```sql
-- families policy queried family_memberships
CREATE POLICY "Family members can read family" ON public.families FOR SELECT
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.family_memberships fm  -- ← CIRCULAR REFERENCE
    WHERE fm.family_id = id AND fm.profile_id = auth.uid()
  )
);

-- family_memberships policy queried itself
CREATE POLICY "Members can read family memberships" ON public.family_memberships FOR SELECT
USING (
  profile_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_memberships fm2  -- ← INFINITE LOOP
    WHERE fm2.family_id = family_id AND fm2.profile_id = auth.uid()
  )
);
```

### After (Fixed):
```sql
-- families policy ONLY checks created_by
CREATE POLICY "Family members can read family" ON public.families FOR SELECT
USING (created_by = auth.uid());

-- family_memberships policy ONLY references families table
CREATE POLICY "Members can read family memberships" ON public.family_memberships FOR SELECT
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.families f  -- ← No recursion!
    WHERE f.id = family_id AND f.created_by = auth.uid()
  )
);
```

## Trade-offs

### What Works:
- ✅ Family creation
- ✅ Family creator can see all memberships
- ✅ Members can see their own membership
- ✅ Admin/co-admin can manage memberships
- ✅ Managed members (children) work correctly

### What's Limited:
- ⚠️ Co-admins who are NOT the creator cannot READ other members' records
  - They can still MANAGE (add/remove members) via the ALL policy
  - This is a temporary limitation for testing

### Future Enhancement:
If you need full co-admin read support, create a **security definer function**:

```sql
CREATE FUNCTION check_family_membership(fid uuid) RETURNS boolean
SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_memberships
    WHERE family_id = fid AND profile_id = auth.uid()
  );
$$ LANGUAGE sql;

-- Then use in policy:
-- USING (check_family_membership(family_id))
```

## Old vs New System

| Feature | Old Member System | New Family System |
|---------|------------------|-------------------|
| Table | `family_members` | `families` + `family_memberships` |
| Model | One user, multiple members | Multiple accounts linked |
| Auth | All under one login | Each member has own account |
| Status | **DISABLED** | **ACTIVE** |

## Files Created

- `supabase/migrations/20260430_fix_family_recursion.sql` — RLS fix
- `supabase/migrations/20260430_disable_old_member_system.sql` — Disable old system
- `FIX_FAMILY_RLS.md` — This file

## Testing Checklist

After applying migrations:

- [ ] Create a new family (should succeed)
- [ ] View family page (should show members)
- [ ] Invite a member (should work)
- [ ] Accept invite as new user (should work)
- [ ] Add managed child (should work)
- [ ] View planner with family members (should work)
- [ ] View statistics with family data (should work)

## Rollback (if needed)

If you need to restore the old Member system temporarily:

```sql
-- Re-enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Grant permissions back
GRANT ALL ON TABLE public.family_members TO authenticated;
GRANT ALL ON TABLE public.measurements TO authenticated;

-- Restore original policies (see 20260226_family_activity_profiles.sql)
```

---

**Created:** 2026-04-30  
**Status:** Ready to deploy
