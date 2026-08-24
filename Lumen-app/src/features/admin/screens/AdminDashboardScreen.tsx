import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useTheme } from "@/design-system/ThemeContext";
import { Card } from "@/design-system/components/Card";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import { useAuthStore } from "@/store/AuthStore";
import { env } from "@/config/env";

export default function AdminDashboardScreen() {
  const { colors, isDark } = useTheme();
  const session = useAuthStore((s) => s.session);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${env.apiUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.warn("Failed to fetch admin stats", e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#F59E0B";
      case "ASSIGNED":
      case "IN_PROGRESS":
        return "#3B82F6";
      case "RESOLVED":
      case "CLOSED":
        return "#10B981";
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>City Overview</Text>
        <LumenIcon name="settings" size="md" color={colors.textPrimary} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        <Text
          style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[2] }]}
        >
          High-Level Metrics
        </Text>

        <View style={s.statsGrid}>
          <Card variant="elevated" style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: colors.brand + "15" }]}>
              <LumenIcon name="report" size="md" color={colors.brand} />
            </View>
            <Text
              style={[TextStyles.heading1, { color: colors.textPrimary, marginTop: Spacing[3] }]}
            >
              {stats?.totalComplaints || 0}
            </Text>
            <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
              Total Complaints
            </Text>
          </Card>

          <Card variant="elevated" style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: "#10B98115" }]}>
              <LumenIcon name="check" size="md" color="#10B981" />
            </View>
            <Text
              style={[TextStyles.heading1, { color: colors.textPrimary, marginTop: Spacing[3] }]}
            >
              {stats?.complaintsByStatus?.find((s: any) => s.status === "RESOLVED")?.count || 0}
            </Text>
            <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
              Resolved Issues
            </Text>
          </Card>
        </View>

        <Text
          style={[
            TextStyles.subtitle,
            { color: colors.textPrimary, marginTop: Spacing[6], marginBottom: Spacing[2] },
          ]}
        >
          Complaint Breakdown
        </Text>

        <Card variant="elevated">
          {stats?.complaintsByStatus?.map((item: any) => (
            <View key={item.status} style={s.row}>
              <View style={s.rowLeft}>
                <View style={[s.dot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary }]}>
                  {item.status}
                </Text>
              </View>
              <Text style={[TextStyles.body, { color: colors.textSecondary }]}>{item.count}</Text>
            </View>
          ))}
          {!stats?.complaintsByStatus?.length && (
            <Text style={[TextStyles.body, { color: colors.textSecondary }]}>
              No data available
            </Text>
          )}
        </Card>

        <View style={{ height: Spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scroll: {
    padding: Spacing[5],
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing[4],
  },
  statCard: {
    flex: 1,
    padding: Spacing[4],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
