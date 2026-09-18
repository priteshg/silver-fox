import { useTheme } from "@silver-fox/ui";
import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: ColorValue }) {
  return <Text style={{ color, fontSize: 11, fontWeight: focused ? "700" : "500" }}>{label}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accentText,
        tabBarInactiveTintColor: theme.color.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          height: 56 + theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
          paddingTop: theme.spacing.xs,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: ({ focused, color }) => <TabLabel label="Home" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarLabel: ({ focused, color }) => <TabLabel label="Workouts" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: "Programmes",
          tabBarLabel: ({ focused, color }) => <TabLabel label="Programmes" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercises",
          tabBarLabel: ({ focused, color }) => <TabLabel label="Exercises" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarLabel: ({ focused, color }) => <TabLabel label="Progress" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
