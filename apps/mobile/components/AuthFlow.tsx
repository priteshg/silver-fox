import type { Theme } from "@silver-fox/config";
import { calculateTotalVolume, findMostRecentPersonalRecord, suggestNextLoad, type PersonalRecord } from "@silver-fox/domain";
import { Button, Card, ErrorState, useTheme } from "@silver-fox/ui";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DEMO_PROFILE,
  DEMO_PROGRAM_DETAIL,
  DEMO_WORKOUTS,
  DEMO_WORKOUT_SETS,
  findProgramExercise,
} from "../lib/demo/demoData";
import { requestPasswordResetDebug } from "../lib/supabase/auth";
import { useAuth } from "../providers/AuthProvider";
import { ScreenContainer } from "./ScreenContainer";
import { TextField } from "./TextField";

type Screen = "welcome" | "sign_up" | "sign_in" | "forgot_password" | "demo";

/** Same shape a `<TextInput keyboardType="email-address">` nudges toward, not a full RFC 5322 parser — just enough to catch an obviously malformed address before it reaches Supabase. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function exerciseNameFor(exerciseId: string): string {
  return (
    DEMO_PROGRAM_DETAIL.days.flatMap((d) => d.exercises).find((e) => e.exerciseId === exerciseId)?.exercise.name ??
    "an exercise"
  );
}

/** Mirrors app/workout/active.tsx's formatPrMessage — same three record types, same wording. */
function formatRecordValue(record: PersonalRecord): string {
  if (record.type === "weight") return `${record.value} kg`;
  if (record.type === "estimatedOneRepMax") return `${record.value} kg est. 1RM`;
  return `${record.value} reps @ ${record.atWeight} kg`;
}

/**
 * Everything shown before someone reaches the real, authenticated app —
 * welcome/explanation, sign-up, sign-in, Demo, and the "Use this programme"
 * / "Start fresh" choice a demo-originated signup leads to. Kept in one
 * file deliberately: each screen is small enough that splitting them into
 * separate files/routes would add navigation complexity this stage
 * doesn't need, and none of this is a rewrite of anything existing.
 */
export function AuthFlow() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { viewMode, enterDemo, exitDemo, pendingProgramChoice } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [cameFromDemo, setCameFromDemo] = useState(false);

  if (pendingProgramChoice) {
    return <ProgramChoiceScreen />;
  }

  if (viewMode === "demo") {
    return (
      <DemoScreen
        onLeave={exitDemo}
        onCreateAccount={() => {
          // exitDemo() is required, not just setScreen("sign_up") — viewMode
          // (owned by AuthProvider) still reads "demo" otherwise, and the
          // check above returns DemoScreen again on the very next render
          // regardless of `screen`, so the signup form could never actually
          // be reached from here. Confirmed directly: without this, clicking
          // "Create your own PrimeForm account" was a complete no-op, in the
          // real app and not just in tests.
          setCameFromDemo(true);
          setScreen("sign_up");
          exitDemo();
        }}
      />
    );
  }

  if (screen === "sign_up") return <SignUpScreen onBack={() => setScreen("welcome")} fromDemo={cameFromDemo} />;
  if (screen === "sign_in") {
    return (
      <SignInScreen onBack={() => setScreen("welcome")} onForgotPassword={() => setScreen("forgot_password")} />
    );
  }
  if (screen === "forgot_password") return <ForgotPasswordScreen onBack={() => setScreen("sign_in")} />;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.title}>PrimeForm</Text>
        <Text style={styles.subtitle}>Training that adapts as you do.</Text>
      </View>
      <View style={styles.actions}>
        <Button label="See a demo" onPress={enterDemo} variant="secondary" />
        <Button label="Create account" onPress={() => setScreen("sign_up")} />
        <Button label="Sign in" onPress={() => setScreen("sign_in")} variant="secondary" />
      </View>
    </ScreenContainer>
  );
}

function DemoBanner() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.demoBanner} accessibilityRole="text" accessibilityLabel="Demo — example data, not saved">
      <Text style={styles.demoBannerText}>DEMO — example data, not saved</Text>
    </View>
  );
}

/**
 * A realistic, entirely local walkthrough: Foundation 40+'s real structure,
 * fabricated finished workouts, an example progress suggestion, and a
 * filled-in example profile — all sourced from lib/demo/demoData.ts, which
 * has no path to Supabase at all (not just "doesn't call it today").
 */
function DemoScreen({ onLeave, onCreateAccount }: { onLeave: () => void; onCreateAccount: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const benchPressTarget = findProgramExercise("Push", "ex_bench_press");
  const benchPressSets = DEMO_WORKOUT_SETS.filter((s) => s.exerciseId === "ex_bench_press").sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1,
  );
  const lastThreeBenchSets = benchPressSets.slice(-3);
  const suggestion = suggestNextLoad({
    previousSets: lastThreeBenchSets.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
    targetRepRangeLow: benchPressTarget.targetRepRangeLow,
    targetRepRangeHigh: benchPressTarget.targetRepRangeHigh,
    targetRir: benchPressTarget.targetRir,
  });
  const totalVolume = DEMO_WORKOUT_SETS.reduce((sum, s) => sum + calculateTotalVolume([s]), 0);
  // Reuses the same domain function the real Progress screen's personal-record
  // detection runs on actual history — the demo's "PR" is a genuine computed
  // result over its fabricated data, not a second hand-written number.
  const mostRecentPr = findMostRecentPersonalRecord(DEMO_WORKOUTS, DEMO_WORKOUT_SETS);

  return (
    <ScreenContainer>
      <DemoBanner />
      <View style={styles.hero}>
        <Text style={styles.title}>{DEMO_PROGRAM_DETAIL.program.name}</Text>
        <Text style={styles.subtitle}>{DEMO_PROGRAM_DETAIL.program.description}</Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Programme</Text>
        {DEMO_PROGRAM_DETAIL.days.map((d) => (
          <Text key={d.day.id} style={styles.line}>
            {d.day.name} — {d.exercises.length} exercises
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {DEMO_WORKOUTS.slice()
          .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
          .map((w) => {
            const day = DEMO_PROGRAM_DETAIL.days.find((d) => d.day.id === w.workoutDayId)?.day;
            const setCount = DEMO_WORKOUT_SETS.filter((s) => s.workoutId === w.id).length;
            return (
              <Text key={w.id} style={styles.line}>
                {day?.name ?? "Workout"} · {setCount} sets
              </Text>
            );
          })}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Progress</Text>
        <Text style={styles.line}>Total volume logged: {totalVolume} kg</Text>
        {mostRecentPr ? (
          <Text style={styles.line}>
            Personal record on {exerciseNameFor(mostRecentPr.record.exerciseId)}: {formatRecordValue(mostRecentPr.record)}
          </Text>
        ) : null}
        {suggestion.suggestedWeight !== null ? (
          <Text style={styles.line}>Suggested next Bench Press: {suggestion.suggestedWeight} kg — {suggestion.reason}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.line}>{DEMO_PROFILE.displayName}, {DEMO_PROFILE.age} · {DEMO_PROFILE.trainingExperience}</Text>
        <Text style={styles.line}>{DEMO_PROFILE.preferredTrainingDaysPerWeek} days/week</Text>
      </Card>

      <View style={styles.actions}>
        <Button label="Create your own PrimeForm account" onPress={onCreateAccount} />
        <Button label="Back" onPress={onLeave} variant="secondary" />
      </View>
    </ScreenContainer>
  );
}

/**
 * Shown once, immediately after a demo-originated signup succeeds with a
 * real session already in hand (see AuthProvider's `pendingProgramChoice`).
 * Neither path ever touches workouts, personal records, or the demo
 * profile — only the programme's structure is ever eligible to be copied
 * (CORE_IMPLEMENTATION_PLAN.md Stage 4, FOUNDATION_DECISIONS.md Decision 1).
 */
function ProgramChoiceScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { resolveProgramChoice } = useAuth();
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(choice: "use_programme" | "start_fresh") {
    setIsWorking(true);
    setError(null);
    try {
      await resolveProgramChoice(choice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up your account. Please try again.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.title}>Keep the demo programme?</Text>
        <Text style={styles.subtitle}>
          You can start with {DEMO_PROGRAM_DETAIL.program.name}&apos;s structure, or begin with nothing selected.
          Either way, none of the demo&apos;s example workouts, progress, or profile come with you.
        </Text>
      </View>
      {error ? <ErrorState title="Couldn't complete that" description={error} onRetry={() => choose("use_programme")} /> : null}
      <View style={styles.actions}>
        <Button
          label={isWorking ? "Please wait…" : "Use This Programme"}
          onPress={() => choose("use_programme")}
          disabled={isWorking}
        />
        <Button
          label={isWorking ? "Please wait…" : "Start Fresh"}
          onPress={() => choose("start_fresh")}
          variant="secondary"
          disabled={isWorking}
        />
      </View>
    </ScreenContainer>
  );
}

function SignUpScreen({ onBack, fromDemo }: { onBack: () => void; fromDemo: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { signUp } = useAuth();
  // A successful sign-up with email confirmation required is NOT an error —
  // it's a distinct, valid outcome shown as its own screen, never collapsed
  // into the same error state as invalid details or a failed request.
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  if (confirmationRequired) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          Your account has been created. We&apos;ve sent a confirmation link to your email address — verify it, then
          sign in.
        </Text>
        <View style={styles.actions}>
          <Button label="Back to sign in" onPress={onBack} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <CredentialsForm
      title="Create account"
      submitLabel="Create account"
      onSubmit={(email, password) => signUp(email, password, fromDemo)}
      onBack={onBack}
      onSuccess={(result) => {
        if (result.status === "confirmation_required") setConfirmationRequired(true);
        // "signed_in" needs no further action here — AuthProvider's session
        // state (and, when this came from Demo, pendingProgramChoice) takes
        // the whole app to the right next screen.
      }}
    />
  );
}

function SignInScreen({ onBack, onForgotPassword }: { onBack: () => void; onForgotPassword: () => void }) {
  const { signIn } = useAuth();
  return (
    <CredentialsForm
      title="Sign in"
      submitLabel="Sign in"
      onSubmit={signIn}
      onBack={onBack}
      onForgotPassword={onForgotPassword}
    />
  );
}

function CredentialsForm<T>({
  title,
  submitLabel,
  onSubmit,
  onBack,
  onSuccess,
  onForgotPassword,
}: {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<T>;
  onBack: () => void;
  /** Called with the resolved value after a successful submit — lets the caller distinguish outcomes (e.g. signed-in vs. confirmation-required) without this generic form needing to know about them. */
  onSuccess?: (result: T) => void;
  /** Sign-in only — sign-up has no "forgotten" password yet to reset. */
  onForgotPassword?: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit(email.trim(), password);
      onSuccess?.(result);
    } catch (err) {
      // Genuine failures only reach here: invalid details, a duplicate
      // account, rate limiting, network problems — never a successful
      // sign-up awaiting confirmation, which onSuccess handles separately.
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{title}</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isSubmitting}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isSubmitting}
      />
      {onForgotPassword ? (
        <Pressable onPress={onForgotPassword} disabled={isSubmitting} accessibilityRole="button">
          <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
        </Pressable>
      ) : null}
      {error ? <ErrorState title="Couldn't complete that" description={error} onRetry={handleSubmit} /> : null}
      <View style={styles.actions}>
        <Button
          label={isSubmitting ? "Please wait…" : submitLabel}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
        <Button label="Back" onPress={onBack} variant="secondary" disabled={isSubmitting} />
      </View>
    </ScreenContainer>
  );
}

function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  // TEMPORARY — see requestPasswordResetDebug's doc comment. Remove alongside it.
  const [debugCapture, setDebugCapture] = useState<{ redirectTo: string; capturedRequestUrl: string } | null>(null);

  const trimmedEmail = email.trim();
  const emailIsValid = EMAIL_PATTERN.test(trimmedEmail);
  const canSubmit = trimmedEmail.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!emailIsValid) {
      setError("Enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const debug = await requestPasswordResetDebug(trimmedEmail);
      setDebugCapture(debug);
      // Shown regardless of whether this address has an account — see
      // requestPasswordReset's own doc comment for why that's deliberate.
      setEmailSent(true);
    } catch (err) {
      // A genuine failure to even attempt the request (network down, rate
      // limited) — distinct from "this email isn't registered", which never
      // reaches here because Supabase doesn't report that difference.
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Check your email</Text>
        {/* Deliberately generic — never echoes back or varies on whether
            trimmedEmail actually has an account; see requestPasswordReset's
            own doc comment for why that distinction must never be exposed. */}
        <Text style={styles.subtitle}>
          If an account exists for this email, we&apos;ll send you a password reset link.
        </Text>
        {/* TEMPORARY — diagnosing why Supabase falls back to the Site URL instead of this. Remove once confirmed. */}
        {debugCapture ? (
          <Text selectable style={{ fontSize: 11, color: "red", marginTop: 8 }}>
            DEBUG redirectTo: {debugCapture.redirectTo}{"\n"}
            DEBUG actual request URL: {debugCapture.capturedRequestUrl}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="Back to sign in" onPress={onBack} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>Enter your email and we&apos;ll send you a link to reset your password.</Text>
      {/* TEMPORARY — diagnosing why Supabase falls back to the Site URL instead of this. Remove once confirmed. */}
      <Text selectable style={{ fontSize: 11, color: "red", marginTop: 8 }}>
        DEBUG redirectTo: {Linking.createURL("reset-password")}
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isSubmitting}
      />
      {error ? <ErrorState title="Couldn't send that" description={error} onRetry={handleSubmit} /> : null}
      <View style={styles.actions}>
        <Button label={isSubmitting ? "Sending…" : "Send reset link"} onPress={handleSubmit} disabled={!canSubmit} />
        <Button label="Back to sign in" onPress={onBack} variant="secondary" disabled={isSubmitting} />
      </View>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    hero: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    subtitle: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
    },
    forgotPasswordLink: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.accentText,
      textAlign: "right",
    },
    actions: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    demoBanner: {
      backgroundColor: theme.color.accent,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      alignItems: "center",
    },
    demoBannerText: {
      color: theme.color.background,
      fontWeight: "700",
      fontSize: theme.typography.typeScale.caption.fontSize,
      letterSpacing: 1,
    },
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    line: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
      marginTop: 2,
    },
  });
}
