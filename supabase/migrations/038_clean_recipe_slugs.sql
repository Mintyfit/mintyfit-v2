-- Regenerate all recipe slugs to be clean (title-based, no UUID fragments).
-- Handles collisions with -2, -3 suffixes like the JS slugify utility.
DO $$
DECLARE
    rec RECORD;
    base_slug TEXT;
    final_slug TEXT;
    counter INT;
BEGIN
    FOR rec IN 
        SELECT id, title FROM recipes ORDER BY created_at ASC
    LOOP
        -- Generate base slug from title (PostgreSQL equivalent of JS slugify)
        base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(COALESCE(rec.title, 'untitled-recipe'), '[^a-z0-9]+', '-', 'g'),
                '^-|-$', '', 'g'
            )
        );

        -- Trim leading/trailing hyphens and collapse multiples (belt + suspenders)
        base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '^-|-$', '', 'g');

        -- Truncate to 80 chars
        IF LENGTH(base_slug) > 80 THEN
            base_slug := LEFT(base_slug, 80);
        END IF;

        -- Handle collisions: if slug already taken by another recipe, append -2, -3, etc.
        final_slug := base_slug;
        counter := 2;
        WHILE EXISTS (
            SELECT 1 FROM recipes WHERE slug = final_slug AND id != rec.id
        ) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
            IF counter > 100 THEN
                -- Failsafe: use a unique timestamp
                final_slug := base_slug || '-' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
                EXIT;
            END IF;
        END LOOP;

        UPDATE recipes SET slug = final_slug WHERE id = rec.id;
    END LOOP;
END $$;
