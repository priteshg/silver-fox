import type { Theme } from "@silver-fox/config";
import { Button, Card, ErrorState, LoadingState, useTheme } from "@silver-fox/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer, TextField } from "../components";
import { exchangeRecoveryCode, signOut, updatePassword } from "../lib/supabase/auth";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Reached only two ways: a password-reset email's deep link (real device),
 * or `router.push`ing here directly during development/testing — never
 * through normal in-app navigation. `app/_layout.tsx`'s `AppGate` special-
 * cases this route to stay reachable regardless of auth state, since
 * `exchangeRecoveryCode` below establishes a real (temporary) session partway
 * through this screen's own lifecycle, and the person must stay on this
 * screen — not get swept into the real app — until they've actually set a
 * new password.
 */
type Step = "exchanging" | "invalid_link" | "form" | "success";

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [step, setStep] = useState<Step>("exchanging");
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // A missing code is exactly as unusable as one Supabase rejects — e.g. a
    // link pasted without its query string, or opened a second time after
    // the first open already consumed it via a different flow. Handled the
    // same way as any other invalid/expired/already-used code below, rather
    // than as a separate case, since the person can't tell the difference
    // and the recovery action (request a new link) is identical either way.
    if (!code) {
      setStep("invalid_link");
      return;
    }
    exchangeRecoveryCode(code)
      .then(() => {
        if (!cancelled) setStep("form");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setExchangeError(err instanceof Error ? err.message : "This reset link is invalid.");
        setStep("invalid_link");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (step === "exchanging") {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <LoadingState label="Verifying your link…" />
        </View>
      </ScreenContainer>
    );
  }

  if (step === "invalid_link") {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Reset link expired</Text>
        <ErrorState
          title="Your password reset link is no longer valid. Please request a new one."
          description={exchangeError ?? undefined}
        />
        <View style={styles.actions}>
          {/* Both routes to "/": there's no direct link to the sign-in
              screen's "Forgot password?" sub-screen from outside AuthFlow,
              so this lands on the welcome screen, one tap short of it. */}
          <Button label="Request a new reset link" onPress={() => router.replace("/")} />
        </View>
      </ScreenContainer>
    );
  }

  if (step === "success") {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.subtitle}>Your password has been changed successfully.</Text>
        <View style={styles.actions}>
          <Button label="Back to login" onPress={() => router.replace("/")} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <SetNewPasswordForm
      styles={styles}
      onSuccess={async () => {
        // The session exchangeRecoveryCode established is scoped to exactly
        // one thing — setting this new password — not a normal signed-in
        // session. Ending it here (rather than leaving it live) is what
        // makes "the user should then be able to log in using the new
        // password" actually true, and keeps this recovery session from
        // ever being mistaken for, or interfering with, a real one.
        await signOut();
        setStep("success");
      }}
    />
  );
}

function SetNewPasswordForm({
  styles,
  onSuccess,
}: {
  styles: ReturnType<typeof createStyles>;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (password.length === 0) return null;
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirmPassword.length > 0 && password !== confirmPassword) return "Passwords do not match.";
    return null;
  }, [password, confirmPassword]);

  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updatePassword(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Create a new password</Text>
      <Text style={styles.subtitle}>Must be at least {MIN_PASSWORD_LENGTH} characters.</Text>
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isSubmitting}
      />
      <TextField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!isSubmitting}
        onSubmitEditing={handleSubmit}
      />
      {validationError ? (
        <Card>
          <Text style={styles.validationText}>{validationError}</Text>
        </Card>
      ) : null}
      {error ? <ErrorState title="Couldn't complete that" description={error} onRetry={handleSubmit} /> : null}
      <View style={styles.actions}>
        <Button label={isSubmitting ? "Updating…" : "Update password"} onPress={handleSubmit} disabled={!canSubmit} />
      </View>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
    },
    title: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    subtitle: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    validationText: {
      color: theme.color.danger,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
    },
    actions: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });
}
