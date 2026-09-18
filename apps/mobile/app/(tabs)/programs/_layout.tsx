import { useTheme } from "@silver-fox/ui";
import { Stack } from "expo-router";

export default function ProgramsStackLayout() {
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
      <Stack.Screen name="index" options={{ title: "Programmes" }} />
      <Stack.Screen name="new" options={{ title: "New Programme" }} />
      <Stack.Screen name="[programId]/index" options={{ title: "Programme" }} />
      <Stack.Screen name="[programId]/day/[dayId]/add-exercise" options={{ title: "Add Exercise" }} />
      <Stack.Screen
        name="[programId]/day/[dayId]/exercise/[programExerciseId]"
        options={{ title: "Exercise Target" }}
      />
    </Stack>
  );
}
