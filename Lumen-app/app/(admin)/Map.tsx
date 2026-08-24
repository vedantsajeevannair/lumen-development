import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
  Platform,
  Image,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { useTheme } from "@/design-system/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/design-system/components/Card";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { env } from "@/config/env";
import { useAuthStore } from "@/store/AuthStore";

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type Status =
  | "NEW"
  | "AI_PROCESSING"
  | "PENDING_VERIFICATION"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "DUPLICATE";

interface MapComplaint {
  id: string;
  trackingId: string;
  category: string;
  priority: Priority;
  status: Status;
  latitude: number;
  longitude: number;
  createdAt: string;
  imageUrl?: string;
}

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const session = useAuthStore((s) => s.session);

  const [selectedStatus, setSelectedStatus] = useState<Status | "ALL">("ALL");
  const [selectedComplaint, setSelectedComplaint] = useState<MapComplaint | null>(null);

  // Fetch all complaints
  const { data: complaints = [], isLoading } = useQuery<MapComplaint[]>({
    queryKey: ["map_complaints"],
    queryFn: async () => {
      const res = await fetch(`${env.apiUrl}/complaints`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      // Filter out complaints without coordinates
      return data.filter((c: MapComplaint) => c.latitude != null && c.longitude != null);
    },
    refetchInterval: 30000,
  });

  const filteredComplaints = useMemo(() => {
    if (selectedStatus === "ALL") return complaints;
    return complaints.filter((c) => c.status === selectedStatus);
  }, [complaints, selectedStatus]);

  const getMarkerColor = (priority: Priority) => {
    switch (priority) {
      case "CRITICAL":
        return colors.errorText;
      case "HIGH":
        return colors.warningText;
      case "MEDIUM":
        return colors.brand;
      case "LOW":
      default:
        return colors.successText;
    }
  };

  // Center on New York by default if no complaints, else center on the first complaint
  const initialRegion = {
    latitude: complaints[0]?.latitude ?? 40.7128,
    longitude: complaints[0]?.longitude ?? -74.006,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading GIS Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        // Minimal fallback for web if react-native-maps isn't fully configured
        <View style={[styles.center, { flex: 1, backgroundColor: colors.bgBase }]}>
          <LumenIcon name="map" size="xl" color={colors.brand} />
          <Text style={{ color: colors.textPrimary, fontSize: 18, marginTop: 16 }}>
            GIS Web Map Engine requires native compilation
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
            Currently tracking {filteredComplaints.length} coordinates in PostGIS.
          </Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          userInterfaceStyle={isDark ? "dark" : "light"}
        >
          {filteredComplaints.map((complaint) => (
            <Marker
              key={complaint.id}
              coordinate={{ latitude: complaint.latitude, longitude: complaint.longitude }}
              pinColor={getMarkerColor(complaint.priority)}
              onPress={() => setSelectedComplaint(complaint)}
            >
              <Callout tooltip>
                <View
                  style={[
                    styles.calloutContainer,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
                  ]}
                >
                  <Text style={[styles.calloutTitle, { color: colors.textPrimary }]}>
                    {complaint.trackingId}
                  </Text>
                  <Text style={[styles.calloutCategory, { color: colors.textSecondary }]}>
                    {complaint.category}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Floating Filter Bar */}
      <View style={styles.filterOverlay}>
        <Card
          style={[
            styles.filterCard,
            { backgroundColor: isDark ? "rgba(10,10,10,0.8)" : "rgba(255,255,255,0.9)" },
          ]}
        >
          {(["ALL", "NEW", "AI_PROCESSING", "ASSIGNED"] as const).map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterChip,
                { backgroundColor: selectedStatus === status ? colors.brand : colors.bgSubtle },
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={{
                  color: selectedStatus === status ? "#FFF" : colors.textPrimary,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {status.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </Card>
      </View>

      {/* Detail Drawer (Simplified) */}
      {selectedComplaint && (
        <View style={styles.drawerOverlay}>
          <Card style={styles.drawerCard}>
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
                {selectedComplaint.trackingId}
              </Text>
              <Pressable onPress={() => setSelectedComplaint(null)}>
                <LumenIcon name="close" size="sm" color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.drawerSubtitle, { color: colors.brand }]}>
              {selectedComplaint.priority} PRIORITY
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              Status: {selectedComplaint.status.replace("_", " ")}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              Reported: {new Date(selectedComplaint.createdAt).toLocaleString()}
            </Text>
            {selectedComplaint.imageUrl && (
              <Image source={{ uri: selectedComplaint.imageUrl }} style={styles.drawerImage} />
            )}
          </Card>
        </View>
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
  map: {
    width: "100%",
    height: "100%",
  },
  calloutContainer: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
  },
  calloutCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  filterOverlay: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "center",
  },
  filterCard: {
    flexDirection: "row",
    padding: 8,
    borderRadius: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  drawerOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  drawerCard: {
    width: "100%",
    maxWidth: 400,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  drawerSubtitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  drawerImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: "#333",
  },
});
