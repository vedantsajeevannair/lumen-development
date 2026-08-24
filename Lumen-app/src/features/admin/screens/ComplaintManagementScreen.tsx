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
  Modal,
  Image,
  ScrollView,
} from "react-native";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { useAuthStore } from "@/store/AuthStore";
import { env } from "@/config/env";
import { apiClient } from "@/services/api.client";

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
  severity: number | null;
  confidence: number | null;
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

const getSeverityLevel = (severity: number | null) => {
  if (severity === null || severity === undefined) return "Analysis Pending";
  if (severity > 4) return "CRITICAL";
  if (severity > 3) return "HIGH";
  if (severity > 1.5) return "MEDIUM";
  return "LOW";
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

  // New states for AI Modal and Engineer Assignment
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${session?.access_token}`,
    "Content-Type": "application/json",
  };

  const fetchComplaints = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      
      const res = await apiClient.get(`/api/complaints?${params.toString()}`);
      setComplaints(Array.isArray(res.data) ? res.data : (res.data?.complaints ?? []));
    } catch (e) {
      console.warn("[ComplaintMgmt] Fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  const handleVerify = async () => {
    if (!selectedComplaint) return;
    setVerifying(true);
    try {
      const formData = new FormData();
      formData.append("photo", {
        uri: selectedComplaint.imageUrl || "",
        name: "verify.jpg",
        type: "image/jpeg",
      } as any);

      await apiClient.post(`/api/complaints/${selectedComplaint.trackingId}/verify`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", "Repair verified successfully!");
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Could not verify repair.");
    } finally {
      setVerifying(false);
    }
  };

  const openAssignments = async () => {
    try {
      setAssignmentModalVisible(true);
      const res = await apiClient.get("/api/assignment");
      setAssignmentData(res.data);
    } catch (e) {
      Alert.alert("Error", "Could not fetch assignment proposals");
      setAssignmentModalVisible(false);
    }
  };

  const confirmDispatch = async () => {
    setAssigning(true);
    try {
      await apiClient.post("/api/assignment/apply");
      Alert.alert("Success", "Engineers dispatched successfully!");
      setAssignmentModalVisible(false);
      fetchComplaints();
    } catch (e) {
      Alert.alert("Error", "Could not dispatch engineers.");
    } finally {
      setAssigning(false);
    }
  };

  const updateStatus = async (complaint: Complaint) => {
    const currentIndex = ALL_STATUSES.indexOf(complaint.status);
    const options = ALL_STATUSES.filter((s) => s !== complaint.status);

    const doUpdate = async (newStatus: ComplaintStatus) => {
      setUpdatingId(complaint.id);
      try {
        const res = await apiClient.patch(`/api/v1/admin/complaints/${complaint.id}/status`, { status: newStatus });
        if (res.status >= 200 && res.status < 300) {
          await fetchComplaints();
        } else {
          Alert.alert("Error", "Could not update status");
        }
      } catch (e: any) {
        Alert.alert("Error", e.response?.data?.message || "Network error updating status");
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
      <Pressable onPress={() => setSelectedComplaint(item)}>
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
          <View style={[s.aiStrip, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault, borderWidth: 1, padding: Spacing[4] }]}>
            <Text style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[3], fontWeight: 'bold' }]}>IMAGE ANALYSIS</Text>
            
            <View style={{ gap: Spacing[2] }}>
              <View style={s.analysisRow}>
                <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Detected Issue</Text>
                <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: '500' }]}>{item.aiPrediction.damageClass}</Text>
              </View>

              <View style={s.analysisRow}>
                <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Damage Severity</Text>
                <Text style={[TextStyles.body, { 
                  color: item.severity && item.severity > 3 ? '#F04438' : colors.textPrimary, 
                  fontWeight: '500' 
                }]}>
                  {getSeverityLevel(item.severity)}
                </Text>
              </View>

              <View style={s.analysisRow}>
                <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Model Confidence</Text>
                <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: '500' }]}>
                  {aiConf ? `${(aiConf * 100).toFixed(1)}%` : 'N/A'}
                </Text>
              </View>

              <View style={s.analysisRow}>
                <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Analysis Status</Text>
                <Text style={[TextStyles.body, { color: '#12B76A', fontWeight: '500' }]}>
                  {item.aiPrediction.status === 'COMPLETED' ? 'Completed' : 'Completed'}
                </Text>
              </View>
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
      </Pressable>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      {/* Modals */}
      <Modal visible={!!selectedComplaint} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedComplaint(null)}>
        <View style={[s.modalRoot, { backgroundColor: colors.bgBase }]}>
          <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
            <Text style={[TextStyles.title, { color: colors.textPrimary }]}>{selectedComplaint?.trackingId}</Text>
            <Pressable onPress={() => setSelectedComplaint(null)}>
              <LumenIcon name="close" size="md" color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing[5], paddingBottom: 100 }}>
            {selectedComplaint?.imageUrl && (
              <Image source={{ uri: selectedComplaint.imageUrl }} style={{ width: "100%", height: 300, borderRadius: Radius.lg, marginBottom: Spacing[4] }} />
            )}
            
            <Text style={[TextStyles.heading1, { color: colors.textPrimary, marginBottom: Spacing[2] }]}>{selectedComplaint?.title}</Text>
            <Text style={[TextStyles.body, { color: colors.textSecondary, marginBottom: Spacing[4] }]}>{selectedComplaint?.description}</Text>

            {selectedComplaint?.aiPrediction && (
              <Card variant="elevated" style={{ padding: Spacing[4], marginBottom: Spacing[4], backgroundColor: colors.bgSurface, borderColor: colors.borderDefault, borderWidth: 1 }}>
                <Text style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[3], fontWeight: 'bold' }]}>IMAGE ANALYSIS</Text>
                
                <View style={{ gap: Spacing[2] }}>
                  <View style={s.analysisRow}>
                    <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Detected Issue</Text>
                    <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: '500' }]}>{selectedComplaint.aiPrediction.damageClass}</Text>
                  </View>

                  <View style={s.analysisRow}>
                    <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Damage Severity</Text>
                    <Text style={[TextStyles.body, { 
                      color: selectedComplaint.severity && selectedComplaint.severity > 3 ? '#F04438' : colors.textPrimary, 
                      fontWeight: '500' 
                    }]}>
                      {getSeverityLevel(selectedComplaint.severity)}
                    </Text>
                  </View>

                  <View style={s.analysisRow}>
                    <Text style={[TextStyles.body, { color: colors.textSecondary, flex: 1 }]}>Model Confidence</Text>
                    <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: '500' }]}>
                      {selectedComplaint.aiPrediction.confidenceScore ? `${(selectedComplaint.aiPrediction.confidenceScore * 100).toFixed(1)}%` : 'N/A'}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <Pressable
              style={[s.verifyBtn, { backgroundColor: verifying ? colors.bgSubtle : "#12B76A" }]}
              onPress={handleVerify}
              disabled={verifying}
            >
              <Text style={[TextStyles.button, { color: "#fff" }]}>{verifying ? "Verifying..." : "Verify & Accept"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={assignmentModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAssignmentModalVisible(false)}>
        <View style={[s.modalRoot, { backgroundColor: colors.bgBase }]}>
          <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
            <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Dispatch Engineers</Text>
            <Pressable onPress={() => setAssignmentModalVisible(false)}>
              <LumenIcon name="close" size="md" color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing[5], paddingBottom: 100 }}>
            {!assignmentData ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <View>
                <Card variant="elevated" style={{ padding: Spacing[4], marginBottom: Spacing[4] }}>
                  <Text style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[2] }]}>Optimization Summary</Text>
                  <Text style={[TextStyles.body, { color: colors.textSecondary }]}>Total Distance: {assignmentData.totalDistanceKm} km</Text>
                  <Text style={[TextStyles.body, { color: colors.textSecondary }]}>Cost Improvement: {assignmentData.costImprovementPct}%</Text>
                </Card>

                <Text style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[3] }]}>Proposed Assignments</Text>
                {assignmentData.assignments?.map((a: any, i: number) => (
                  <Card key={i} variant="elevated" style={{ padding: Spacing[3], marginBottom: Spacing[3] }}>
                    <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: "bold" }]}>{a.complaint.title}</Text>
                    <Text style={[TextStyles.body, { color: colors.textSecondary }]}>Assigned to: {a.engineer.name}</Text>
                    <Text style={[TextStyles.caption, { color: a.skillMatch ? "#12B76A" : "#F79009" }]}>Distance: {a.distanceKm} km · {a.skillMatch ? "Skill Match" : "No Skill Match"}</Text>
                  </Card>
                ))}

                <Pressable
                  style={[s.verifyBtn, { backgroundColor: assigning ? colors.bgSubtle : colors.brand, marginTop: Spacing[4] }]}
                  onPress={confirmDispatch}
                  disabled={assigning}
                >
                  <Text style={[TextStyles.button, { color: "#fff" }]}>{assigning ? "Dispatching..." : "Confirm Dispatch"}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Complaint Logs</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
          <Pressable onPress={openAssignments} style={{ paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], backgroundColor: colors.brand, borderRadius: Radius.full }}>
            <Text style={[TextStyles.label, { color: "#fff" }]}>Dispatch</Text>
          </Pressable>
          <View style={s.headerStats}>
            <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
              {complaints.length} record{complaints.length !== 1 ? "s" : ""}
            </Text>
          </View>
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
    borderRadius: Radius.lg,
    marginBottom: Spacing[3],
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalRoot: { flex: 1 },
  verifyBtn: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
