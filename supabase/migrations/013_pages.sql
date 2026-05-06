-- CMS Pages (same layout as blog single post)
CREATE TABLE IF NOT EXISTS public.pages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  content     TEXT        DEFAULT '',
  image_url   TEXT        DEFAULT '',
  is_published BOOLEAN    DEFAULT false,
  author_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx ON public.pages (slug);

-- RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "pages_select_published"
  ON public.pages FOR SELECT
  USING (is_published = true);

-- Super admins can do everything
CREATE POLICY "pages_super_admin"
  ON public.pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
