// ============================================================
// LUMEN — Complaint Management Screen
// Real backend integration — all 6 statuses, AI confidence, SLA
// NO MOCK DATA / NO DEMO TOGGLES
// ============================================================
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput,
} from "react-native";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { useAuthStore } from "@/store/AuthStore";
import { env } from "@/config/env";

// ── Types ──────────────────────────────────────────────────
type ComplaintStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface Complaint {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  status: ComplaintStatus;
  priority: Priority;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: { fullName: string | null } | null;
  aiPrediction: {
    damageClass: string;
    confidenceScore: number;
    status: string;
  } | null;
  timeline: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }[];
}

// ── Helpers ────────────────────────────────────────────────
const ALL_STATUSES: ComplaintStatus[] = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  PENDING: "#F79009",
  ASSIGNED: "#208AEF",
  IN_PROGRESS: "#7C3AED",
  RESOLVED: "#12B76A",
  CLOSED: "#6B7280",
  REJECTED: "#F04438",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  CRITICAL: "#F04438",
  HIGH: "#F79009",
  MEDIUM: "#208AEF",
  LOW: "#12B76A",
};

const SLA_HOURS: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 12,
  MEDIUM: 48,
  LOW: 72,
};

const getSlaStatus = (createdAt: string, priority: Priority, currentStatus: ComplaintStatus) => {
  if (currentStatus === "RESOLVED" || currentStatus === "CLOSED") return "ok";
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const sla = SLA_HOURS[priority];
  if (ageHours >= sla) return "breached";
  if (ageHours >= sla * 0.75) return "warning";
  return "ok";
};

const formatAge = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Component ──────────────────────────────────────────────
export default function ComplaintManagementScreen() {
  const { colors, isDark } = useTheme();
  const session = useAuthStore((s) => s.session);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const authHeader = {
    Authorization: `Bearer ${session?.access_token}`,
    "Content-Type": "application/json",
  };

  const fetchComplaints = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const url = `${env.apiUrl}/complaints?${params.toString()}`;
      const res = await fetch(url, { headers: authHeader });
      if (res.ok) {
        const data = await res.json();
        // /complaints returns an array directly
        setComplaints(Array.isArray(data) ? data : (data.complaints ?? []));
      } else {
        console.warn("[ComplaintMgmt] Non-OK response:", res.status);
      }
    } catch (e) {
      console.warn("[ComplaintMgmt] Fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, filterStatus, searchQuery]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  const updateStatus = async (complaint: Complaint) => {
    const currentIndex = ALL_STATUSES.indexOf(complaint.status);
    const options = ALL_STATUSES.filter((s) => s !== complaint.status);

    const doUpdate = async (newStatus: ComplaintStatus) => {
      setUpdatingId(complaint.id);
      try {
        const res = await fetch(`${env.apiUrl}/complaints/${complaint.id}`, {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          await fetchComplaints();
        } else {
          const err = await res.json().catch(() => ({}));
          Alert.alert("Error", err.message || "Could not update status");
        }
      } catch (e) {
        Alert.alert("Error", "Network error updating status");
      } finally {
        setUpdatingId(null);
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Change status for ${complaint.trackingId}`,
          options: [...options, "Cancel"],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: options.indexOf("REJECTED"),
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            doUpdate(options[buttonIndex]);
          }
        }
      );
    } else {
      // Android / Web: use Alert with buttons
      Alert.alert(
        `Update Status — ${complaint.trackingId}`,
        `Current: ${complaint.status}\nSelect new status:`,
        [
          ...options.map((s) => ({
            text: s.replace("_", " "),
            onPress: () => doUpdate(s),
          })),
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    }
  };

  // ── Status Filter Pills ───────────────────────────────────
  const renderFilterPills = () => (
    <View style={s.filterRow}>
      <Pressable
        style={[
          s.filterPill,
          filterStatus === "ALL" && { backgroundColor: colors.brand, borderColor: colors.brand },
          { borderColor: colors.borderDefault },
        ]}
        onPress={() => setFilterStatus("ALL")}
      >
        <Text
          style={[
            TextStyles.label,
            { color: filterStatus === "ALL" ? "#fff" : colors.textSecondary },
          ]}
        >
          All
        </Text>
      </Pressable>
      {ALL_STATUSES.map((s) => (
        <Pressable
          key={s}
          style={[
            styles_fp.pill,
            filterStatus === s && {
              backgroundColor: STATUS_COLORS[s] + "20",
              borderColor: STATUS_COLORS[s],
            },
            { borderColor: colors.borderDefault },
          ]}
          onPress={() => setFilterStatus(s)}
        >
          <Text
            style={[
              TextStyles.label,
              { color: filterStatus === s ? STATUS_COLORS[s] : colors.textSecondary },
            ]}
          >
            {s.replace("_", " ")}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // ── List Item ─────────────────────────────────────────────
  const renderItem = ({ item }: { item: Complaint }) => {
    const slaStatus = getSlaStatus(item.createdAt, item.priority, item.status);
    const slaColor =
      slaStatus === "breached" ? "#F04438" : slaStatus === "warning" ? "#F79009" : "#12B76A";
    const isUpdating = updatingId === item.id;
    const aiConf = item.aiPrediction?.confidenceScore;

    return (
      <Card
        variant="elevated"
        style={[s.card, { borderLeftWidth: 3, borderLeftColor: STATUS_COLORS[item.status] }]}
      >
        {/* Header: title + status badge */}
        <View style={s.cardHeader}>
          <View style={s.titleRow}>
            <Text
              style={[TextStyles.subtitle, { color: colors.textPrimary, flex: 1 }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Badge
              label={item.status.replace("_", " ")}
              variant={
                item.status === "RESOLVED"
                  ? "success"
                  : item.status === "REJECTED"
                    ? "error"
                    : "brand"
              }
              size="sm"
            />
          </View>
          <View style={s.metaRow}>
            <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
              {item.trackingId}
            </Text>
            <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
            <Text style={[TextStyles.caption, { color: PRIORITY_COLORS[item.priority] }]}>
              {item.priority}
            </Text>
            <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
              · {item.category}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text
          style={[TextStyles.body, { color: colors.textSecondary, marginBottom: Spacing[3] }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        {/* AI Prediction strip */}
        {item.aiPrediction && (
          <View style={[s.aiStrip, { backgroundColor: colors.brand + "10" }]}>
            <LumenIcon name="ai" size="xs" color={colors.brand} />
            <Text style={[TextStyles.caption, { color: colors.brand }]}>
              YOLO11 · {item.aiPrediction.damageClass} · {(aiConf! * 100).toFixed(1)}% confidence
            </Text>
            <View style={[s.confBar, { backgroundColor: colors.bgSubtle }]}>
              <View
                style={[
                  s.confBarFill,
                  { width: `${(aiConf! * 100).toFixed(0)}%` as any, backgroundColor: colors.brand },
                ]}
              />
            </View>
          </View>
        )}

        {/* Footer: reporter, age, SLA, action */}
        <View style={s.cardFooter}>
          <View style={s.footerLeft}>
            <LumenIcon name="profile" size="xs" color={colors.textTertiary} />
            <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
              {item.reporter?.fullName || "Citizen"} · {formatAge(item.createdAt)}
            </Text>
          </View>
          <View style={s.footerRight}>
            <View style={[s.slaBadge, { backgroundColor: slaColor + "15" }]}>
              <View style={[s.slaDot, { backgroundColor: slaColor }]} />
              <Text style={[TextStyles.caption, { color: slaColor }]}>
                SLA{" "}
                {slaStatus === "breached"
                  ? "⚠ Breached"
                  : slaStatus === "warning"
                    ? "At Risk"
                    : "OK"}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                s.actionBtn,
                {
                  backgroundColor: isUpdating ? colors.bgSubtle : colors.brand + "20",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => updateStatus(item)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Text style={[TextStyles.label, { color: colors.brand }]}>Change Status</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Complaint Logs</Text>
        <View style={s.headerStats}>
          <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
            {complaints.length} record{complaints.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View
        style={[
          s.searchRow,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
        ]}
      >
        <LumenIcon name="search" size="sm" color={colors.textTertiary} />
        <TextInput
          style={[TextStyles.body, { flex: 1, color: colors.textPrimary, paddingVertical: 0 }]}
          placeholder="Search by title or tracking ID…"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={fetchComplaints}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <LumenIcon name="close" size="xs" color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Filter pills */}
      <View style={s.filterWrap}>{renderFilterPills()}</View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text
            style={[TextStyles.caption, { color: colors.textSecondary, marginTop: Spacing[3] }]}
          >
            Loading complaints…
          </Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <LumenIcon name="report" size="xl" color={colors.textTertiary} />
              <Text
                style={[
                  TextStyles.subtitle,
                  { color: colors.textSecondary, marginTop: Spacing[3] },
                ]}
              >
                No complaints found
              </Text>
              <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                Try adjusting your filter or search query
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// Extra style for filter pills (avoids naming conflict with main stylesheet)
const styles_fp = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerStats: {},
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  filterWrap: { paddingHorizontal: Spacing[5] },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
    paddingVertical: Spacing[3],
  },
  filterPill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing[5], gap: Spacing[4] },
  card: { padding: Spacing[4], overflow: "hidden" },
  cardHeader: { marginBottom: Spacing[3] },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing[3],
    marginBottom: Spacing[1.5],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    flexWrap: "wrap",
  },
  priorityDot: { width: 7, height: 7, borderRadius: 3.5 },
  aiStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    marginBottom: Spacing[3],
  },
  confBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  confBarFill: { height: "100%", borderRadius: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#333",
    paddingTop: Spacing[3],
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  footerRight: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  slaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1.5],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.md,
  },
  slaDot: { width: 6, height: 6, borderRadius: 3 },
  actionBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    minWidth: 100,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing[10],
    gap: Spacing[2],
  },
});
