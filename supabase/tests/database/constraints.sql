-- Run with: supabase test db
-- (starts the local stack, applies migrations, then runs every file under
-- supabase/tests/database with pgTAP)
begin;
create extension if not exists pgtap;

select plan(11);

-- A minimal, valid exercise fixture every other insert in this file references.
insert into public.exercises (id, name, primary_muscle_group, equipment, description, is_custom)
values ('t_ex_valid', 'Test Exercise', 'legs', 'barbell', 'A fixture exercise.', false);

-- 1: rep range must not be inverted.
select throws_ok(
  $$ insert into public.programs (id, name, is_custom) values ('t_prog_1', 'Test Programme', false) $$,
  null, null,
  'sanity: a minimal built-in programme insert succeeds'
);

insert into public.program_sessions (id, program_id, name, "order", focus)
values ('t_sess_1', 't_prog_1', 'Day 1', 0, 'full_body');

select throws_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high)
     values ('t_pe_bad_range', 't_sess_1', 't_ex_valid', 0, 3, 12, 8) $$,
  '23514',
  null,
  'rejects a programme exercise whose rep range is inverted (low > high)'
);

-- 2: target_sets must be positive.
select throws_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high)
     values ('t_pe_bad_sets', 't_sess_1', 't_ex_valid', 1, 0, 8, 12) $$,
  '23514',
  null,
  'rejects a programme exercise with zero target sets'
);

-- 3: target_rir must be within 0-10.
select throws_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high, target_rir)
     values ('t_pe_bad_rir', 't_sess_1', 't_ex_valid', 2, 3, 8, 12, 15) $$,
  '23514',
  null,
  'rejects a programme exercise with an out-of-range RIR'
);

-- 4: tempo must follow the N-N-N-N convention.
select throws_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high, tempo)
     values ('t_pe_bad_tempo', 't_sess_1', 't_ex_valid', 3, 3, 8, 12, 'slow') $$,
  '23514',
  null,
  'rejects a programme exercise with a malformed tempo string'
);

-- 5: a valid tempo is accepted.
select lives_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high, tempo)
     values ('t_pe_good_tempo', 't_sess_1', 't_ex_valid', 4, 3, 8, 12, '3-1-1-0') $$,
  'accepts a programme exercise with a correctly formatted tempo'
);

-- 6: no unknown exercise id reference.
select throws_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high)
     values ('t_pe_bad_exercise', 't_sess_1', 't_ex_does_not_exist', 5, 3, 8, 12) $$,
  '23503',
  null,
  'rejects a programme exercise referencing a non-existent exercise'
);

-- 7: no reference to a non-existent session.
select throws_ok(
  $$ insert into public.program_exercises
       (id, session_id, exercise_id, "order", target_sets, target_rep_range_low, target_rep_range_high)
     values ('t_pe_bad_session', 't_sess_does_not_exist', 't_ex_valid', 0, 3, 8, 12) $$,
  '23503',
  null,
  'rejects a programme exercise referencing a non-existent session'
);

-- 8: no duplicate programme ids.
select throws_ok(
  $$ insert into public.programs (id, name, is_custom) values ('t_prog_1', 'Duplicate', false) $$,
  '23505',
  null,
  'rejects a second programme with an id that already exists'
);

-- 9: a custom programme must declare an owner.
select throws_ok(
  $$ insert into public.programs (id, name, is_custom) values ('t_prog_no_owner', 'Missing Owner', true) $$,
  '23514',
  null,
  'rejects a custom programme with no owner_id'
);

-- 10: no self-referential exercise substitution.
select throws_ok(
  $$ insert into public.exercise_substitutions (exercise_id, substitute_exercise_id) values ('t_ex_valid', 't_ex_valid') $$,
  '23514',
  null,
  'rejects an exercise substituting for itself'
);

-- 11: a workout cannot complete before it started (needs a real auth user row).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'fixture@example.com');
select throws_ok(
  $$ insert into public.workouts (id, user_id, started_at, completed_at)
     values ('t_workout_1', '00000000-0000-0000-0000-000000000001', now(), now() - interval '1 hour') $$,
  '23514',
  null,
  'rejects a workout whose completed_at is before its started_at'
);

select * from finish();
rollback;
