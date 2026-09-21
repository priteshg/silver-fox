-- Foundations only, per product direction: no TypeScript domain type, no
-- repository, no UI consumes these yet. They exist now so the schema (not
-- another round of hard-coded app data) is where the recipe feature starts
-- when it's actually built.
create table public.recipe_sources (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  url text,
  attribution text,
  created_at timestamptz not null default now()
);

create table public.recipe_categories (
  id text primary key,
  name text not null unique check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.ingredients (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  -- Per 100g/100ml, so any serving size can be derived rather than stored twice.
  calories_per_100 numeric check (calories_per_100 >= 0),
  protein_grams_per_100 numeric check (protein_grams_per_100 >= 0),
  carbs_grams_per_100 numeric check (carbs_grams_per_100 >= 0),
  fat_grams_per_100 numeric check (fat_grams_per_100 >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id text primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  category_id text references public.recipe_categories (id) on delete set null,
  source_id text references public.recipe_sources (id) on delete set null,
  media_asset_id text references public.media_assets (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 500),
  -- Nutrition is stored per serving, matching how a user actually plans a meal.
  calories numeric check (calories >= 0),
  protein_grams numeric check (protein_grams >= 0),
  carbs_grams numeric check (carbs_grams >= 0),
  fat_grams numeric check (fat_grams >= 0),
  serving_size text,
  prep_time_minutes integer check (prep_time_minutes >= 0),
  cooking_time_minutes integer check (cooking_time_minutes >= 0),
  instructions text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  cuisine text,
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_owner_required_when_custom check (not is_custom or owner_id is not null)
);

create table public.recipe_ingredients (
  id text primary key,
  recipe_id text not null references public.recipes (id) on delete cascade,
  ingredient_id text not null references public.ingredients (id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  "order" integer not null default 0 check ("order" >= 0),
  created_at timestamptz not null default now(),
  unique (recipe_id, ingredient_id)
);

create trigger set_ingredients_updated_at
  before update on public.ingredients
  for each row execute function public.set_updated_at();
create trigger set_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipe_sources enable row level security;
alter table public.recipe_categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "recipe reference data is publicly readable" on public.recipe_sources
  for select to authenticated, anon using (true);
create policy "recipe categories are publicly readable" on public.recipe_categories
  for select to authenticated, anon using (true);
create policy "ingredients are publicly readable" on public.ingredients
  for select to authenticated, anon using (true);

create policy "recipes are readable when built-in or owned" on public.recipes
  for select to authenticated, anon
  using (not is_custom or owner_id = (select auth.uid()));
create policy "custom recipes are writable by their owner" on public.recipes
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (is_custom and owner_id = (select auth.uid()));

create policy "recipe ingredients are readable via their recipe" on public.recipe_ingredients
  for select to authenticated, anon
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (not r.is_custom or r.owner_id = (select auth.uid()))
    )
  );
create policy "recipe ingredients are writable via their owned recipe" on public.recipe_ingredients
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = (select auth.uid())));
