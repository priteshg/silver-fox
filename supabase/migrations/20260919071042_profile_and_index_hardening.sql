-- Extends `profiles` with fields the profile screen now reads/writes, and
-- adds indexes on every foreign key in the schema. Postgres does NOT index
-- FK columns automatically — only the referenced side (the primary key) is
-- indexed for free. Every RLS policy added so far joins back to a parent
-- table through one of these FKs (program_exercises -> program_sessions ->
-- programs, workouts -> programs/program_sessions, etc.), so without these
-- indexes every read runs a sequential scan under RLS as the schema grows.

alter table public.profiles
  add column age smallint check (age between 13 and 120),
  add column active_program_id text references public.programs (id) on delete set null;

-- profiles
create index profiles_active_program_id_idx on public.profiles (active_program_id);

-- exercises / exercise_substitutions
create index exercises_owner_id_idx on public.exercises (owner_id);
create index exercises_media_asset_id_idx on public.exercises (media_asset_id);
-- exercise_id is already the leading column of exercise_substitutions' composite
-- primary key, so only the reverse direction (substitute_exercise_id) needs one.
create index exercise_substitutions_substitute_exercise_id_idx on public.exercise_substitutions (substitute_exercise_id);

-- programs / program_sessions / program_exercises
create index programs_owner_id_idx on public.programs (owner_id);
create index program_sessions_program_id_idx on public.program_sessions (program_id);
create index program_exercises_session_id_idx on public.program_exercises (session_id);
create index program_exercises_exercise_id_idx on public.program_exercises (exercise_id);

-- workouts / workout_sets
create index workouts_user_id_idx on public.workouts (user_id);
create index workouts_program_id_idx on public.workouts (program_id);
create index workouts_session_id_idx on public.workouts (session_id);
create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

-- activity tracking (all strictly owner-scoped, queried by user_id first)
create index conditioning_sessions_user_id_idx on public.conditioning_sessions (user_id);
create index mobility_sessions_user_id_idx on public.mobility_sessions (user_id);
create index body_measurements_user_id_idx on public.body_measurements (user_id);
create index progress_photos_user_id_idx on public.progress_photos (user_id);

-- recipes foundation
create index recipes_owner_id_idx on public.recipes (owner_id);
create index recipes_category_id_idx on public.recipes (category_id);
create index recipes_source_id_idx on public.recipes (source_id);
create index recipes_media_asset_id_idx on public.recipes (media_asset_id);
create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index recipe_ingredients_ingredient_id_idx on public.recipe_ingredients (ingredient_id);
