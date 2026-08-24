import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { TextStyles } from "@/design-system/tokens";
import { CitizenService } from "@/services/citizen.service";
import { CitizenAnalyticsResponse } from "@/types/analytics";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { StatusBar } from "react-native";

const { width: W } = Dimensions.get("window");
const CHART_WIDTH = W - 72;

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const [range, setRange] = useState<"Daily" | "Monthly" | "Yearly">("Daily");

  const { data, isLoading, isError, refetch } = useQuery<CitizenAnalyticsResponse>({
    queryKey: ["analytics", range],
    queryFn: () => CitizenService.getAnalytics(range),
  });

  const renderHeader = () => (
    <View style={s.header}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
      >
        <LumenIcon name="arrowLeft" size="sm" color={colors.textPrimary} />
      </Pressable>
      <View style={{ alignItems: "center" }}>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Analytics & Insights</Text>
        <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>Real-time Citizen Impact</Text>
      </View>
      <View style={s.backBtn} />
    </View>
  );

  const renderLoading = () => (
    <View style={s.centerState}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={[TextStyles.body, { color: colors.textSecondary, marginTop: 16 }]}>
        Loading your insights...
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={s.centerState}>
      <LumenIcon name="alert" size="lg" color="#EF4444" />
      <Text style={[TextStyles.body, { color: colors.textPrimary, marginTop: 16, marginBottom: 24 }]}>
        Unable to load analytics.
      </Text>
      <Pressable
        style={[s.retryBtn, { backgroundColor: colors.brand }]}
        onPress={() => refetch()}
      >
        <Text style={{ color: "#FFF", fontWeight: "600" }}>Retry</Text>
      </Pressable>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.centerState}>
      <View style={[s.emptyIconWrap, { backgroundColor: colors.bgSubtle }]}>
        <LumenIcon name="spark" size="lg" color={colors.brand} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary, marginTop: 24 }}>
        No civic activity yet
      </Text>
      <Text style={[TextStyles.body, { color: colors.textSecondary, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }]}>
        Submit your first report to start building your civic insights and improving your city.
      </Text>
      <Pressable
        style={[s.retryBtn, { backgroundColor: colors.brand, marginTop: 24 }]}
        onPress={() => router.push("/(citizen)/Report-issue")}
      >
        <Text style={{ color: "#FFF", fontWeight: "600" }}>Report an Issue</Text>
      </Pressable>
    </View>
  );

  if (isLoading) return <View style={[s.container, { backgroundColor: colors.bgBase }]}>{renderHeader()}{renderLoading()}</View>;
  if (isError || !data) return <View style={[s.container, { backgroundColor: colors.bgBase }]}>{renderHeader()}{renderError()}</View>;
  if (data.overview.totalReports === 0) return <View style={[s.container, { backgroundColor: colors.bgBase }]}>{renderHeader()}{renderEmpty()}</View>;

  const trendData = data.trend.labels.map((label, i) => ({
    value: data.trend.datasets.submitted[i],
    label: label,
    frontColor: colors.brand,
    topLabelComponent: () => (
      <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 4 }}>
        {data.trend.datasets.submitted[i]}
      </Text>
    ),
  }));

  const pieData = data.statusBreakdown.map((s, i) => {
    const palette = ["#10B981", colors.brand, "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
    return {
      value: s.count,
      text: `${s.count}`,
      color: palette[i % palette.length],
      focused: s.status === "RESOLVED",
    };
  });

  return (
    <View style={[s.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={s.bgGlowWrap}>
        <BlurView intensity={isDark ? 80 : 40} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
          <View style={[s.glowOrb, { backgroundColor: colors.brand, top: -100, right: -50 }]} />
          <View style={[s.glowOrb, { backgroundColor: "#7C3AED", top: 200, left: -100 }]} />
        </BlurView>
      </View>

      {renderHeader()}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={{ gap: 24 }}>
          {/* Civic Score Card */}
          <View style={[s.card, { borderColor: colors.borderDefault }]}>
            <LinearGradient
              colors={isDark ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.scoreInner}>
              <View style={s.scoreInfo}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Your Civic Score</Text>
                <Text style={[TextStyles.body, { color: colors.textSecondary, marginTop: 4 }]}>
                  Your score reflects your verified civic participation and resolved reports.
                </Text>
              </View>
              <View style={[s.scoreBadge, { backgroundColor: "rgba(32, 138, 239, 0.15)" }]}>
                <LumenIcon name="spark" size="md" color="#208AEF" />
                <Text style={s.scoreText}>{data.civicScore.current}</Text>
              </View>
            </View>
          </View>

          {/* Key Metrics */}
          <View style={s.metricsGrid}>
            <MetricBox title="Reports" value={data.overview.totalReports} colors={colors} />
            <MetricBox title="Resolved" value={data.overview.resolvedReports} colors={colors} />
            <MetricBox title="Res. Rate" value={`${data.overview.resolutionRate}%`} colors={colors} />
            <MetricBox title="Avg Time" value={data.overview.avgResolutionHours ? `${data.overview.avgResolutionHours}h` : '--'} colors={colors} />
          </View>

          {/* Resolution Trend Chart */}
          <View style={[s.card, { borderColor: colors.borderDefault }]}>
            <LinearGradient
              colors={isDark ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.cardInner}>
              <View style={s.sectionHeader}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Resolution Trends</Text>
                <View style={[s.timePillRow, { backgroundColor: colors.bgSubtle, borderRadius: 20 }]}>
                  {(["Daily", "Monthly", "Yearly"] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[s.timePill, range === t && { backgroundColor: colors.brand }]}
                      onPress={() => setRange(t)}
                    >
                      <Text style={[TextStyles.caption, { color: range === t ? "#FFFFFF" : colors.textTertiary, fontWeight: "700" }]}>
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ marginTop: 16, alignItems: "center" }}>
                <BarChart
                  data={trendData}
                  width={CHART_WIDTH}
                  height={180}
                  barWidth={22}
                  spacing={16}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...data.trend.datasets.submitted, 5)}
                  isAnimated
                />
              </View>
            </View>
          </View>

          {/* Status Breakdown */}
          <View style={[s.card, { borderColor: colors.borderDefault }]}>
            <LinearGradient
              colors={isDark ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.cardInner}>
              <Text style={[s.cardTitle, { color: colors.textPrimary, marginBottom: 16 }]}>Complaint Outcomes</Text>
              <View style={s.pieRow}>
                <PieChart
                  data={pieData}
                  donut
                  showText
                  textColor="#FFF"
                  radius={70}
                  innerRadius={45}
                  textSize={12}
                  isAnimated
                />
                <View style={s.pieLegend}>
                  {data.statusBreakdown.map((item, i) => {
                    const palette = ["#10B981", colors.brand, "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
                    return (
                      <View key={item.status} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: palette[i % palette.length] }]} />
                        <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                          {item.status} ({item.count})
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={[s.card, { borderColor: colors.borderDefault }]}>
            <LinearGradient
              colors={isDark ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.cardInner}>
              <Text style={[s.cardTitle, { color: colors.textPrimary, marginBottom: 16 }]}>Top Categories</Text>
              <View style={s.categoryList}>
                {data.categoryBreakdown.map((cat, i) => (
                  <View key={cat.category} style={s.categoryItem}>
                    <View style={s.catHeader}>
                      <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: "600" }]}>{cat.category}</Text>
                      <Text style={[TextStyles.body, { color: colors.textSecondary }]}>{cat.count}</Text>
                    </View>
                    <View style={[s.catTrack, { backgroundColor: colors.bgSubtle }]}>
                      <View style={[s.catFill, { backgroundColor: colors.brand, width: `${(cat.count / data.overview.totalReports) * 100}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* AI Insights */}
          {data.aiInsights.totalAiProcessed > 0 && (
            <View style={[s.card, { borderColor: colors.borderDefault }]}>
              <LinearGradient
                colors={isDark ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.cardInner}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <LumenIcon name="spark" size="sm" color={colors.brand} />
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>AI Analytics</Text>
                </View>
                <View style={s.metricsGrid}>
                  <MetricBox title="AI Processed" value={data.aiInsights.totalAiProcessed} colors={colors} />
                  <MetricBox title="Avg Confidence" value={`${(data.aiInsights.avgConfidence! * 100).toFixed(1)}%`} colors={colors} />
                </View>
                <Text style={[TextStyles.caption, { color: colors.textTertiary, marginTop: 12 }]}>
                  High confidence classification helps route your issues faster without manual verification.
                </Text>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function MetricBox({ title, value, colors }: { title: string; value: string | number; colors: any }) {
  return (
    <View style={[s.metricBox, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }]}>
      <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[s.metricValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgGlowWrap: { ...(StyleSheet.absoluteFill as any), overflow: "hidden", pointerEvents: "none" },
  glowOrb: {
    width: 300,
    height: 300,
    borderRadius: 150,
    position: "absolute",
    opacity: 0.15,
    filter: "blur(50px)" as any,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(150,150,150,0.1)",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 },

  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },

  card: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  cardInner: { padding: 20 },
  cardTitle: { fontSize: 18, fontWeight: "700" },

  scoreInner: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  scoreInfo: { flex: 1 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scoreText: { fontSize: 24, fontWeight: "800", color: "#208AEF" },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricBox: { flex: 1, minWidth: "45%", padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  metricValue: { fontSize: 24, fontWeight: "800" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timePillRow: { flexDirection: "row", padding: 4 },
  timePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },

  pieRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  pieLegend: { flex: 1, gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },

  categoryList: { gap: 16 },
  categoryItem: { gap: 8 },
  catHeader: { flexDirection: "row", justifyContent: "space-between" },
  catTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  catFill: { height: "100%", borderRadius: 4 },
});
