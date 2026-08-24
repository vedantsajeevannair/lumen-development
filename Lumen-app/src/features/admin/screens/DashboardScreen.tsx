// ============================================================
// LUMEN — Admin Dashboard (Government Command Center)
// Real data wired from /analytics endpoints — NO MOCK DATA
// ============================================================
import { useTheme } from "@/design-system/ThemeContext";
import { Avatar } from "@/design-system/components/Avatar";
import { Badge } from "@/design-system/components/Badge";
import { KPICard } from "@/design-system/components/KPICard";
import { TimeFilter } from "@/design-system/components/TimeFilter";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuthStore } from "@/store/AuthStore";
import { env } from "@/config/env";

const { width: W } = Dimensions.get("window");

const GREET = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ── Types ──────────────────────────────────────────────────
interface DashboardStats {
  totalComplaints: number;
  totalUsers: number;
  activeEngineers: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  avgResolutionHours: number | null;
  complaintsByStatus: { status: string; count: number }[];
  complaintsByPriority: { priority: string; count: number }[];
  complaintsByCategory: { category: string; count: number }[];
}

interface TrendPoint {
  day: string;
  count: number;
}

interface DeptPerformance {
  department: string;
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  actor: string;
  actorRole: string;
  complaintRef?: string;
  complaintTitle?: string;
  notes?: string;
  status?: string;
  createdAt: string;
}

interface SlaMetrics {
  slaBreached: number;
  criticalPending: number;
}

// ── Helpers ────────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  ROADS: "#208AEF",
  WATER: "#12B76A",
  ELECTRICITY: "#F79009",
  SANITATION: "#7C3AED",
  PARKS: "#06B6D4",
  POLICE: "#F04438",
  FIRE: "#EF4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#F04438",
  HIGH: "#F79009",
  MEDIUM: "#208AEF",
  LOW: "#12B76A",
};

const ACTIVITY_ICON_MAP: Record<string, { icon: string; color: string }> = {
  COMPLAINT_UPDATE: { icon: "report", color: "#208AEF" },
  AUDIT: { icon: "shield", color: "#7C3AED" },
  STATUS_CHANGE: { icon: "check", color: "#12B76A" },
  CREATED: { icon: "plus", color: "#F79009" },
};

const relativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const dayLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
};

// ── Component ──────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const { colors, isDark, shadows } = useTheme();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);

  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year" | "all">("week");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [departments, setDepartments] = useState<DeptPerformance[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [sla, setSla] = useState<SlaMetrics | null>(null);

  const headerFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const kpiAnim = useRef(new Animated.Value(0)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  const authHeader = { Authorization: `Bearer ${session?.access_token}` };

  const trendDays =
    timeFilter === "week" ? 7 : timeFilter === "month" ? 30 : timeFilter === "year" ? 365 : 90;

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, trendRes, deptRes, actRes, slaRes] = await Promise.all([
        fetch(`${env.apiUrl}/analytics/dashboard`, { headers: authHeader }),
        fetch(`${env.apiUrl}/analytics/trend?days=${trendDays}`, { headers: authHeader }),
        fetch(`${env.apiUrl}/analytics/departments`, { headers: authHeader }),
        fetch(`${env.apiUrl}/analytics/recent-activity?limit=20`, { headers: authHeader }),
        fetch(`${env.apiUrl}/analytics/sla`, { headers: authHeader }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (trendRes.ok) setTrend(await trendRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (actRes.ok) setActivity(await actRes.json());
      if (slaRes.ok) setSla(await slaRes.json());
    } catch (e) {
      console.warn("[Dashboard] Failed to fetch analytics", e);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, trendDays]);

  useEffect(() => {
    fetchAll().then(() => {
      Animated.sequence([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }),
      ]).start();

      setTimeout(() => {
        Animated.spring(kpiAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 14,
          bounciness: 8,
        }).start();
      }, 200);
      setTimeout(() => {
        Animated.spring(chartAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 14,
          bounciness: 8,
        }).start();
      }, 400);
      setTimeout(() => {
        Animated.spring(listAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 14,
          bounciness: 8,
        }).start();
      }, 600);
    });
  }, [timeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── Computed chart data ──────────────────────────────────
  const trendLabels = trend.length > 0 ? trend.map((t) => dayLabel(t.day)) : ["—"];
  const trendValues = trend.length > 0 ? trend.map((t) => t.count) : [0];

  const categoryData = (stats?.complaintsByCategory ?? []).slice(0, 5).map((c, i) => {
    const palette = ["#208AEF", "#12B76A", "#F79009", "#7C3AED", "#F04438"];
    return {
      name: c.category.length > 10 ? c.category.substring(0, 10) : c.category,
      value: c.count,
      color: palette[i % palette.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 10,
    };
  });

  const priorityLabels = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const priorityValues = priorityLabels.map(
    (p) => stats?.complaintsByPriority.find((x) => x.priority === p)?.count ?? 0
  );

  if (loading) {
    return (
      <View style={[s.loadingRoot, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[TextStyles.caption, { color: colors.textSecondary, marginTop: Spacing[3] }]}>
          Loading command center…
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />
      <LinearGradient
        colors={["#D9770615", "#D9770605", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.topAccent}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* ── Header ── */}
        <Animated.View style={[s.header, { opacity: headerFade }]}>
          <View style={s.headerContent}>
            <View style={s.greetingWrap}>
              <Text style={[TextStyles.label, { color: "#D97706", letterSpacing: 1 }]}>
                {GREET()}
              </Text>
              <Text
                style={[TextStyles.heading2, { color: colors.textPrimary, letterSpacing: -0.5 }]}
              >
                Admin Console
              </Text>
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: "#12B76A" }]} />
                <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                  {user?.fullName || "Government Operations"} · Live
                </Text>
              </View>
            </View>
          </View>
          <View style={s.headerRight}>
            {sla && sla.slaBreached > 0 && (
              <View
                style={[
                  s.alertPill,
                  { backgroundColor: "#F04438" + "20", borderColor: "#F04438" + "40" },
                ]}
              >
                <LumenIcon name="alert" size="xs" color="#F04438" />
                <Text style={[TextStyles.label, { color: "#F04438" }]}>{sla.slaBreached} SLA</Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [
                s.iconBtn,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderDefault,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  ...shadows.sm,
                },
              ]}
              accessibilityLabel="Settings"
            >
              <LumenIcon name="settings" size="md" color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Avatar name={user?.fullName || "Admin"} size="md" role="admin" online />
          </View>
        </Animated.View>

        <Animated.View style={[{ transform: [{ translateY: slideAnim }], opacity: headerFade }]}>
          {/* ── Time Filter ── */}
          <View style={s.section}>
            <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          </View>

          {/* ── KPI Cards Row ── */}
          <Animated.View style={[s.section, { opacity: kpiAnim }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.kpiRow}
            >
              <Animated.View style={{ transform: [{ scale: kpiAnim }] }}>
                <KPICard
                  title="Total Reports"
                  value={stats?.totalComplaints ?? 0}
                  icon={
                    <LumenIcon name="reportList" size="lg" color={colors.brand} strokeWidth={2} />
                  }
                  style={{ width: 200 }}
                  gradient={colors.gradientBrand}
                />
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: kpiAnim }] }}>
                <KPICard
                  title="Resolved"
                  value={stats?.resolvedComplaints ?? 0}
                  icon={
                    <LumenIcon
                      name="success"
                      size="lg"
                      color={colors.successText}
                      strokeWidth={2}
                    />
                  }
                  style={{ width: 200 }}
                  gradient={colors.gradientBrand}
                />
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: kpiAnim }] }}>
                <KPICard
                  title="Active Engineers"
                  value={stats?.activeEngineers ?? 0}
                  icon={<LumenIcon name="engineer" size="lg" color="#7C3AED" strokeWidth={2} />}
                  style={{ width: 200 }}
                  gradient={colors.gradientAccent}
                />
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: kpiAnim }] }}>
                <KPICard
                  title="Avg Resolution"
                  value={stats?.avgResolutionHours ?? 0}
                  suffix="h"
                  icon={
                    <LumenIcon name="timer" size="lg" color={colors.warningText} strokeWidth={2} />
                  }
                  style={{ width: 200 }}
                  gradient={colors.gradientBrand}
                />
              </Animated.View>
              {sla && (
                <Animated.View style={{ transform: [{ scale: kpiAnim }] }}>
                  <KPICard
                    title="SLA Breached"
                    value={sla.slaBreached}
                    icon={<LumenIcon name="alert" size="lg" color="#F04438" strokeWidth={2} />}
                    style={{ width: 200 }}
                    gradient={["#F0443810", "#F0443820"]}
                  />
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>

          {/* ── Reports Trend Chart ── */}
          <Animated.View style={[s.section, { opacity: chartAnim }]}>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={s.glassCard}>
              <LinearGradient
                colors={[isDark ? "#1a1a2e20" : "#ffffff40", isDark ? "#1a1a2e10" : "#ffffff20"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.chartCard}>
                <View style={s.chartHeader}>
                  <Text
                    style={[
                      TextStyles.subtitle,
                      { color: colors.textPrimary, letterSpacing: -0.3 },
                    ]}
                  >
                    Reports Trend
                  </Text>
                  <Badge label={`Last ${trendDays}d`} variant="brand" size="sm" />
                </View>
                {trendValues.every((v) => v === 0) ? (
                  <View style={s.emptyChart}>
                    <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                      No reports in this period
                    </Text>
                  </View>
                ) : (
                  <LineChart
                    data={{ labels: trendLabels, datasets: [{ data: trendValues }] }}
                    width={W - 80}
                    height={180}
                    yAxisLabel=""
                    yAxisSuffix=""
                    yAxisInterval={1}
                    chartConfig={{
                      backgroundColor: "transparent",
                      backgroundGradientFrom: isDark ? "#1a1a2e" : "#ffffff",
                      backgroundGradientTo: isDark ? "#1a1a2e" : "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(32, 138, 239, ${opacity})`,
                      labelColor: () => colors.textSecondary,
                      style: { borderRadius: 16 },
                      propsForDots: { r: "4", strokeWidth: "2", stroke: colors.brand },
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                  />
                )}
              </View>
            </BlurView>
          </Animated.View>

          {/* ── Category & Priority Charts ── */}
          <Animated.View style={[s.chartRow, { opacity: chartAnim }]}>
            {/* Category Pie */}
            <BlurView
              intensity={20}
              tint={isDark ? "dark" : "light"}
              style={[s.glassCard, { flex: 1 }]}
            >
              <LinearGradient
                colors={[isDark ? "#1a1a2e20" : "#ffffff40", isDark ? "#1a1a2e10" : "#ffffff20"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.chartCard}>
                <Text
                  style={[
                    TextStyles.subtitle,
                    { color: colors.textPrimary, marginBottom: Spacing[4], letterSpacing: -0.3 },
                  ]}
                >
                  By Category
                </Text>
                {categoryData.length === 0 ? (
                  <View style={s.emptyChart}>
                    <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                      No data
                    </Text>
                  </View>
                ) : (
                  <PieChart
                    data={categoryData}
                    width={150}
                    height={140}
                    chartConfig={{
                      backgroundColor: "transparent",
                      backgroundGradientFrom: "transparent",
                      backgroundGradientTo: "transparent",
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    accessor="value"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    center={[10, 0]}
                    absolute
                  />
                )}
              </View>
            </BlurView>

            {/* Priority Bar */}
            <BlurView
              intensity={20}
              tint={isDark ? "dark" : "light"}
              style={[s.glassCard, { flex: 1 }]}
            >
              <LinearGradient
                colors={[isDark ? "#1a1a2e20" : "#ffffff40", isDark ? "#1a1a2e10" : "#ffffff20"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.chartCard}>
                <Text
                  style={[
                    TextStyles.subtitle,
                    { color: colors.textPrimary, marginBottom: Spacing[4], letterSpacing: -0.3 },
                  ]}
                >
                  By Priority
                </Text>
                {priorityValues.every((v) => v === 0) ? (
                  <View style={s.emptyChart}>
                    <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                      No data
                    </Text>
                  </View>
                ) : (
                  <>
                    <BarChart
                      data={{
                        labels: ["CRIT", "HIGH", "MED", "LOW"],
                        datasets: [{ data: priorityValues }],
                      }}
                      width={150}
                      height={140}
                      yAxisLabel=""
                      yAxisSuffix=""
                      withHorizontalLabels={false}
                      withInnerLines={false}
                      showBarTops={false}
                      fromZero
                      chartConfig={{
                        backgroundColor: "transparent",
                        backgroundGradientFrom: "transparent",
                        backgroundGradientTo: "transparent",
                        decimalPlaces: 0,
                        color: (opacity = 1) => colors.brand,
                        labelColor: () => colors.textSecondary,
                      }}
                      style={{ marginLeft: -10 }}
                    />
                    <View style={s.priorityLegend}>
                      {priorityLabels.map((p) => (
                        <View key={p} style={s.legendItem}>
                          <View style={[s.legendDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                          <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          </Animated.View>

          {/* ── Department Performance ── */}
          {departments.length > 0 && (
            <Animated.View style={[s.section, { opacity: listAnim, marginTop: Spacing[4] }]}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={s.glassCard}>
                <LinearGradient
                  colors={[isDark ? "#1a1a2e20" : "#ffffff40", isDark ? "#1a1a2e10" : "#ffffff20"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.chartCard}>
                  <Text
                    style={[
                      TextStyles.subtitle,
                      { color: colors.textPrimary, marginBottom: Spacing[4], letterSpacing: -0.3 },
                    ]}
                  >
                    Department Performance
                  </Text>
                  {departments.map((dept) => {
                    const color = DEPT_COLORS[dept.department] || colors.brand;
                    return (
                      <Animated.View
                        key={dept.department}
                        style={{
                          transform: [
                            {
                              translateX: listAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                              }),
                            },
                          ],
                          opacity: listAnim,
                        }}
                      >
                        <View style={s.deptRow}>
                          <View style={s.deptInfo}>
                            <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary }]}>
                              {dept.department.charAt(0) + dept.department.slice(1).toLowerCase()}
                            </Text>
                            <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                              {dept.resolved} resolved · {dept.pending} pending · {dept.total} total
                            </Text>
                          </View>
                          <View style={s.deptProgress}>
                            <View style={[s.deptBar, { backgroundColor: colors.bgSubtle }]}>
                              <Animated.View
                                style={[
                                  s.deptBarFill,
                                  {
                                    width: listAnim
                                      .interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, dept.completionRate],
                                      })
                                      .interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ["0%", `${dept.completionRate}%`],
                                      }),
                                    backgroundColor: color,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[TextStyles.label, { color }]}>
                              {dept.completionRate}%
                            </Text>
                          </View>
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              </BlurView>
            </Animated.View>
          )}

          {/* ── Recent Activity (real from audit logs + complaint timeline) ── */}
          <Animated.View style={[s.section, { opacity: listAnim }]}>
            <View style={s.sectionHeader}>
              <Text
                style={[TextStyles.subtitle, { color: colors.textPrimary, letterSpacing: -0.3 }]}
              >
                Recent Activity
              </Text>
            </View>
            <View style={s.activityList}>
              {activity.length === 0 && (
                <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                  No recent activity
                </Text>
              )}
              {activity.map((item, idx) => {
                const meta = ACTIVITY_ICON_MAP[item.type] || {
                  icon: "info",
                  color: colors.textSecondary,
                };
                return (
                  <Animated.View
                    key={item.id}
                    style={{
                      transform: [
                        {
                          translateX: listAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                      opacity: listAnim,
                    }}
                  >
                    <Pressable
                      style={({ pressed }) => [s.activityItem, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <View style={[s.activityGlow, { backgroundColor: meta.color + "08" }]} />
                      <View style={s.activityRow}>
                        <View style={[s.activityIcon, { backgroundColor: meta.color + "15" }]}>
                          <LumenIcon
                            name={meta.icon as any}
                            size="sm"
                            color={meta.color}
                            strokeWidth={2}
                          />
                        </View>
                        <View style={s.activityInfo}>
                          <Text
                            style={[TextStyles.bodyMedium, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {item.complaintTitle || item.action}
                          </Text>
                          <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                            {item.actor}
                            {item.complaintRef ? ` · ${item.complaintRef}` : ""}
                          </Text>
                        </View>
                        <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                          {relativeTime(item.createdAt)}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          <View style={{ height: 90 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  topAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingTop: 56, paddingHorizontal: Spacing[5] },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing[6],
  },
  headerContent: { flex: 1 },
  greetingWrap: {},
  statusRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginTop: Spacing[2] },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  section: { marginBottom: Spacing[6] },
  kpiRow: { gap: Spacing[4], paddingHorizontal: 2 },
  glassCard: {
    borderRadius: Radius["3xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chartCard: { padding: Spacing[5] },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  emptyChart: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  chartRow: { flexDirection: "row", gap: Spacing[4], marginBottom: Spacing[6] },
  priorityLegend: {
    flexDirection: "row",
    gap: Spacing[3],
    marginTop: Spacing[4],
    justifyContent: "center",
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  deptRow: { gap: Spacing[3], marginBottom: Spacing[4] },
  deptInfo: { flex: 1 },
  deptProgress: { flexDirection: "row", alignItems: "center", gap: Spacing[3], flex: 1 },
  deptBar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  deptBarFill: { height: "100%", borderRadius: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[3],
  },
  activityList: { gap: Spacing[3] },
  activityItem: {
    position: "relative",
    padding: Spacing[4],
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  activityGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.xl,
  },
  activityRow: {
    flexDirection: "row",
    gap: Spacing[3],
    alignItems: "center",
    position: "relative",
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: { flex: 1, gap: 2 },
});
