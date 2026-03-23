import { Tabs } from "expo-router";
import { Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { colors } from "@/constants/theme";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {name}
    </Text>
  );
}

export default function TabLayout() {
  const lang = useLanguage((s) => s.lang);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 12,
          paddingBottom: bottomPadding,
          height: 64 + bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 1,
          textTransform: "uppercase",
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home", lang),
          tabBarIcon: ({ focused }) => <TabIcon name="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="moment"
        options={{
          title: t("moment", lang),
          tabBarIcon: ({ focused }) => <TabIcon name="◉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t("studio", lang),
          tabBarIcon: ({ focused }) => <TabIcon name="▤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile", lang),
          tabBarIcon: ({ focused }) => <TabIcon name="◐" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 32,
    color: colors.textMuted,
  },
  tabIconFocused: {
    color: colors.textPrimary,
  },
});
