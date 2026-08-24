// ============================================================
// LUMEN — Notifications Screen (Citizen)
// Phase 3: Citizen Experience
// ============================================================
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Badge } from "@/design-system/components/Badge";
import { EmptyState } from "@/design-system/components/Extras";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import type { LumenIconName } from "@/design-system";

interface Notif {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "report" | "alert" | "system" | "engineer";
  icon: LumenIconName;
}

const GROUPS: { label: string; items: Notif[] }[] = [
  {
    label: "Today",
    items: [
      {
        id: "1",
        title: "Engineer Assigned",
        message: "Rajesh Kumar has been assigned to your MG Road pothole report.",
        time: "2h ago",
        read: false,
        type: "engineer",
        icon: "engineer",
      },
      {
        id: "2",
        title: "Report In Progress",
        message: "Work has started on your Street Light issue near Park Ave.",
        time: "4h ago",
        read: false,
        type: "report",
        icon: "tools",
      },
      {
        id: "3",
        title: "City Alert: Water Supply",
        message: "Water supply disruption in Zone B. Estimated restoration: 4 hours.",
        time: "5h ago",
        read: false,
        type: "alert",
        icon: "water",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        id: "4",
        title: "Report Resolved ✓",
        message: "Water pipeline leak on 5th Cross has been resolved.",
        time: "Yesterday, 3 PM",
        read: true,
        type: "report",
        icon: "success",
      },
      {
        id: "5",
        title: "Report Submitted",
        message: "Your report #R004 for garbage overflow has been received.",
        time: "Yesterday, 10 AM",
        read: true,
        type: "system",
        icon: "report",
      },
    ],
  },
  {
    label: "This Week",
    items: [
      {
        id: "6",
        title: "System Update",
        message: "LUMEN app updated to version 1.2 with new features.",
        time: "Mon, 9 AM",
        read: true,
        type: "system",
        icon: "info",
      },
    ],
  },
];

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  report: { color: "#208AEF", bg: "#EBF5FF" },
  alert: { color: "#F79009", bg: "#FFFAEB" },
  system: { color: "#667085", bg: "#F2F4F7" },
  engineer: { color: "#7C3AED", bg: "#F5F3FF" },
};

export default function NotificationsScreen() {
  const { colors, isDark, shadows } = useTheme();
  const [groups, setGroups] = useState(GROUPS);
  const unreadCount = GROUPS.flatMap((g) => g.items).filter((n) => !n.read).length;

  const markAllRead = () => {
    setGroups((gs) =>
      gs.map((g) => ({
        ...g,
        items: g.items.map((n) => ({ ...n, read: true })),
      }))
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />

      <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <LumenIcon name="back" size="md" color={colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[s.unreadBubble, { backgroundColor: colors.brand }]}>
              <Text style={[TextStyles.labelSmall, { color: "#FFF" }]}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={markAllRead} hitSlop={8}>
          <Text style={[TextStyles.label, { color: colors.brand }]}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {groups.every((g) => g.items.length === 0) ? (
          <EmptyState
            icon="notifications"
            title="All caught up!"
            description="You have no notifications at this time."
          />
        ) : (
          groups.map((group) => (
            <View key={group.label}>
              <Text style={[TextStyles.label, s.groupLabel, { color: colors.textTertiary }]}>
                {group.label}
              </Text>
              {group.items.map((notif) => {
                const tc = TYPE_CONFIG[notif.type];
                return (
                  <Pressable
                    key={notif.id}
                    style={({ pressed }) => [
                      s.notifCard,
                      {
                        backgroundColor: notif.read ? colors.bgSurface : colors.brandSoft + "80",
                        borderColor: notif.read ? colors.borderDefault : colors.brandBorder,
                        opacity: pressed ? 0.85 : 1,
                        ...shadows.sm,
                      },
                    ]}
                  >
                    <View style={[s.notifIcon, { backgroundColor: tc.bg }]}>
                      <LumenIcon name={notif.icon} size="md" color={tc.color} strokeWidth={2} />
                    </View>
                    <View style={s.notifContent}>
                      <View style={s.notifTitleRow}>
                        <Text style={[TextStyles.label, { color: colors.textPrimary, flex: 1 }]}>
                          {notif.title}
                        </Text>
                        {!notif.read && (
                          <View style={[s.unreadDot, { backgroundColor: colors.brand }]} />
                        )}
                      </View>
                      <Text
                        style={[TextStyles.bodySmall, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {notif.message}
                      </Text>
                      <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                        {notif.time}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
        <View style={{ height: Spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingTop: 52,
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  unreadBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: Spacing[5], paddingTop: Spacing[4] },
  groupLabel: { marginBottom: Spacing[3], marginTop: Spacing[2] },
  notifCard: {
    flexDirection: "row",
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    marginBottom: Spacing[3],
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1, gap: 4 },
  notifTitleRow: { flexDirection: "row", alignItems: "center" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
