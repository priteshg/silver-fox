-- Run with: supabase test db
-- Verifies the Row Level Security policies actually isolate data between
-- users — the guarantee the whole schema depends on, since the app's anon
-- key is public and every table is exposed to PostgREST.
begin;
create extension if not exists pgtap;

select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'user-a@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'user-b@example.com');

-- A signs in and creates a private workout.
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.workouts (id, user_id, started_at)
values ('t_rls_workout_a', '00000000-0000-0000-0000-0000000000a1', now());

select is(
  (select count(*)::int from public.workouts where id = 't_rls_workout_a'),
  1,
  'the owner can see their own just-created workout'
);

select throws_ok(
  $$ insert into public.workouts (id, user_id, started_at)
     values ('t_rls_workout_wrong_owner', '00000000-0000-0000-0000-0000000000a2', now()) $$,
  null, null,
  'user A cannot create a workout on user B''s behalf (RLS with_check blocks it)'
);

-- B signs in and must not see A's workout.
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from public.workouts where id = 't_rls_workout_a'),
  0,
  'user B cannot see user A''s workout'
);

-- B creates their own custom programme; A should not be able to see or delete it.
insert into public.programs (id, owner_id, name, is_custom)
values ('t_rls_prog_b', '00000000-0000-0000-0000-0000000000a2', 'B''s Programme', true);

select is(
  (select count(*)::int from public.programs where id = 't_rls_prog_b'),
  1,
  'user B can see their own custom programme'
);

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from public.programs where id = 't_rls_prog_b'),
  0,
  'user A cannot see user B''s custom programme'
);

delete from public.programs where id = 't_rls_prog_b';
select is(
  (select count(*)::int from public.programs where id = 't_rls_prog_b'),
  1,
  'the delete silently affects 0 rows — user B''s programme still exists (RLS, not a client-side check, is the guard)'
);

select * from finish();
rollback;
