-- recipe_interactions: stores per-user ratings and favourite status per recipe.
-- Idempotent — safe to run even if the table already exists.

create table if not exists recipe_interactions (
  id          uuid        default gen_random_uuid() primary key,
  profile_id  uuid        references auth.users on delete cascade not null,
  recipe_id   uuid        not null,
  rating      int         check (rating >= 1 and rating <= 5),
  is_favourite boolean    default false not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint  recipe_interactions_unique unique (profile_id, recipe_id)
);

create index if not exists recipe_interactions_profile_idx on recipe_interactions (profile_id);

alter table recipe_interactions enable row level security;

-- Drop any pre-existing policies so this is safe to re-run
do $$ begin
  drop policy if exists "Users manage own recipe interactions" on recipe_interactions;
  drop policy if exists "interactions_select"                  on recipe_interactions;
  drop policy if exists "interactions_insert"                  on recipe_interactions;
  drop policy if exists "interactions_update"                  on recipe_interactions;
  drop policy if exists "interactions_delete"                  on recipe_interactions;
end $$;

create policy "Users manage own recipe interactions"
  on recipe_interactions for all
  using  (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
