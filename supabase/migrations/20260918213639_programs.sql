-- Mirrors Program / WorkoutDay ("programme session") / ProgramExercise in
-- packages/domain/src/entities/{program,workoutDay,programExercise}.ts.
create table public.programs (
  -- App-generated via createId(), not a DB default — see media_assets.sql.
  id text primary key,
  -- Null for the built-in catalogue; set for a user-authored programme.
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  category text check (category in ('full_body', 'upper_lower', 'push_pull_legs', 'hybrid')),
  target_audience text check (char_length(target_audience) <= 300),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  days_per_week smallint check (days_per_week between 1 and 7),
  estimated_session_minutes_low integer check (estimated_session_minutes_low > 0),
  estimated_session_minutes_high integer check (estimated_session_minutes_high > 0),
  primary_goal text check (
    primary_goal in (
      'build_muscle', 'get_stronger', 'strength_and_muscle', 'recomposition',
      'fat_loss_maintain_muscle', 'general_fitness', 'longevity',
      'return_to_training', 'busy_professional'
    )
  ),
  secondary_goals text[],
  philosophy text check (char_length(philosophy) <= 500),
  progression_method text check (char_length(progression_method) <= 500),
  deload_strategy text check (char_length(deload_strategy) <= 500),
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_owner_required_when_custom check (not is_custom or owner_id is not null),
  constraint programs_session_minutes_ordered check (
    estimated_session_minutes_low is null
    or estimated_session_minutes_high is null
    or estimated_session_minutes_low <= estimated_session_minutes_high
  )
);

create trigger set_programs_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

create table public.program_sessions (
  id text primary key,
  program_id text not null references public.programs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  "order" integer not null check ("order" >= 0),
  focus text not null check (focus in ('push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- Deliberately no unique(program_id, "order"): reordering updates rows one
  -- at a time (see reorderDayExercises in programRepository.ts), which would
  -- transiently collide with a same-transaction-only unique check. "order"
  -- is a display/sort hint the app always renumbers densely from 0, not an
  -- identity, so a momentary duplicate mid-reorder is harmless.
);

create trigger set_program_sessions_updated_at
  before update on public.program_sessions
  for each row execute function public.set_updated_at();

create table public.program_exercises (
  id text primary key,
  session_id text not null references public.program_sessions (id) on delete cascade,
  exercise_id text not null references public.exercises (id) on delete restrict,
  "order" integer not null check ("order" >= 0),
  target_sets integer not null check (target_sets > 0),
  target_rep_range_low integer not null check (target_rep_range_low > 0),
  target_rep_range_high integer not null check (target_rep_range_high > 0),
  -- Reps in reserve: 0-10 comfortably covers "to failure" through "very easy".
  target_rir smallint check (target_rir between 0 and 10),
  rest_seconds integer check (rest_seconds > 0),
  -- eccentric-pause-concentric-pause, e.g. "3-1-1-0".
  tempo text check (tempo ~ '^[0-9]+-[0-9]+-[0-9]+-[0-9]+$'),
  warmup_sets smallint check (warmup_sets >= 0),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_exercises_rep_range_ordered check (target_rep_range_low <= target_rep_range_high)
  -- No unique(session_id, "order") — see the matching note on program_sessions above.
);

create trigger set_program_exercises_updated_at
  before update on public.program_exercises
  for each row execute function public.set_updated_at();

alter table public.programs enable row level security;
alter table public.program_sessions enable row level security;
alter table public.program_exercises enable row level security;

create policy "programs are readable when built-in or owned"
  on public.programs for select
  to authenticated, anon
  using (not is_custom or owner_id = (select auth.uid()));

create policy "custom programs are insertable by their owner"
  on public.programs for insert
  to authenticated
  with check (is_custom and owner_id = (select auth.uid()));

create policy "custom programs are updatable by their owner"
  on public.programs for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "custom programs are deletable by their owner"
  on public.programs for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Sessions and exercises within a program inherit that program's visibility
-- and ownership rather than carrying their own owner_id.
create policy "program sessions are readable via their program"
  on public.program_sessions for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id and (not p.is_custom or p.owner_id = (select auth.uid()))
    )
  );

create policy "program sessions are writable via their owned program"
  on public.program_sessions for all
  to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.programs p where p.id = program_id and p.owner_id = (select auth.uid())));

create policy "program exercises are readable via their program"
  on public.program_exercises for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.program_sessions s
      join public.programs p on p.id = s.program_id
      where s.id = session_id and (not p.is_custom or p.owner_id = (select auth.uid()))
    )
  );

create policy "program exercises are writable via their owned program"
  on public.program_exercises for all
  to authenticated
  using (
    exists (
      select 1 from public.program_sessions s
      join public.programs p on p.id = s.program_id
      where s.id = session_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.program_sessions s
      join public.programs p on p.id = s.program_id
      where s.id = session_id and p.owner_id = (select auth.uid())
    )
  );
