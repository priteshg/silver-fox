import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { haptics } from "../lib/haptics";

/** Used when there's no previous-session weight to prefill from (first time doing this exercise) — a common "empty barbell" convention. */
const DEFAULT_WEIGHT_KG = 20;
// 0.5kg, not 1kg: the progression engine (loadProgression.ts) can suggest a
// weight rounded to the nearest half kilogram (e.g. 82.5) — this control
// needs to represent every value progression can produce, or applying a
// suggestion would silently hand the stepper a value it could never reach
// on its own (see PROGRESSION_LOGIC_AUDIT.md, Risk 1).
const WEIGHT_STEP_KG = 0.5;
const MIN_WEIGHT_KG = 0;
const MAX_WEIGHT_KG = 500;

/** Guards against floating-point drift (e.g. 20 - 0.5 - 0.5 landing on 18.999999999998) after repeated half-kilogram adjustments. */
function roundToHalfKg(value: number): number {
  return Math.round(value * 2) / 2;
}

// Reps and RIR stay free-text (unlike weight) — typing "8" directly is a
// more natural way to enter a rep count than clicking a stepper eight
// times, and RIR is optional in a way that doesn't map as cleanly onto a
// stepper's always-has-a-value shape. Structural safety comes instead from
// filtering every keystroke to digits only and clamping the result, so a
// letter, symbol, decimal point, or minus sign can never be typed at all —
// closing the same class of NaN-propagation gap weight's stepper already
// closed, by construction rather than by validating after the fact.
export const MAX_REPS = 999;
export const MAX_RIR = 10;

export function filterAndClampDigits(text: string, max: number): string {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  if (digitsOnly === "") return "";
  return String(Math.min(max, Number(digitsOnly)));
}

interface SetRowProps {
  setId: string;
  setNumber: number;
  previousLabel?: string;
  initialWeight?: number;
  initialReps?: number;
  initialRir?: number;
  /** "seconds" for a timed hold like a plank — otherwise a rep count. */
  repUnit?: "reps" | "seconds";
  completed: boolean;
  /** The first not-yet-logged set — shown larger and with a stronger highlight so it's obvious what to do next. */
  isNext?: boolean;
  onComplete: (setId: string, values: { weight: number; reps: number; rir?: number }) => void;
  onUncomplete: (setId: string) => void;
  onRemove?: (setId: string) => void;
}

function SetRowComponent({
  setId,
  setNumber,
  previousLabel,
  initialWeight,
  initialReps,
  initialRir,
  repUnit = "reps",
  completed,
  isNext = false,
  onComplete,
  onUncomplete,
  onRemove,
}: SetRowProps) {
  const theme = useTheme();
  const prominent = isNext && !completed;
  const styles = useMemo(() => createStyles(theme, prominent), [theme, prominent]);
  const [weight, setWeight] = useState(initialWeight ?? DEFAULT_WEIGHT_KG);
  const [reps, setReps] = useState(initialReps !== undefined ? String(initialReps) : "");
  const [rir, setRir] = useState(initialRir !== undefined ? String(initialRir) : "");

  // Previous-session prefill values (initialWeight/initialReps/initialRir) often arrive
  // after mount — workout history loads from storage asynchronously — so a plain
  // useState initializer would miss them. These effects pick up a later-arriving
  // value as long as the field is still untouched by the user.
  const weightEdited = useRef(false);
  const repsEdited = useRef(false);
  const rirEdited = useRef(false);

  useEffect(() => {
    if (!weightEdited.current && initialWeight !== undefined) setWeight(initialWeight);
  }, [initialWeight]);

  useEffect(() => {
    if (!repsEdited.current && initialReps !== undefined) setReps(String(initialReps));
  }, [initialReps]);

  useEffect(() => {
    if (!rirEdited.current && initialRir !== undefined) setRir(String(initialRir));
  }, [initialRir]);

  const canComplete = reps.trim() !== "";

  function adjustWeight(delta: number) {
    if (completed) return;
    weightEdited.current = true;
    void haptics.light();
    setWeight((current) => roundToHalfKg(Math.min(MAX_WEIGHT_KG, Math.max(MIN_WEIGHT_KG, current + delta))));
  }

  function handleToggle() {
    if (completed) {
      onUncomplete(setId);
      return;
    }
    if (!canComplete) return;
    void haptics.medium();
    onComplete(setId, {
      weight,
      reps: Number(reps),
      rir: rir.trim() === "" ? undefined : Number(rir),
    });
  }

  return (
    <View style={[styles.row, completed && styles.rowCompleted, prominent && styles.rowNext]}>
      <View style={styles.headerRow}>
        <View style={styles.setNumberBadge}>
          <Text style={styles.setNumberText}>{setNumber}</Text>
        </View>
        <Text style={styles.previousLine} numberOfLines={1}>
          Last time: <Text style={styles.previousValue}>{previousLabel ?? "—"}</Text>
        </Text>
        {onRemove ? (
          <Pressable
            onPress={() => onRemove(setId)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove set ${setNumber}`}
            style={styles.removeButton}
          >
            <Text style={styles.removeLabel}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <View style={styles.inputStack}>
          <View style={styles.weightRow}>
            <WeightStepper
              value={weight}
              onDecrease={() => adjustWeight(-WEIGHT_STEP_KG)}
              onIncrease={() => adjustWeight(WEIGHT_STEP_KG)}
              disabled={completed}
              large={prominent}
            />
          </View>
          <View style={styles.repsRirRow}>
            <NumberInput
              label={repUnit === "seconds" ? "sec" : "reps"}
              value={reps}
              onChangeText={(text) => {
                repsEdited.current = true;
                setReps(filterAndClampDigits(text, MAX_REPS));
              }}
              editable={!completed}
              large={prominent}
            />
            <NumberInput
              label="RIR"
              value={rir}
              onChangeText={(text) => {
                rirEdited.current = true;
                setRir(filterAndClampDigits(text, MAX_RIR));
              }}
              editable={!completed}
              optional
              large={prominent}
            />
          </View>
        </View>

        <Pressable
          onPress={handleToggle}
          disabled={!completed && !canComplete}
          accessibilityRole="button"
          accessibilityLabel={
            completed
              ? `Set ${setNumber} completed, ${weight} kilograms, ${reps} ${repUnit === "seconds" ? "seconds" : "reps"}. Tap to undo.`
              : `Complete set ${setNumber}`
          }
          style={[
            styles.completeButton,
            completed && styles.completeButtonDone,
            !completed && !canComplete && styles.completeButtonDisabled,
          ]}
        >
          <Text style={styles.completeButtonLabel}>{completed ? "✓" : "Log"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const SetRow = memo(SetRowComponent);

function NumberInput({
  label,
  value,
  onChangeText,
  editable,
  optional,
  large,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  optional?: boolean;
  large?: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, !!large), [theme, large]);
  return (
    <View style={styles.numberInputContainer}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType="decimal-pad"
        placeholder={optional ? "-" : "0"}
        placeholderTextColor={theme.color.textTertiary}
        accessibilityLabel={label}
        style={[styles.numberInput, !editable && styles.numberInputLocked]}
      />
      <Text style={styles.numberInputLabel}>{label}</Text>
    </View>
  );
}

/** Weight changes by a fixed 1kg step via +/- rather than free text — plates come in fixed increments, and this also rules out invalid input (letters, decimals, NaN) entirely. */
function WeightStepper({
  value,
  onDecrease,
  onIncrease,
  disabled,
  large,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled: boolean;
  large?: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, !!large), [theme, large]);
  return (
    <View style={styles.numberInputContainer}>
      <View style={[styles.weightStepperRow, disabled && styles.numberInputLocked]}>
        <Pressable
          onPress={onDecrease}
          disabled={disabled || value <= MIN_WEIGHT_KG}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Decrease weight"
          style={styles.weightStepperButton}
        >
          <Text style={styles.weightStepperButtonLabel}>−</Text>
        </Pressable>
        <Text style={styles.weightValue} accessibilityLabel={`kg: ${value}`}>
          {value}
        </Text>
        <Pressable
          onPress={onIncrease}
          disabled={disabled || value >= MAX_WEIGHT_KG}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Increase weight"
          style={styles.weightStepperButton}
        >
          <Text style={styles.weightStepperButtonLabel}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.numberInputLabel}>kg</Text>
    </View>
  );
}

function createStyles(theme: Theme, prominent: boolean) {
  const inputHeight = prominent ? theme.touchTarget.large : theme.touchTarget.min;

  return StyleSheet.create({
    row: {
      gap: theme.spacing.xs,
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      padding: theme.spacing.sm,
    },
    rowCompleted: {
      borderColor: theme.color.success,
    },
    rowNext: {
      borderColor: theme.color.accent,
      borderWidth: 2,
      backgroundColor: theme.color.surfaceElevated,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    setNumberBadge: {
      width: 24,
      height: 24,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.color.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    setNumberText: {
      color: theme.color.textSecondary,
      fontWeight: "700",
      fontSize: 12,
    },
    previousLine: {
      flex: 1,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    previousValue: {
      color: theme.color.textSecondary,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    // Weight gets its own full-width row, with reps/RIR sharing a second row
    // below it. A single three-across row (weight stepper + reps + RIR) was
    // measured too narrow at common phone widths (~264px available at a
    // 360px screen) to fit two real touchTarget-sized stepper buttons
    // alongside two text inputs without them overlapping — there wasn't a
    // flex ratio that solved it, because the total space needed genuinely
    // exceeded the space available. Stacking gives the stepper the full row.
    inputStack: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    weightRow: {
      flexDirection: "row",
    },
    repsRirRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    numberInputContainer: {
      flex: 1,
      alignItems: "center",
      minWidth: 0,
    },
    numberInput: {
      width: "100%",
      height: inputHeight,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.surfaceElevated,
      color: theme.color.textPrimary,
      textAlign: "center",
      fontSize: prominent ? theme.typography.typeScale.h3.fontSize : theme.typography.typeScale.body.fontSize,
      fontWeight: "700",
    },
    numberInputLocked: {
      opacity: 0.6,
    },
    weightStepperRow: {
      width: "100%",
      height: inputHeight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.surfaceElevated,
      paddingHorizontal: 2,
    },
    weightStepperButton: {
      // Fixed to the theme's real touch-target sizes (not a fraction of
      // inputHeight — that formula previously landed at ~39px, still short
      // of touchTarget.min, which is why the buttons kept feeling squashed
      // after the first pass at this fix). Both sizes fit inside
      // weightStepperRow's height (inputHeight): touchTarget.min (44) equals
      // the non-prominent row height exactly, and touchTarget.comfortable
      // (48) fits inside the prominent row's larger height (56) with room
      // to spare. weightRow giving the stepper its own full-width row (see
      // inputStack above) is what makes room for two real touch targets
      // without colliding with anything else.
      width: prominent ? theme.touchTarget.comfortable : theme.touchTarget.min,
      height: prominent ? theme.touchTarget.comfortable : theme.touchTarget.min,
      alignItems: "center",
      justifyContent: "center",
    },
    weightStepperButtonLabel: {
      color: theme.color.textPrimary,
      fontWeight: "700",
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    weightValue: {
      flex: 1,
      // Explicit flexShrink: RN defaults it to 0, unlike web CSS — without
      // this, the value text won't yield space back to the two fixed-width
      // buttons on a narrow column, and the buttons get pushed outside the
      // row instead of the number compressing.
      flexShrink: 1,
      minWidth: 0,
      textAlign: "center",
      color: theme.color.textPrimary,
      fontVariant: ["tabular-nums"],
      fontSize: prominent ? theme.typography.typeScale.h3.fontSize : theme.typography.typeScale.body.fontSize,
      fontWeight: "700",
    },
    numberInputLabel: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    completeButton: {
      minWidth: theme.touchTarget.comfortable,
      height: inputHeight,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    completeButtonDone: {
      backgroundColor: theme.color.success,
    },
    completeButtonDisabled: {
      opacity: 0.35,
    },
    completeButtonLabel: {
      color: theme.color.background,
      fontWeight: "700",
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    removeButton: {
      width: theme.touchTarget.min,
      height: theme.touchTarget.min,
      alignItems: "center",
      justifyContent: "center",
    },
    removeLabel: {
      color: theme.color.textTertiary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
  });
}
