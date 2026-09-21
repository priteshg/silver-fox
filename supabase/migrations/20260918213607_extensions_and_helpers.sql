-- Extensions and shared helpers used by every table that follows.
create extension if not exists "pgcrypto" with schema extensions;

-- Every table has created_at/updated_at (mirrors the shared `Timestamped`
-- domain type in packages/types). This trigger keeps updated_at honest
-- without every migration/repository having to set it by hand.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on every UPDATE. Attach with a BEFORE UPDATE trigger.';
