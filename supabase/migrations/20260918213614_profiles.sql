-- One row per auth.users row. Created automatically on sign-up (including
-- anonymous sign-in) by the trigger below, so the app never has to
-- separately "create a user" — mirrors `User` in packages/domain.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  preferred_weight_unit text not null default 'kg' check (preferred_weight_unit in ('kg', 'lb')),
  training_experience text check (training_experience in ('beginner', 'intermediate', 'advanced')),
  goals text[],
  preferred_training_days_per_week smallint check (preferred_training_days_per_week between 1 and 7),
  available_equipment text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with the app-specific profile fields in the User domain entity.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row the moment someone signs in for the first
-- time (anonymous or otherwise), so the rest of the schema can assume every
-- authenticated user already has one.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;

create policy "profiles are readable by their owner"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles are updatable by their owner"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
