-- Stage 3: exercise substitution. See EXERCISE_SUBSTITUTION_SPEC.md.
--
-- 1. Adds `laterality` (unilateral/bilateral) — a genuinely new signal, not
--    derivable from anything already stored (see spec §2).
-- 2. Normalizes `movement_pattern` from unconstrained free text (19 distinct
--    values in use, several conflating pattern with compound/isolation or
--    laterality — see EXERCISE_SUBSTITUTION_AUDIT.md §2) to a small
--    constrained set, for every existing built-in exercise by id.
-- 3. Adds the CHECK constraints only after the data is normalized, so
--    existing rows never violate them.
-- 4. Adds the five exercises the spec's own worked examples name but that
--    don't exist yet (Push-Up, Hack Squat, Bulgarian Split Squat, Barbell
--    Row, One-Arm Dumbbell Row).
-- 5. Adds curated `exercise_substitutions` rows for the three worked
--    examples — the table already existed and needed no schema change
--    (see audit §3); these are just its first real data.

alter table public.exercises add column laterality text not null default 'bilateral';

-- Movement-pattern reclassification, one statement per existing built-in
-- exercise so each mapping is auditable on its own line.
update public.exercises set movement_pattern = 'squat' where id = 'ex_barbell_squat';
update public.exercises set movement_pattern = 'horizontal_push' where id = 'ex_bench_press';
update public.exercises set movement_pattern = 'horizontal_push' where id = 'ex_incline_dumbbell_press';
update public.exercises set movement_pattern = 'vertical_pull' where id = 'ex_lat_pulldown';
update public.exercises set movement_pattern = 'vertical_pull' where id = 'ex_pull_up';
update public.exercises set movement_pattern = 'horizontal_pull' where id = 'ex_chest_supported_row';
update public.exercises set movement_pattern = 'horizontal_pull' where id = 'ex_seated_cable_row';
update public.exercises set movement_pattern = 'vertical_push' where id = 'ex_shoulder_press';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_lateral_raise';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_bicep_curl';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_tricep_pushdown';
update public.exercises set movement_pattern = 'horizontal_pull' where id = 'ex_face_pull';
update public.exercises set movement_pattern = 'hinge' where id = 'ex_romanian_deadlift';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_leg_curl';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_leg_extension';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_calf_raise';
update public.exercises set movement_pattern = 'other' where id = 'ex_plank';
update public.exercises set movement_pattern = 'squat' where id = 'ex_goblet_squat';
update public.exercises set movement_pattern = 'squat' where id = 'ex_leg_press';
update public.exercises set movement_pattern = 'lunge', laterality = 'unilateral' where id = 'ex_walking_lunge';
update public.exercises set movement_pattern = 'hinge' where id = 'ex_hip_thrust';
update public.exercises set movement_pattern = 'hinge' where id = 'ex_dumbbell_rdl';
update public.exercises set movement_pattern = 'horizontal_push' where id = 'ex_machine_chest_press';
update public.exercises set movement_pattern = 'horizontal_push' where id = 'ex_dumbbell_bench_press';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_cable_fly';
update public.exercises set movement_pattern = 'horizontal_pull' where id = 'ex_machine_row';
update public.exercises set movement_pattern = 'vertical_push' where id = 'ex_dumbbell_shoulder_press';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_hammer_curl';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_overhead_tricep_extension';
update public.exercises set movement_pattern = 'carry' where id = 'ex_farmers_carry';
update public.exercises set movement_pattern = 'anti_rotation' where id = 'ex_pallof_press';
update public.exercises set movement_pattern = 'isolation' where id = 'ex_cable_crunch';

alter table public.exercises add constraint exercises_movement_pattern_check check (
  movement_pattern is null or movement_pattern in (
    'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
    'squat', 'hinge', 'lunge', 'carry', 'rotation', 'anti_rotation', 'isolation', 'other'
  )
);

alter table public.exercises add constraint exercises_laterality_check check (
  laterality in ('unilateral', 'bilateral')
);

insert into public.exercises (
  id, name, primary_muscle_group, secondary_muscle_groups, equipment, laterality,
  rep_unit, difficulty, movement_pattern, description, why, instructions, setup, execution,
  breathing_cue, form_cues, common_mistakes, progression_guidance, regression_or_substitution,
  recommended_rest_seconds, is_custom, owner_id, created_at, updated_at
) values
  (
    'ex_push_up', 'Push-Up', 'chest', ARRAY['shoulders', 'triceps']::text[], 'bodyweight', 'bilateral',
    'reps', 'beginner', 'horizontal_push',
    'A horizontal press performed against the floor, using bodyweight instead of a bar or dumbbells.',
    'The most equipment-free way to train the same pressing pattern as a bench press — useful anywhere, anytime.',
    ARRAY['Set your hands slightly wider than shoulder width.', 'Lower your chest to the floor, then press back up.']::text[],
    'Start in a plank with hands slightly wider than shoulder width.',
    'Lower your chest toward the floor under control, then press back up to a straight-arm plank.',
    'Inhale as you lower, exhale as you press up.',
    ARRAY['Keep your body in a straight line', 'Keep your elbows at roughly 45 degrees, not flared out']::text[],
    ARRAY['Hips sagging toward the floor', 'Flaring the elbows straight out to the sides']::text[],
    'Once bodyweight feels easy for every rep, elevate your feet or add a weighted vest.',
    'A knee push-up or an incline push-up (hands on a bench) reduce the load if a full push-up is too much.',
    90, false, null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'ex_hack_squat', 'Hack Squat', 'legs', ARRAY['glutes']::text[], 'machine', 'bilateral',
    'reps', 'intermediate', 'squat',
    'A machine squat performed on a fixed, angled sled, taking balance demands out of the movement.',
    'Trains the same knee-dominant pattern as a barbell squat with the bar''s balance demand removed by the machine.',
    ARRAY['Set your feet shoulder width apart on the platform.', 'Lower under control, then drive back up.']::text[],
    'Set your shoulders under the pads and your feet shoulder width apart on the platform.',
    'Lower under control to a comfortable depth, then drive through your feet to extend back up.',
    'Inhale before descending, exhale as you drive up.',
    ARRAY['Keep your whole foot in contact with the platform', 'Control the descent rather than dropping into it']::text[],
    ARRAY['Letting the knees cave inward', 'Only lowering a few inches']::text[],
    'Add small increments once every set reaches the top of the rep range comfortably.',
    'A goblet squat trains the same pattern with far less external load if the machine is unavailable.',
    150, false, null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'ex_bulgarian_split_squat', 'Bulgarian Split Squat', 'legs', ARRAY['glutes']::text[], 'dumbbell', 'unilateral',
    'reps', 'advanced', 'squat',
    'A single-leg squat with the rear foot elevated behind you, trained one leg at a time.',
    'Builds single-leg strength and balance that a two-footed squat can''t reach on its own.',
    ARRAY['Rest your rear foot on a bench behind you.', 'Lower your back knee toward the floor, then drive back up.']::text[],
    'Stand a couple of feet in front of a bench, resting the top of your rear foot on it.',
    'Lower your back knee toward the floor under control, then drive through your front foot to stand.',
    'Inhale as you lower, exhale as you drive up.',
    ARRAY['Keep most of your weight through the front foot', 'Keep your torso upright']::text[],
    ARRAY['Letting the front knee drift far past the toes', 'Pushing off the back foot instead of the front']::text[],
    'Add dumbbell weight once every set on both legs feels stable and controlled.',
    'A goblet squat removes the single-leg balance demand while training a related pattern.',
    120, false, null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'ex_barbell_row', 'Barbell Row', 'back', ARRAY['biceps', 'shoulders']::text[], 'barbell', 'bilateral',
    'reps', 'intermediate', 'horizontal_pull',
    'A bent-over horizontal pull performed with a barbell, building back thickness and pulling strength.',
    'One of the most direct ways to build back strength and thickness through a horizontal pulling pattern.',
    ARRAY['Hinge at the hips holding the bar in front of your thighs.', 'Pull the bar to your lower ribs, then lower with control.']::text[],
    'Hinge forward from the hips until your torso is roughly 45 degrees, holding the bar with an overhand grip.',
    'Pull the bar toward your lower ribs, squeezing your shoulder blades together, then lower with control.',
    'Inhale at the bottom, exhale as you pull.',
    ARRAY['Keep your back flat, not rounded', 'Pull with your elbows, not your hands']::text[],
    ARRAY['Rounding the lower back', 'Using momentum to heave the weight up']::text[],
    'Add small plates once every set is completed with a flat back and full control.',
    'A chest-supported row removes the lower-back demand of holding the hinge position.',
    150, false, null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  ),
  (
    'ex_one_arm_dumbbell_row', 'One-Arm Dumbbell Row', 'back', ARRAY['biceps']::text[], 'dumbbell', 'unilateral',
    'reps', 'beginner', 'horizontal_pull',
    'A horizontal pull performed one arm at a time, with the opposite hand and knee braced on a bench.',
    'Trains the same pulling pattern as a barbell row with a supported torso, removing the lower-back demand entirely.',
    ARRAY['Brace one hand and knee on a bench, dumbbell in the other hand.', 'Pull the dumbbell to your hip, then lower with control.']::text[],
    'Brace one knee and hand on a bench with your back flat, holding a dumbbell in the free hand.',
    'Pull the dumbbell up toward your hip, leading with your elbow, then lower with control.',
    'Inhale at the bottom, exhale as you pull.',
    ARRAY['Keep your back flat throughout', 'Avoid twisting your torso as you pull']::text[],
    ARRAY['Twisting the torso to help lift the weight', 'Using a short, incomplete range of motion']::text[],
    'Add weight once every set on both sides feels controlled through a full range.',
    'A chest-supported row trains both sides together if single-arm balance is a limiting factor.',
    90, false, null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  )
on conflict (id) do nothing;

-- Curated relationships for the three worked examples in the spec — a
-- bonus signal on top of metadata matching, not a requirement for it
-- (see spec §9). Directional; not every pair is reciprocated, matching the
-- existing seed data's pattern for the ten pre-existing curated rows.
insert into public.exercise_substitutions (exercise_id, substitute_exercise_id, reason) values
  ('ex_bench_press', 'ex_dumbbell_bench_press', 'Same horizontal press pattern, using dumbbells instead of a barbell.'),
  ('ex_bench_press', 'ex_machine_chest_press', 'Same horizontal press pattern, with the machine handling balance.'),
  ('ex_bench_press', 'ex_push_up', 'Same horizontal press pattern, no equipment required.'),
  ('ex_leg_press', 'ex_hack_squat', 'Same squat pattern on a different machine.'),
  ('ex_leg_press', 'ex_goblet_squat', 'Same squat pattern, free-standing with a single dumbbell.'),
  ('ex_leg_press', 'ex_bulgarian_split_squat', 'Same squat pattern, trained one leg at a time.'),
  ('ex_seated_cable_row', 'ex_chest_supported_row', 'Same horizontal pull, chest-supported instead of cable-seated.'),
  ('ex_seated_cable_row', 'ex_barbell_row', 'Same horizontal pull pattern using a barbell instead of a cable.'),
  ('ex_seated_cable_row', 'ex_one_arm_dumbbell_row', 'Same horizontal pull pattern, trained one arm at a time.')
on conflict (exercise_id, substitute_exercise_id) do nothing;
