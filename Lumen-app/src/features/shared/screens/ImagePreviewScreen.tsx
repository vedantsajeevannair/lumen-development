// ============================================================
// LUMEN — Premium Image Preview / Inspection Screen
// Phase 5: Production Ready (Shared Media Preview)
// ============================================================
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  Platform,
  Share,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Badge } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";

const { width: W } = Dimensions.get("window");

export default function ImagePreviewScreen() {
  const { colors, shadows } = useTheme();
  const [filter, setFilter] = useState<"normal" | "contrast" | "warm" | "cool">("normal");

  const metadata = {
    resolution: "4032 x 3024 · 12MP",
    fileSize: "2.4 MB",
    takenBy: "Rajesh Kumar (Field Engineer)",
    timestamp: "Today, 11:34 AM",
    location: "123 MG Road, Bangalore (12.9716° N, 77.5946° E)",
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `LUMEN Asset Verification: MG Road Pothole inspection image. Captured by: ${metadata.takenBy} at ${metadata.timestamp}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Top HUD Controls */}
      <View style={[s.hudTop, { paddingTop: Platform.OS === "ios" ? 56 : 24 }]}>
        <Pressable style={s.hudBtn} onPress={() => router.back()} hitSlop={12}>
          <LumenIcon name="back" size="md" color="#FFF" strokeWidth={2.5} />
        </Pressable>

        <Text style={[TextStyles.subtitle, { color: "#FFF", fontWeight: "700" }]}>
          Inspection Photo
        </Text>

        <Pressable style={s.hudBtn} onPress={handleShare} hitSlop={12}>
          <LumenIcon name="share" size="md" color="#FFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Viewport Frame with Filter State */}
      <View style={s.viewport}>
        <View style={s.photoFrame}>
          {/* Simulated Image Placeholder */}
          <View style={[s.simulatedImage, s[`filter_${filter}`]]}>
            <LumenIcon name="image" size="2xl" color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
            <Text
              style={[
                TextStyles.caption,
                { color: "rgba(255,255,255,0.3)", marginTop: Spacing[2] },
              ]}
            >
              Asset Photograph Preview
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Options bar */}
      <View style={s.filterBar}>
        <Text
          style={[TextStyles.caption, { color: "rgba(255,255,255,0.4)", marginBottom: Spacing[2] }]}
        >
          Visual Enhancements for Inspection
        </Text>
        <View style={s.filtersRow}>
          {[
            { id: "normal", label: "Normal" },
            { id: "contrast", label: "High Contrast" },
            { id: "warm", label: "Warm Temp" },
            { id: "cool", label: "Cool Temp" },
          ].map((f) => (
            <Pressable
              key={f.id}
              style={[s.filterChip, filter === f.id && s.filterChipActive]}
              onPress={() => setFilter(f.id as any)}
            >
              <Text style={[s.filterLabel, filter === f.id && s.filterLabelActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bottom Metadata Panel */}
      <View style={s.bottomPanel}>
        <Card variant="glass" style={s.metaCard}>
          <View style={s.titleRow}>
            <LumenIcon name="info" size="sm" color={colors.brand} strokeWidth={2} />
            <Text style={[TextStyles.label, { color: "#FFF", flex: 1 }]}>Photo Metadata</Text>
            <Badge label="Verified Capture" variant="success" size="sm" />
          </View>

          <View style={s.grid}>
            <View style={s.gridRow}>
              <View style={s.gridCol}>
                <Text style={s.metaTitle}>Resolution</Text>
                <Text style={s.metaValue}>{metadata.resolution}</Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.metaTitle}>File Size</Text>
                <Text style={s.metaValue}>{metadata.fileSize}</Text>
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCol}>
                <Text style={s.metaTitle}>Photographer</Text>
                <Text style={s.metaValue}>{metadata.takenBy}</Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.metaTitle}>Timestamp</Text>
                <Text style={s.metaValue}>{metadata.timestamp}</Text>
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridColFull}>
                <Text style={s.metaTitle}>Location Coordinates</Text>
                <Text style={s.metaValue}>{metadata.location}</Text>
              </View>
            </View>
          </View>
        </Card>

        <Button
          label="Approve Photo Proof"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.back()}
          iconLeft="success"
          style={{ marginTop: Spacing[4] }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  hudTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[6],
    height: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  hudBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F111A",
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
    borderRadius: Radius["2xl"],
    overflow: "hidden",
  },
  photoFrame: {
    width: "100%",
    height: "100%",
  },
  simulatedImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C1F2E",
  },
  filter_normal: {},
  filter_contrast: {
    backgroundColor: "#05070A",
  },
  filter_warm: {
    backgroundColor: "#2E241A",
  },
  filter_cool: {
    backgroundColor: "#1A252E",
  },
  filterBar: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  filtersRow: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  filterChip: {
    flex: 1,
    paddingVertical: Spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  filterChipActive: {
    backgroundColor: "#208AEF",
  },
  filterLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
  },
  filterLabelActive: {
    color: "#FFF",
  },
  bottomPanel: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    paddingTop: Spacing[4],
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  metaCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    gap: Spacing[3],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  grid: {
    gap: Spacing[3],
  },
  gridRow: {
    flexDirection: "row",
    gap: Spacing[4],
  },
  gridCol: {
    flex: 1,
    gap: 2,
  },
  gridColFull: {
    width: "100%",
    gap: 2,
  },
  metaTitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  metaValue: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
  },
});
