import { useTheme } from "@silver-fox/ui";
import { Stack } from "expo-router";

export default function WorkoutsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.color.background },
        headerTintColor: theme.color.textPrimary,
        headerTitleStyle: { color: theme.color.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.color.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="log-cardio" options={{ title: "Log Cardio" }} />
      <Stack.Screen name="log-mobility" options={{ title: "Log Mobility" }} />
    </Stack>
  );
}
