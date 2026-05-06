# MintyFit v2 — Database Transfer Package

## Files

| File | Purpose |
|---|---|
| `mintyfit-db-transfer.sql` | **Combined schema + data** — run this in the target Supabase SQL Editor |
| `01-schema.sql` | Schema only (tables, indexes, functions, triggers, policies) |
| `02-data.sql` | Data only (1,228 rows across 35 tables as INSERT statements) |
| `03-auth-users.sql` | Auth users (6) with passwords — run BEFORE schema+data |
| `03-auth-users.json` | Auth users in JSON format (Dashboard import compatible) |
| `export-data.mjs` | Node.js script to re-export public data |
| `export-auth-users.mjs` | Node.js script to re-export auth users |

## Transfer Instructions

### Step 1: Import Auth Users

The `public.profiles` table references `auth.users.id`. **Users must exist first.**

**In the TARGET Supabase project SQL Editor**, run `03-auth-users.sql`:
1. Go to SQL Editor → New Query
2. Paste contents of `03-auth-users.sql`
3. Click Run

Or use Dashboard import with `03-auth-users.json`.

**6 users exported:**
| Email | Role |
|---|---|
| claus@outline.ee | nutritionist |
| lisa@outline.ee | customer |
| ronald@outline.ee | super_admin |
| spetsk@gmail.com | customer |
| kkaimar@hotmail.com | customer |
| vallo@outline.ee | customer |

### Step 2: Apply Schema + Data

1. In the **target** Supabase project SQL Editor
2. Paste the contents of `mintyfit-db-transfer.sql`
3. Click **Run**

All statements use `IF NOT EXISTS` / `IF EXISTS` — safe to re-run if interrupted.

### Step 3: Verify

```sql
SELECT 'blog_categories' as tbl, count(*) FROM blog_categories UNION ALL
SELECT 'profiles', count(*) FROM profiles UNION ALL
SELECT 'recipes', count(*) FROM recipes UNION ALL
SELECT 'menus', count(*) FROM menus UNION ALL
SELECT 'menu_recipes', count(*) FROM menu_recipes UNION ALL
SELECT 'calendar_entries', count(*) FROM calendar_entries UNION ALL
SELECT 'food_journal', count(*) FROM food_journal UNION ALL
SELECT 'blog_posts', count(*) FROM blog_posts UNION ALL
SELECT 'ingredients', count(*) FROM ingredients UNION ALL
SELECT 'ingredient_cooking_variants', count(*) FROM ingredient_cooking_variants;
```

Expected: profiles=6, recipes=138, menus=6, menu_recipes=126, calendar_entries=47, food_journal=1, blog_posts=9, ingredients=296, ingredient_cooking_variants=544, blog_categories=3

### Step 4: Post-Import

- Update `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Deploy Edge Functions: `npx supabase functions deploy`
- Configure Storage buckets (recipe images, blog images)
- Users will need to reset passwords on the target project (password hashes are preserved but the auth settings may differ)
