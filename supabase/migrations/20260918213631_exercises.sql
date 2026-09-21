-- Mirrors the `Exercise` domain entity in packages/domain/src/entities/exercise.ts.
create table public.exercises (
  -- App-generated via createId(), not a DB default — see media_assets.sql.
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  primary_muscle_group text not null check (
    primary_muscle_group in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'full_body')
  ),
  secondary_muscle_groups text[] not null default '{}',
  equipment text not null check (
    equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other')
  ),
  rep_unit text not null default 'reps' check (rep_unit in ('reps', 'seconds')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  movement_pattern text,
  description text not null check (char_length(description) <= 500),
  why text,
  instructions text[] not null default '{}',
  setup text,
  execution text,
  breathing_cue text,
  form_cues text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  progression_guidance text,
  regression_or_substitution text,
  recommended_rest_seconds integer check (recommended_rest_seconds > 0),
  media_asset_id text references public.media_assets (id) on delete set null,
  is_custom boolean not null default true,
  -- Null for the built-in library; set for a user-authored exercise.
  owner_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_owner_required_when_custom check (not is_custom or owner_id is not null)
);

create trigger set_exercises_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- A structured, queryable alternative to a "try this instead" free-text
-- note: "if you don't have a barbell, here are your options."
create table public.exercise_substitutions (
  exercise_id text not null references public.exercises (id) on delete cascade,
  substitute_exercise_id text not null references public.exercises (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (exercise_id, substitute_exercise_id),
  constraint exercise_substitutions_no_self_reference check (exercise_id <> substitute_exercise_id)
);

alter table public.exercises enable row level security;
alter table public.exercise_substitutions enable row level security;

create policy "exercises are readable when built-in or owned"
  on public.exercises for select
  to authenticated, anon
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "custom exercises are insertable by their owner"
  on public.exercises for insert
  to authenticated
  with check (is_custom and owner_id = (select auth.uid()));

create policy "custom exercises are updatable by their owner"
  on public.exercises for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "custom exercises are deletable by their owner"
  on public.exercises for delete
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "substitutions are readable for any visible exercise"
  on public.exercise_substitutions for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid()))
    )
  );
