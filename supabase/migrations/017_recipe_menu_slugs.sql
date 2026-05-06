-- Enable unaccent extension for slug generation
create extension if not exists unaccent;

-- Add slug to recipes
alter table recipes add column if not exists slug text unique;

-- Generate slugs for existing recipes from title
update recipes
set slug = lower(
  regexp_replace(
    regexp_replace(
      unaccent(title),
    '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g')
) || '-' || substr(id::text, 1, 6)
where slug is null;

-- Add slug to menus
alter table menus add column if not exists slug text unique;

-- Generate slugs for existing menus from title
update menus
set slug = lower(
  regexp_replace(
    regexp_replace(
      unaccent(name),
    '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g')
) || '-' || substr(id::text, 1, 6)
where slug is null;

-- Shared slug generator function
create or replace function generate_slug(title text, id uuid)
returns text as $$
begin
  return lower(
    regexp_replace(
      regexp_replace(
        unaccent(title),
      '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g')
  ) || '-' || substr(id::text, 1, 6);
end;
$$ language plpgsql;

-- Auto-generate slug on new recipe insert
create or replace function set_recipe_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug := generate_slug(new.title, new.id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipe_slug_trigger on recipes;
create trigger recipe_slug_trigger
before insert on recipes
for each row execute function set_recipe_slug();

-- Auto-generate slug on new menu insert
create or replace function set_menu_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug := generate_slug(new.name, new.id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists menu_slug_trigger on menus;
create trigger menu_slug_trigger
before insert on menus
for each row execute function set_menu_slug();
