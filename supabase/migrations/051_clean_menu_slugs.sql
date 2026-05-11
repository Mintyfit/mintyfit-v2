-- Regenerate all menu slugs to be clean (name-based, no UUID fragments).
-- Mirrors 038_clean_recipe_slugs.sql. Collisions resolved with -2, -3, ... .
DO $$
DECLARE
    rec RECORD;
    base_slug TEXT;
    final_slug TEXT;
    counter INT;
BEGIN
    FOR rec IN
        SELECT id, name FROM menus ORDER BY created_at ASC
    LOOP
        -- Generate base slug from name
        base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(COALESCE(rec.name, 'untitled-menu'), '[^a-z0-9]+', '-', 'g'),
                '^-|-$', '', 'g'
            )
        );

        -- Collapse repeats and trim
        base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '^-|-$', '', 'g');

        -- Fallback if name was empty or non-ascii
        IF base_slug IS NULL OR base_slug = '' THEN
            base_slug := 'menu';
        END IF;

        -- Truncate to 80 chars
        IF LENGTH(base_slug) > 80 THEN
            base_slug := LEFT(base_slug, 80);
        END IF;

        -- Collisions → -2, -3, ...
        final_slug := base_slug;
        counter := 2;
        WHILE EXISTS (
            SELECT 1 FROM menus WHERE slug = final_slug AND id != rec.id
        ) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
            IF counter > 100 THEN
                final_slug := base_slug || '-' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
                EXIT;
            END IF;
        END LOOP;

        UPDATE menus SET slug = final_slug WHERE id = rec.id;
    END LOOP;
END $$;

-- Replace the menu_slug trigger so new menus get clean collision-resolved slugs
-- instead of "<name>-<uuid-prefix>".
CREATE OR REPLACE FUNCTION set_menu_slug()
RETURNS trigger AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INT;
BEGIN
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
        RETURN NEW;
    END IF;

    base_slug := LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(COALESCE(NEW.name, 'untitled-menu'), '[^a-z0-9]+', '-', 'g'),
            '^-|-$', '', 'g'
        )
    );
    base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
    base_slug := REGEXP_REPLACE(base_slug, '^-|-$', '', 'g');

    IF base_slug IS NULL OR base_slug = '' THEN
        base_slug := 'menu';
    END IF;

    IF LENGTH(base_slug) > 80 THEN
        base_slug := LEFT(base_slug, 80);
    END IF;

    final_slug := base_slug;
    counter := 2;
    WHILE EXISTS (
        SELECT 1 FROM menus WHERE slug = final_slug AND id <> NEW.id
    ) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
        IF counter > 100 THEN
            final_slug := base_slug || '-' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
            EXIT;
        END IF;
    END LOOP;

    NEW.slug := final_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS menu_slug_trigger ON menus;
CREATE TRIGGER menu_slug_trigger
BEFORE INSERT ON menus
FOR EACH ROW EXECUTE FUNCTION set_menu_slug();
