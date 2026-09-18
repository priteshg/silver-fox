import { useTheme } from "@silver-fox/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <ActiveSessionProvider>
          <RootStack />
        </ActiveSessionProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
