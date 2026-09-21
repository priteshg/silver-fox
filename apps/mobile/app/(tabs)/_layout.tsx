import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: "home", inactive: "home-outline" },
  workouts: { active: "barbell", inactive: "barbell-outline" },
  programs: { active: "library", inactive: "library-outline" },
  exercises: { active: "fitness", inactive: "fitness-outline" },
  progress: { active: "trending-up", inactive: "trending-up-outline" },
};

/** Bar content height, excluding the safe-area bottom inset added on top of it. */
const BAR_CONTENT_HEIGHT = 64;

function TabIcon({
  routeName,
  focused,
  color,
  styles,
}: {
  routeName: string;
  focused: boolean;
  color: ColorValue;
  styles: ReturnType<typeof createStyles>;
}) {
  const icons = TAB_ICONS[routeName];
  if (!icons) return null;
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />
    </View>
  );
}

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: ColorValue }) {
  return (
    <Text
      style={{ color, fontSize: 10.5, fontWeight: focused ? "700" : "500", textAlign: "center" }}
      numberOfLines={1}
      // Shrinks "Programmes"/"Exercises" to fit narrower phone widths instead
      // of wrapping onto a second line — which the fixed-height tab bar then
      // clips, cutting the label off entirely. iOS-only prop; Android quietly
      // ignores it and relies on numberOfLines + the smaller base size above.
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  // Android's system nav bar (gesture pill or 3-button) is reported here via
  // react-native-safe-area-context, which reflects the live window insets —
  // never a guessed constant — so this adapts across devices, orientations,
  // and gesture vs. 3-button navigation modes automatically.
  const bottomInset = Math.max(insets.bottom, theme.spacing.xs);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accentText,
        tabBarInactiveTintColor: theme.color.textTertiary,
        // Prevents the bar floating mid-screen above the keyboard on Android;
        // it hides while a field is focused and reappears on dismiss.
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.color.border,
          height: BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: theme.spacing.sm,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          elevation: theme.elevation.raised.level,
          shadowColor: "#000",
          shadowOpacity: theme.elevation.raised.shadowOpacity,
          shadowRadius: theme.elevation.raised.shadowRadius,
          shadowOffset: { width: 0, height: -theme.elevation.raised.shadowOffsetY },
        },
        tabBarItemStyle: styles.tabItem,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon routeName="index" focused={focused} color={color} styles={styles} />
          ),
          tabBarLabel: ({ focused, color }) => <TabLabel label="Home" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon routeName="workouts" focused={focused} color={color} styles={styles} />
          ),
          tabBarLabel: ({ focused, color }) => <TabLabel label="Workouts" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: "Programmes",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon routeName="programs" focused={focused} color={color} styles={styles} />
          ),
          tabBarLabel: ({ focused, color }) => <TabLabel label="Programmes" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercises",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon routeName="exercises" focused={focused} color={color} styles={styles} />
          ),
          tabBarLabel: ({ focused, color }) => <TabLabel label="Exercises" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon routeName="progress" focused={focused} color={color} styles={styles} />
          ),
          tabBarLabel: ({ focused, color }) => <TabLabel label="Progress" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    tabItem: {
      paddingTop: 0,
      gap: 2,
    },
    iconPill: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
    },
    iconPillActive: {
      backgroundColor: theme.color.surfaceElevated,
    },
  });
}
