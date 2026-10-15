-- 063_seo_weekly_reports.sql
-- Weekly SEO report storage + admin settings key-value table.
-- Access pattern: server-only via the service-role client (createAdminClient),
-- which bypasses RLS. No anon/authenticated access is granted.

-- Weekly SEO reports (one row per ISO week; re-generation upserts).
CREATE TABLE IF NOT EXISTS public.seo_weekly_reports (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_start    date        NOT NULL,
  week_end      date        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  snapshot      jsonb       NOT NULL,
  insights      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  narrative     text        NOT NULL DEFAULT '',
  email_sent_at timestamptz,
  email_error   text        NOT NULL DEFAULT '',
  CONSTRAINT seo_weekly_reports_week_unique UNIQUE (week_start, week_end)
);

CREATE INDEX IF NOT EXISTS idx_seo_weekly_reports_week_end
  ON public.seo_weekly_reports (week_end DESC);

-- Key-value admin settings (e.g. seo_report_recipients).
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: enabled, no policies = deny all for anon/authenticated.
-- The service role bypasses RLS, so server code keeps working.
ALTER TABLE public.seo_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.seo_weekly_reports IS 'Automated weekly SEO reports (GSC+GA4+blog snapshot, rule-based insights, LLM narrative). Written by /api/cron/weekly-seo-report, read in Admin → SEO Reports.';
COMMENT ON TABLE public.admin_settings IS 'Key-value settings editable in the admin area (e.g. seo_report_recipients). Service-role only.';
