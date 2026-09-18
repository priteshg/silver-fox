import { useTheme } from "@silver-fox/ui";
import { Stack } from "expo-router";

export default function ExercisesStackLayout() {
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
      <Stack.Screen name="index" options={{ title: "Exercise Library" }} />
      <Stack.Screen name="new" options={{ title: "New Exercise" }} />
      <Stack.Screen name="[exerciseId]" options={{ title: "Exercise" }} />
    </Stack>
  );
}
