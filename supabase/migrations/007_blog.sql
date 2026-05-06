-- ── Blog posts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  excerpt       text        DEFAULT '',
  content       text        DEFAULT '',   -- raw HTML / code
  sidebar_html  text        DEFAULT '',   -- sticky right-column HTML
  image_url     text        DEFAULT '',
  is_published  boolean     NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx        ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx   ON public.blog_posts (is_published, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

-- Super admins see all posts (including drafts)
CREATE POLICY "blog_posts_select_admin"
  ON public.blog_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Super admins can create, update, delete
CREATE POLICY "blog_posts_insert_admin"
  ON public.blog_posts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "blog_posts_update_admin"
  ON public.blog_posts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "blog_posts_delete_admin"
  ON public.blog_posts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── Categories ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text  NOT NULL UNIQUE,
  slug  text  NOT NULL UNIQUE,
  color text  DEFAULT '#22c55e'
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_categories_select_all"
  ON public.blog_categories FOR SELECT USING (true);

CREATE POLICY "blog_categories_admin"
  ON public.blog_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── Tags ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text  NOT NULL UNIQUE,
  slug  text  NOT NULL UNIQUE
);

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_tags_select_all"
  ON public.blog_tags FOR SELECT USING (true);

CREATE POLICY "blog_tags_admin"
  ON public.blog_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── Post ↔ Category junction ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id      uuid  NOT NULL REFERENCES public.blog_posts(id)     ON DELETE CASCADE,
  category_id  uuid  NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_post_categories_select_all"
  ON public.blog_post_categories FOR SELECT USING (true);

CREATE POLICY "blog_post_categories_admin"
  ON public.blog_post_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── Post ↔ Tag junction ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id  uuid  NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id   uuid  NOT NULL REFERENCES public.blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_post_tags_select_all"
  ON public.blog_post_tags FOR SELECT USING (true);

CREATE POLICY "blog_post_tags_admin"
  ON public.blog_post_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
