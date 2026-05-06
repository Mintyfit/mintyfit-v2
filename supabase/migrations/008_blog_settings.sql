-- Global blog settings (single-row singleton)
CREATE TABLE IF NOT EXISTS public.blog_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  sidebar_html TEXT    DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce exactly one row
CREATE UNIQUE INDEX IF NOT EXISTS blog_settings_singleton
  ON public.blog_settings (id);

-- Seed default row
INSERT INTO public.blog_settings (id, sidebar_html)
  VALUES (1, '')
  ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_settings_select"
  ON public.blog_settings FOR SELECT USING (true);

CREATE POLICY "blog_settings_super_admin"
  ON public.blog_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
