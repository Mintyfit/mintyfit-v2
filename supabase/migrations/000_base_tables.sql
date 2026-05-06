-- ============================================================================
-- Migration 000: Base tables required before all other migrations
-- Creates profiles, family_members, measurements at final schema state.
-- Later ALTER migrations use IF NOT EXISTS — safe to have all columns already.
-- ============================================================================

-- extension needed for slug generation
CREATE EXTENSION IF NOT EXISTS unaccent;

-- profiles — Supabase Auth creates a minimal version; ensure it exists with all columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name            TEXT,
    role                 TEXT DEFAULT 'user',
    subscription_tier    TEXT DEFAULT 'free',
    stripe_customer_id   TEXT,
    status               TEXT DEFAULT 'active',
    subscription_status  TEXT DEFAULT 'inactive',
    stripe_subscription_id TEXT,
    phone                TEXT,
    units_preference     TEXT DEFAULT 'metric',
    nutritionist_email   TEXT,
    nutritionist_sharing BOOLEAN DEFAULT false,
    email_weekly_summary BOOLEAN DEFAULT true,
    email_meal_reminders BOOLEAN DEFAULT false,
    email_tips           BOOLEAN DEFAULT true,
    is_approved          BOOLEAN DEFAULT NULL,
    is_active            BOOLEAN DEFAULT TRUE,
    bio                  TEXT,
    credentials_url      TEXT,
    applied_at           TIMESTAMPTZ,
    avatar_url           TEXT,
    marketing_consent    BOOLEAN DEFAULT false,
    email_confirmed      BOOLEAN DEFAULT false,
    gdpr_consent_given   BOOLEAN DEFAULT false,
    gdpr_consent_date    TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- family_members (LEGACY — kept for data reference; new family system uses family_memberships)
CREATE TABLE IF NOT EXISTS public.family_members (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    relationship      TEXT,
    gender            TEXT,
    date_of_birth     DATE,
    is_primary        BOOLEAN DEFAULT false,
    allergies         TEXT DEFAULT '',
    activity_profiles JSONB DEFAULT '[]'::jsonb,
    is_managed        BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- measurements (LEGACY — member weight/height tracking)
CREATE TABLE IF NOT EXISTS public.measurements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id  UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    weight_kg         NUMERIC,
    height_cm         NUMERIC,
    is_pregnant       BOOLEAN DEFAULT false,
    is_breastfeeding  BOOLEAN DEFAULT false,
    recorded_at       TIMESTAMPTZ DEFAULT NOW()
);
