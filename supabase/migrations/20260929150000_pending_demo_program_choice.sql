-- Persists the "came from Demo, hasn't chosen a programme yet" intent
-- against the account itself, not local/React state — so it survives
-- signup, email confirmation (which can happen on a different device, at
-- any later time), closing the app, and a fresh sign-in. See
-- providers/AuthProvider.tsx for where this is read and cleared.

alter table public.profiles
  add column pending_demo_program_choice boolean not null default false;

-- Re-seeds the same trigger the `profiles` migration created, extended to
-- read the intent off the just-created auth.users row's metadata (set via
-- `options.data` on `supabase.auth.signUp()` — see
-- lib/supabase/auth.ts's signUpWithEmail) so the flag is durable from the
-- very first moment the account exists, before any confirmation or session
-- is possible. Anonymous sign-in and ordinary (non-demo) signup pass no
-- such metadata, so this coalesces to `false` for both.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, pending_demo_program_choice)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data ->> 'pending_demo_program_choice')::boolean, false)
  );
  return new;
end;
$$;
