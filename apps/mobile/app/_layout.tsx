import { ErrorState, LoadingState, useTheme } from "@silver-fox/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthFlow } from "../components/AuthFlow";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { ActiveSessionProvider } from "../providers/ActiveSessionProvider";
import { AppThemeProvider, useAppTheme } from "../providers/ThemeProvider";

function RootStack() {
  const theme = useTheme();
  const { mode } = useAppTheme();

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/active" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="workout/summary"
          options={{
            headerShown: true,
            headerBackVisible: false,
            title: "Summary",
            headerStyle: { backgroundColor: theme.color.background },
            headerTintColor: theme.color.textPrimary,
            headerTitleStyle: { color: theme.color.textPrimary },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            title: "Profile",
            headerStyle: { backgroundColor: theme.color.background },
            headerTintColor: theme.color.textPrimary,
            headerTitleStyle: { color: theme.color.textPrimary },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

/**
 * Every screen behind the real app depends on an authenticated Supabase
 * session to read/write anything, since Row Level Security keys off
 * `auth.uid()`. This gates the app on AuthProvider's state instead of
 * letting each repository call race it independently:
 * - "loading"/"error" mirror the old SessionGate's connectivity states.
 * - "logged_out"/"demo" render AuthFlow (pre-authentication UI) instead of
 *   the real app — no automatic anonymous sign-in happens here, unlike the
 *   removed SessionGate, which unconditionally called ensureSession().
 * - "app" (a real session exists — restored, or just created via sign-up/
 *   sign-in) renders the real app exactly as before this change.
 */
function AppGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { status, errorMessage, viewMode, retry, pendingProgramChoice } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.background, justifyContent: "center" }}>
        <LoadingState label="Connecting…" />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.background, justifyContent: "center" }}>
        <ErrorState title="Couldn't connect" description={errorMessage} onRetry={retry} />
      </View>
    );
  }

  // A demo-originated signup that succeeded immediately (no email
  // confirmation needed) already has a real session — hasSession is true,
  // so viewMode is "app" — but the person hasn't yet chosen "Use this
  // programme" / "Start fresh" (CORE_IMPLEMENTATION_PLAN.md Stage 4).
  // Keeping AuthFlow mounted for this one extra beat is what makes that
  // choice reachable at all, instead of the real app rendering underneath
  // before they've answered.
  if (viewMode !== "app" || pendingProgramChoice) return <AuthFlow />;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <AppGate>
            <ActiveSessionProvider>
              <RootStack />
            </ActiveSessionProvider>
          </AppGate>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
