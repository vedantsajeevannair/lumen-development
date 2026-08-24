import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Spacing } from "@/design-system/tokens";

export interface ReportItemData {
  id: string;
  title: string;
  category: string;
  status: string;
  time: string;
  priority: string;
}

interface ReportCardProps {
  report: ReportItemData;
  colors: any;
  isDark: boolean;
}

const CATEGORY_ICON: Record<string, any> = {
  road: "road",
  streetlight: "streetlight",
  water: "water",
  garbage: "garbage",
  electricity: "electricity",
};

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "#C2410C", bg: "#FFEDD5" },
  ASSIGNED: { label: "Assigned", color: "#C2410C", bg: "#FFEDD5" },
  IN_PROGRESS: { label: "In Progress", color: "#0F766E", bg: "#CCFBF1" },
  RESOLVED: { label: "Resolved", color: "#15803D", bg: "#DCFCE7" },
  CLOSED: { label: "Closed", color: "#15803D", bg: "#DCFCE7" },
  REJECTED: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#F04438",
  CRITICAL: "#F04438",
  MEDIUM: "#F79009",
  LOW: "#12B76A",
};

export function ReportCard({ report, colors, isDark }: ReportCardProps) {
  const normalizedStatus = (report.status || "PENDING").toUpperCase();
  const status =
    STATUS_CONFIG[normalizedStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;

  const priorityColor = PRIORITY_COLOR[(report.priority || "MEDIUM").toUpperCase()] || "#F79009";

  return (
    <Pressable
      onPress={() => router.push(`/(citizen)/Report-details?id=${report.id}` as any)}
      style={({ pressed }) => [
        rc.card,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FDFDFD",
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={rc.cardInner}>
        {/* Left Icon */}
        <View
          style={[rc.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7" }]}
        >
          <LumenIcon
            name={CATEGORY_ICON[(report.category || "").toLowerCase()] || "reportList"}
            size="sm"
            color={isDark ? "#FFFFFF" : "#1D2939"}
            strokeWidth={2}
          />
        </View>

        {/* Center Info */}
        <View style={rc.infoWrap}>
          <Text style={[rc.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {report.title}
          </Text>
          <View style={rc.metaRow}>
            <View
              style={[
                rc.statusBadge,
                { backgroundColor: isDark ? status.color + "20" : status.bg },
              ]}
            >
              <Text style={[rc.statusText, { color: isDark ? "#FFFFFF" : status.color }]}>
                {status.label}
              </Text>
            </View>
            <Text style={[rc.timeText, { color: colors.textTertiary }]}>{report.time}</Text>
          </View>
        </View>

        {/* Right Dot */}
        <View style={[rc.priorityDot, { backgroundColor: priorityColor }]} />
      </View>
    </Pressable>
  );
}

const rc = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.1)",
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoWrap: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
});
