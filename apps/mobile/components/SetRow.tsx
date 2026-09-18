import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { haptics } from "../lib/haptics";

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
  const [weight, setWeight] = useState(initialWeight !== undefined ? String(initialWeight) : "");
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
    if (!weightEdited.current && initialWeight !== undefined) setWeight(String(initialWeight));
  }, [initialWeight]);

  useEffect(() => {
    if (!repsEdited.current && initialReps !== undefined) setReps(String(initialReps));
  }, [initialReps]);

  useEffect(() => {
    if (!rirEdited.current && initialRir !== undefined) setRir(String(initialRir));
  }, [initialRir]);

  const canComplete = weight.trim() !== "" && reps.trim() !== "";

  function handleToggle() {
    if (completed) {
      onUncomplete(setId);
      return;
    }
    if (!canComplete) return;
    void haptics.medium();
    onComplete(setId, {
      weight: Number(weight),
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
        <View style={styles.inputRow}>
          <NumberInput
            label="kg"
            value={weight}
            onChangeText={(text) => {
              weightEdited.current = true;
              setWeight(text);
            }}
            editable={!completed}
            large={prominent}
          />
          <NumberInput
            label={repUnit === "seconds" ? "sec" : "reps"}
            value={reps}
            onChangeText={(text) => {
              repsEdited.current = true;
              setReps(text);
            }}
            editable={!completed}
            large={prominent}
          />
          <NumberInput
            label="RIR"
            value={rir}
            onChangeText={(text) => {
              rirEdited.current = true;
              setRir(text);
            }}
            editable={!completed}
            optional
            large={prominent}
          />
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
      alignItems: "flex-end",
      gap: theme.spacing.sm,
    },
    inputRow: {
      flex: 1,
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
