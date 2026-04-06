-- Saves which family members were toggled on for a specific recipe slot in the plan.
-- One row per (profile, date, meal, recipe, member).
create table if not exists recipe_member_states (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references auth.users on delete cascade not null,
  date_str text not null,
  meal_type text not null,
  recipe_id uuid not null,
  member_id uuid not null,
  is_enabled boolean not null default true,
  created_at timestamptz default now(),
  constraint recipe_member_states_unique unique (profile_id, date_str, meal_type, recipe_id, member_id)
);

create index if not exists recipe_member_states_profile_date
  on recipe_member_states (profile_id, date_str);

alter table recipe_member_states enable row level security;

create policy "Users manage own member states"
  on recipe_member_states for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
