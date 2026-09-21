-- Mirrors ConditioningSession / MobilitySession / BodyMeasurement / ProgressPhoto.
-- All four are simple, strictly user-owned logs with an identical RLS shape.
create table public.conditioning_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('zone2', 'running', 'cycling', 'walking', 'intervals', 'other')),
  date date not null,
  duration_minutes numeric not null check (duration_minutes > 0),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mobility_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  focus text not null check (focus in ('hips', 'thoracic_spine', 'shoulders', 'ankles', 'general')),
  date date not null,
  duration_minutes numeric not null check (duration_minutes > 0),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.body_measurements (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric check (weight_kg > 0),
  waist_cm numeric check (waist_cm > 0),
  body_fat_percent numeric check (body_fat_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress_photos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  uri text not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_conditioning_sessions_updated_at
  before update on public.conditioning_sessions
  for each row execute function public.set_updated_at();
create trigger set_mobility_sessions_updated_at
  before update on public.mobility_sessions
  for each row execute function public.set_updated_at();
create trigger set_body_measurements_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();
create trigger set_progress_photos_updated_at
  before update on public.progress_photos
  for each row execute function public.set_updated_at();

alter table public.conditioning_sessions enable row level security;
alter table public.mobility_sessions enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;

create policy "conditioning sessions are owner-only" on public.conditioning_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "mobility sessions are owner-only" on public.mobility_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "body measurements are owner-only" on public.body_measurements
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "progress photos are owner-only" on public.progress_photos
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
