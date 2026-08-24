// ============================================================
// LUMEN — My Reports Screen  (Premium Redesign)
// ============================================================
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  TextInput,
  Animated,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Spacing, Radius, TextStyles } from "@/design-system/tokens";
import { ReportCard } from "../components/ReportCard";

import { useQuery } from "@tanstack/react-query";
import { CitizenService } from "@/services/citizen.service";

type Status = "all" | "PENDING" | "IN_PROGRESS" | "RESOLVED";

const FILTERS: { id: Status; label: string; color: string; bg: string }[] = [
  { id: "all", label: "All", color: "#208AEF", bg: "#EBF5FF" },
  { id: "PENDING", label: "Pending", color: "#C2410C", bg: "#FFEDD5" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#0F766E", bg: "#CCFBF1" },
  { id: "RESOLVED", label: "Resolved", color: "#15803D", bg: "#DCFCE7" },
];

const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  road: { icon: "road", color: "#F59E0B" },
  streetlight: { icon: "streetlight", color: "#8B5CF6" },
  water: { icon: "water", color: "#0EA5E9" },
  garbage: { icon: "garbage", color: "#10B981" },
  electricity: { icon: "electricity", color: "#F97316" },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#F04438",
  CRITICAL: "#F04438",
  MEDIUM: "#F79009",
  LOW: "#12B76A",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; darkColor: string }
> = {
  PENDING: { label: "Pending", color: "#C2410C", bg: "#FFEDD5", darkColor: "#FB923C" },
  ASSIGNED: { label: "Assigned", color: "#C2410C", bg: "#FFEDD5", darkColor: "#FB923C" },
  IN_PROGRESS: { label: "In Progress", color: "#0F766E", bg: "#CCFBF1", darkColor: "#2DD4BF" },
  RESOLVED: { label: "Resolved", color: "#15803D", bg: "#DCFCE7", darkColor: "#4ADE80" },
  CLOSED: { label: "Closed", color: "#15803D", bg: "#DCFCE7", darkColor: "#4ADE80" },
  REJECTED: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2", darkColor: "#F87171" },
};

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString();
}

function getProgress(status: string): number {
  const s = (status || "").toUpperCase();
  if (s === "RESOLVED" || s === "CLOSED") return 100;
  if (s === "IN_PROGRESS") return 65;
  if (s === "ASSIGNED") return 25;
  return 5;
}

// ── Stats Card ──────────────────────────────────────────────────
import { MotiView } from "moti";

function StatCard({
  count,
  label,
  color,
  bg,
  isDark,
  delay = 0,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
  isDark: boolean;
  delay?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20, scale: 0.9 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", delay, damping: 14, stiffness: 100 }}
      style={[
        stat.card,
        {
          backgroundColor: isDark ? color + "1A" : bg,
          borderColor: isDark ? color + "33" : color + "1A",
        },
      ]}
    >
      <View style={stat.contentWrap}>
        <Text style={[stat.count, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {count}
        </Text>
        <Text style={[stat.label, { color: isDark ? color + "CC" : color }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </MotiView>
  );
}

const stat = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  contentWrap: { alignItems: "center", justifyContent: "center", gap: 2 },
  count: { fontSize: 26, fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    letterSpacing: 0.2,
  },
});

// ── Category Pill ───────────────────────────────────────────────
function CategoryPill({
  category,
  count,
  isDark,
}: {
  category: string;
  count: number;
  isDark: boolean;
}) {
  const meta = CATEGORY_META[category.toLowerCase()] || { icon: "reportList", color: "#208AEF" };
  return (
    <View style={[cp.pill, { backgroundColor: isDark ? meta.color + "18" : meta.color + "15" }]}>
      <LumenIcon name={meta.icon} size="xs" color={meta.color} strokeWidth={2} />
      <Text style={[cp.label, { color: meta.color }]}>
        {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
      </Text>
      <View style={[cp.badge, { backgroundColor: meta.color }]}>
        <Text style={cp.badgeText}>{count}</Text>
      </View>
    </View>
  );
}

const cp = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  label: { fontSize: 12, fontWeight: "600" },
  badge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF" },
});

// ── Premium Report Card ─────────────────────────────────────────
function PremiumReportCard({
  report,
  colors,
  isDark,
}: {
  report: any;
  colors: any;
  isDark: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const normalizedStatus = (report.status || "PENDING").toUpperCase();
  const sc = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.PENDING;
  const priorityColor = PRIORITY_COLOR[(report.priority || "MEDIUM").toUpperCase()] || "#F79009";
  const catMeta = CATEGORY_META[(report.category || "").toLowerCase()] || {
    icon: "reportList",
    color: "#208AEF",
  };
  const progress = getProgress(report.status);

  return (
    <Pressable
      onPress={() => router.push(`/(citizen)/Report-details?id=${report.id}` as any)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        prc.card,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.982 : 1 }],
          shadowColor: isDark ? "#000" : "#1D2939",
          shadowOpacity: isDark ? 0.4 : 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
      ]}
    >
      {/* Top row: icon + info + priority dot */}
      <View style={prc.topRow}>
        {/* Category icon / uploaded image thumbnail */}
        {report.imageUrl ? (
          <Image
            source={{ uri: report.imageUrl }}
            style={prc.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[prc.iconWrap, { backgroundColor: catMeta.color + "18" }]}>
            <LumenIcon name={catMeta.icon} size="sm" color={catMeta.color} strokeWidth={2.5} />
          </View>
        )}

        {/* Info */}
        <View style={prc.infoWrap}>
          <Text style={[prc.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {report.title}
          </Text>
          <View style={prc.metaRow}>
            <View style={[prc.statusBadge, { backgroundColor: isDark ? sc.color + "22" : sc.bg }]}>
              <View
                style={[prc.statusDot, { backgroundColor: isDark ? sc.darkColor : sc.color }]}
              />
              <Text style={[prc.statusText, { color: isDark ? sc.darkColor : sc.color }]}>
                {sc.label}
              </Text>
            </View>
            <Text style={[prc.timeText, { color: colors.textTertiary }]}>{report.time}</Text>
          </View>
        </View>

        {/* Priority dot */}
        <View style={prc.rightCol}>
          <View style={[prc.priorityDot, { backgroundColor: priorityColor }]} />
          <LumenIcon name="chevronRight" size="xs" color={colors.textTertiary} strokeWidth={2} />
        </View>
      </View>

      {/* Progress bar */}
      {progress > 0 && (
        <View style={prc.progressWrap}>
          <View
            style={[
              prc.progressBg,
              { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F2F5" },
            ]}
          >
            <View
              style={[
                prc.progressFill,
                {
                  width: `${progress}%` as any,
                  backgroundColor: normalizedStatus === "RESOLVED" ? "#12B76A" : colors.brand,
                },
              ]}
            />
          </View>
          <Text style={[prc.progressText, { color: colors.textTertiary }]}>{progress}%</Text>
        </View>
      )}

      {/* ID chip */}
      <View style={prc.idRow}>
        <LumenIcon name="clipboard" size="xs" color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={[prc.idText, { color: colors.textTertiary }]}>
          #{report.trackingId || report.id}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[prc.catLabel, { color: catMeta.color }]}>
          {(report.category || "").charAt(0).toUpperCase() +
            (report.category || "").slice(1).toLowerCase()}
        </Text>
      </View>
    </Pressable>
  );
}

const prc = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  infoWrap: { flex: 1, gap: 6 },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  timeText: { fontSize: 12 },
  rightCol: { alignItems: "center", gap: 6 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  progressBg: { flex: 1, height: 5, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { fontSize: 11, fontWeight: "700", width: 30, textAlign: "right" },
  idRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  idText: { fontSize: 11 },
  catLabel: { fontSize: 11, fontWeight: "600" },
});

// ── Screen ──────────────────────────────────────────────────────
export default function MyReportScreen() {
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: complaints, refetch } = useQuery({
    queryKey: ["citizen-complaints"],
    queryFn: () => CitizenService.getComplaints(),
  });

  const mappedReports = useMemo(
    () =>
      (complaints || []).map((c: any) => ({
        id: c.id,
        trackingId: c.trackingId,
        title: c.title || c.description || "Untitled Report",
        category: (c.category || "road").toLowerCase(),
        status: c.status || "PENDING",
        time: formatTime(c.createdAt),
        priority: c.priority || "MEDIUM",
      })),
    [complaints]
  );

  // Stats
  const total = mappedReports.length;
  const pending = mappedReports.filter((r: any) =>
    ["PENDING", "ASSIGNED"].includes((r.status || "").toUpperCase())
  ).length;
  const inProgress = mappedReports.filter(
    (r: any) => r.status.toUpperCase() === "IN_PROGRESS"
  ).length;
  const resolved = mappedReports.filter((r: any) =>
    ["RESOLVED", "CLOSED"].includes((r.status || "").toUpperCase())
  ).length;

  // Category breakdown
  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    mappedReports.forEach((r: any) => {
      const cat = (r.category || "other").toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [mappedReports]);

  const filtered = useMemo(() => {
    let list = mappedReports;
    if (filter !== "all") {
      list = list.filter((r: any) => {
        const s = (r.status || "").toUpperCase();
        if (filter === "IN_PROGRESS") return ["IN_PROGRESS", "ASSIGNED"].includes(s);
        if (filter === "RESOLVED") return ["RESOLVED", "CLOSED"].includes(s);
        return s === filter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r: any) => r.title.toLowerCase().includes(q));
    }
    return list;
  }, [mappedReports, filter, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[s.root, { backgroundColor: isDark ? "#0F1624" : "#F7F8FC" }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#0F1624" : "#F7F8FC"}
      />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: isDark ? "#0F1624" : "#F7F8FC" }]}>
        <Pressable onPress={() => router.back()} hitSlop={14} style={s.backBtn}>
          <LumenIcon name="back" size="md" color={colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>My Reports</Text>
          {total > 0 && (
            <View style={[s.totalBadge, { backgroundColor: colors.brand }]}>
              <Text style={s.totalBadgeText}>{total}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* ── Stats Row ── */}
        <View style={[s.statsRow, { paddingTop: Spacing[4] }]}>
          <StatCard
            delay={100}
            count={total}
            label="Total"
            color="#208AEF"
            bg="#EBF5FF"
            isDark={isDark}
          />
          <StatCard
            delay={200}
            count={pending}
            label="Pending"
            color="#C2410C"
            bg="#FFEDD5"
            isDark={isDark}
          />
          <StatCard
            delay={300}
            count={inProgress}
            label="In Progress"
            color="#0F766E"
            bg="#CCFBF1"
            isDark={isDark}
          />
          <StatCard
            delay={400}
            count={resolved}
            label="Resolved"
            color="#15803D"
            bg="#DCFCE7"
            isDark={isDark}
          />
        </View>

        {/* ── Category breakdown ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>By Category</Text>
          {Object.keys(categoryCount).length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 4 }}
            >
              {Object.entries(categoryCount).map(([cat, count]) => (
                <CategoryPill key={cat} category={cat} count={count} isDark={isDark} />
              ))}
            </ScrollView>
          ) : (
            <Text
              style={[
                TextStyles.body,
                { color: colors.textTertiary, paddingHorizontal: Spacing[1] },
              ]}
            >
              No categories yet.
            </Text>
          )}
        </View>

        {/* ── Search ── */}
        <View
          style={[
            s.searchWrap,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <LumenIcon name="search" size="sm" color={colors.textTertiary} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search reports…"
            placeholderTextColor={colors.textTertiary}
            style={[s.searchInput, { color: colors.textPrimary }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <LumenIcon name="close" size="xs" color={colors.textTertiary} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* ── Filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  s.filterChip,
                  {
                    backgroundColor: isActive
                      ? isDark
                        ? f.color + "28"
                        : f.bg
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#FFFFFF",
                    borderColor: isActive
                      ? f.color
                      : isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    s.filterLabel,
                    {
                      color: isActive ? f.color : colors.textSecondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Report List ── */}
        <View style={s.listContainer}>
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <View
                style={[
                  s.emptyIcon,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7" },
                ]}
              >
                <LumenIcon
                  name="reportList"
                  size="xl"
                  color={colors.textTertiary}
                  strokeWidth={1.5}
                />
              </View>
              <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No reports found</Text>
              <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>
                {filter === "all"
                  ? "You haven't filed any reports yet."
                  : `No ${FILTERS.find((f) => f.id === filter)?.label ?? ""} reports found.`}
              </Text>
            </View>
          ) : (
            filtered.map((report: any) => (
              <PremiumReportCard key={report.id} report={report} colors={colors} isDark={isDark} />
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  totalBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  totalBadgeText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 16 },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "500" },

  // Filters
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16, paddingRight: 24 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13 },

  // List
  listContainer: { paddingHorizontal: 20 },

  // Empty state
  emptyWrap: { alignItems: "center", paddingTop: 40, paddingBottom: 20, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
  },
  emptyActionText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
