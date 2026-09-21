-- Mirrors Workout / WorkoutSet in packages/domain/src/entities/{workout,workoutSet}.ts.
-- Only ever holds *completed* sets — `finishSession` in packages/domain only
-- persists sets the user actually logged, so there is no separate
-- "completed" flag to store here (unlike the in-progress WorkoutSession,
-- which is device-local, ephemeral, and never written to this table).
create table public.workouts (
  -- App-generated via createId(), not a DB default — see media_assets.sql.
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id text references public.programs (id) on delete set null,
  -- Kept even if the session it followed is later renamed/removed —
  -- historical workouts never change once saved.
  session_id text references public.program_sessions (id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workouts_completed_after_started check (completed_at is null or completed_at >= started_at)
);

create trigger set_workouts_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

create table public.workout_sets (
  id text primary key,
  workout_id text not null references public.workouts (id) on delete cascade,
  exercise_id text not null references public.exercises (id) on delete restrict,
  "order" integer not null check ("order" >= 0),
  weight numeric not null check (weight >= 0),
  weight_unit text not null check (weight_unit in ('kg', 'lb')),
  reps integer not null check (reps >= 0),
  rir numeric check (rir between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_workout_sets_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

create policy "workouts are only visible to their owner"
  on public.workouts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "workouts are only insertable by their owner"
  on public.workouts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "workouts are only updatable by their owner"
  on public.workouts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workouts are only deletable by their owner"
  on public.workouts for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "workout sets are only visible via an owned workout"
  on public.workout_sets for select
  to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())));

create policy "workout sets are only writable via an owned workout"
  on public.workout_sets for all
  to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())));
