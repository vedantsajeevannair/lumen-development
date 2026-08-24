import React, { useMemo } from "react";
import { apiClient } from "@/services/api.client";
import { severityLabel, severityColor } from "@/utils/Severity";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Image,
  FlatList,
  Pressable,
} from "react-native";
import { useTheme } from "@/design-system/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/design-system/components/Card";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { env } from "@/config/env";
import { useAuthStore } from "@/store/AuthStore";

interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  confidence: number;
  label?: string;
  class_name?: string;
}

interface AiPrediction {
  id: string;
  damageClass: string;
  confidenceScore: number;
  boundingBoxes: any; // Can be parsed to BoundingBox[]
  metadata: any;
  createdAt: string;
}

interface ComplaintWithAi {
  id: string;
  trackingId: string;
  category: string;
  status: string;
  imageUrl?: string;
  createdAt: string;
  severity?: number;
  severityBand?: string | null;
  severityPercent?: number | null;
  slaStatus?: string | null;
  confidence?: number;
  aiPrediction?: AiPrediction;
}

export default function AiCenterScreen() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  const { data: complaints = [], isLoading } = useQuery<ComplaintWithAi[]>({
    queryKey: ["ai_complaints"],
    queryFn: async () => {
      // apiClient carries the bearer token and handles 401 refresh centrally —
      // a bare fetch() here would silently drop the session on token expiry.
      const res = await apiClient.get("/complaints");
      return res.data;
    },
    refetchInterval: 15000,
  });


  const aiComplaints = useMemo(() => {
    if (!Array.isArray(complaints)) return [];
    return complaints.filter((c) => c.aiPrediction != null);
  }, [complaints]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
          Loading AI Pipeline Data...
        </Text>
      </View>
    );
  }

  const renderAiCard = ({ item }: { item: ComplaintWithAi }) => {
    const ai = item.aiPrediction!;
    let boxes: BoundingBox[] = [];
    try {
      if (typeof ai.boundingBoxes === "string") {
        boxes = JSON.parse(ai.boundingBoxes);
      } else if (Array.isArray(ai.boundingBoxes)) {
        boxes = ai.boundingBoxes;
      }
    } catch (e) {
      console.error("Failed to parse bounding boxes", e);
    }

    const confidencePct = Math.round(ai.confidenceScore * 100);
    const confidenceColor =
      confidencePct > 80
        ? colors.successText
        : confidencePct > 50
          ? colors.warningText
          : colors.errorText;

    const width = ai.metadata?.width || 1;
    const height = ai.metadata?.height || 1;

    return (
      <Card
        style={[
          styles.card,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
        ]}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.trackingId, { color: colors.textPrimary }]}>
              {item.trackingId}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {new Date(ai.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${colors.brand}20` }]}>
            <LumenIcon name="alert" size="sm" color={colors.brand} />
            <Text style={[styles.badgeText, { color: colors.brand }]}>YOLO11</Text>
          </View>
        </View>

        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <View style={styles.relative}>
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
              {/* Overlay Bounding Boxes - Assuming coordinates are relative (0-1) for this mockup, 
                  actual implementation depends on FastAPI output scale */}
              {boxes.map((box, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.boundingBox,
                    {
                      left: `${box.xmin * 100}%`,
                      top: `${box.ymin * 100}%`,
                      width: `${(box.xmax - box.xmin) * 100}%`,
                      height: `${(box.ymax - box.ymin) * 100}%`,
                      borderColor: colors.errorText,
                    },
                  ]}
                >
                  <Text style={[styles.boxLabel, { backgroundColor: colors.errorText }]}>
                    {box.label || box.class_name} ({Math.round(box.confidence * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.bgSubtle }]}>
              <Text style={{ color: colors.textSecondary }}>No Image Provided</Text>
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Detection</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{ai.damageClass}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Damage Severity</Text>
            <Text style={[styles.statValue, { color: severityColor(item.severityBand) }]}>
              {item.severity ? `${item.severity.toFixed(1)}/5.0 (${severityLabel(item.severityBand)})` : severityLabel(item.severityBand)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Confidence</Text>
            <Text style={[styles.statValue, { color: confidenceColor }]}>{confidencePct}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.status}</Text>
          </View>
        </View>

        {item.status === "PENDING_VERIFICATION" && (
          <Pressable style={[styles.actionButton, { backgroundColor: colors.brand }]}>
            <Text style={styles.actionText}>Manual Review Required</Text>
          </Pressable>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>AI Command Center</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Live Monitoring of YOLO11 Inference Pipeline
        </Text>
      </View>

      {aiComplaints.length === 0 ? (
        <View style={styles.center}>
          <LumenIcon name="alert" size="xl" color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            No AI predictions found in the system.
          </Text>
        </View>
      ) : (
        <FlatList
          data={aiComplaints}
          keyExtractor={(item) => item.id}
          renderItem={renderAiCard}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    padding: 24,
    gap: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  trackingId: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  relative: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
  },
  boxLabel: {
    position: "absolute",
    top: -20,
    left: -2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 12,
    borderRadius: 8,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  actionButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
