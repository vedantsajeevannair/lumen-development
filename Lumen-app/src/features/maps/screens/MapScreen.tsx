// ============================================================
// LUMEN — Premium Live Map Screen
// Phase 5: Production Ready (Shared Map Experience)
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Badge } from "@/design-system/components/Badge";
import { Chip } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { SearchBar } from "@/design-system/components/Extras";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";

const { width: W, height: H } = Dimensions.get("window");

interface MapPin {
  id: string;
  title: string;
  category: "road" | "streetlight" | "water" | "garbage" | "electricity";
  priority: "high" | "medium" | "low";
  top: string;
  left: string;
  address: string;
  engineer?: string;
  status: "pending" | "in_progress" | "resolved";
}

const PIN_DATA: MapPin[] = [
  {
    id: "P1",
    title: "MG Road Pothole Repair",
    category: "road",
    priority: "high",
    top: "30%",
    left: "25%",
    address: "123 MG Road, Bangalore",
    engineer: "Rajesh K.",
    status: "in_progress",
  },
  {
    id: "P2",
    title: "Street Light Panel Outage",
    category: "streetlight",
    priority: "medium",
    top: "48%",
    left: "55%",
    address: "Park Ave, 2nd Block",
    status: "pending",
  },
  {
    id: "P3",
    title: "Water Pipeline Replacement",
    category: "water",
    priority: "high",
    top: "62%",
    left: "38%",
    address: "5th Cross, Gandhi Nagar",
    engineer: "Suresh M.",
    status: "in_progress",
  },
  {
    id: "P4",
    title: "Garbage Pile Overflow",
    category: "garbage",
    priority: "low",
    top: "25%",
    left: "70%",
    address: "City Center Market",
    status: "pending",
  },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: "#F04438",
  medium: "#F79009",
  low: "#12B76A",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function MapScreen() {
  const { colors, shadows, isDark } = useTheme();
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const cardTranslateY = useRef(new Animated.Value(260)).current;

  const selectPin = (pin: MapPin | null) => {
    setSelectedPin(pin);
    Animated.spring(cardTranslateY, {
      toValue: pin ? 0 : 260,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  };

  const filteredPins = PIN_DATA.filter((p) => {
    const matchFilter = filter === "all" || p.category === filter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Dynamic Simulated Map Canvas */}
      <Pressable style={s.mapCanvas} onPress={() => selectPin(null)}>
        {/* Fake Grid Map Background */}
        <View style={[s.mapGrid, { borderColor: colors.borderDefault + "30" }]} />
        <View
          style={[s.mapGridLineVer, { left: "20%", borderColor: colors.borderDefault + "20" }]}
        />
        <View
          style={[s.mapGridLineVer, { left: "50%", borderColor: colors.borderDefault + "20" }]}
        />
        <View
          style={[s.mapGridLineVer, { left: "80%", borderColor: colors.borderDefault + "20" }]}
        />
        <View
          style={[s.mapGridLineHor, { top: "30%", borderColor: colors.borderDefault + "20" }]}
        />
        <View
          style={[s.mapGridLineHor, { top: "60%", borderColor: colors.borderDefault + "20" }]}
        />

        {/* Fake GPS Route path if pin selected */}
        {selectedPin && <View style={[s.routeLine, { backgroundColor: colors.brand }]} />}

        {/* Active pins */}
        {filteredPins.map((pin) => {
          const isSelected = selectedPin?.id === pin.id;
          const bgCol = PRIORITY_COLOR[pin.priority];
          return (
            <Pressable
              key={pin.id}
              style={[
                s.marker,
                { top: pin.top as any, left: pin.left as any },
                isSelected && s.markerSelected,
              ]}
              onPress={() => selectPin(pin)}
            >
              <View style={[s.markerDot, { backgroundColor: bgCol }]}>
                <LumenIcon name={pin.category} size="xs" color="#FFF" strokeWidth={3} />
              </View>
              {isSelected && <View style={[s.markerPulse, { borderColor: bgCol }]} />}
            </Pressable>
          );
        })}
      </Pressable>

      {/* Floating HUD Controls */}
      <View style={[s.floatingHUD, { paddingTop: Platform.OS === "ios" ? 56 : 36 }]}>
        <View style={s.searchRow}>
          <Pressable
            style={[
              s.backBtn,
              { backgroundColor: colors.bgGlass, borderColor: colors.borderGlass, ...shadows.md },
            ]}
            onPress={() => router.back()}
          >
            <LumenIcon name="back" size="md" color={colors.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <View style={s.searchBarContainer}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search map coordinates…"
            />
          </View>
        </View>

        {/* Filter Scroll Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersRow}
          style={s.filtersScroll}
        >
          {["all", "road", "streetlight", "water", "garbage", "electricity"].map((cat) => (
            <Chip
              key={cat}
              label={cat === "all" ? "All Issues" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              selected={filter === cat}
              onPress={() => setFilter(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Floating Side Tools */}
      <View style={s.sideTools}>
        <Pressable
          style={[
            s.toolBtn,
            { backgroundColor: colors.bgGlass, borderColor: colors.borderGlass, ...shadows.md },
          ]}
        >
          <LumenIcon name="locate" size="md" color={colors.brand} strokeWidth={2} />
        </Pressable>
        <Pressable
          style={[
            s.toolBtn,
            { backgroundColor: colors.bgGlass, borderColor: colors.borderGlass, ...shadows.md },
          ]}
        >
          <LumenIcon name="compass" size="md" color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Bottom Detail Drawer Sheet */}
      <Animated.View
        style={[
          s.drawer,
          {
            backgroundColor: colors.bgGlass,
            borderColor: colors.borderGlass,
            transform: [{ translateY: cardTranslateY }],
            ...shadows.xl,
          },
        ]}
      >
        <View style={[s.drawerHandle, { backgroundColor: colors.borderDefault }]} />

        {selectedPin && (
          <View style={s.drawerContent}>
            <View style={s.drawerHeader}>
              <View
                style={[
                  s.drawerIconBg,
                  { backgroundColor: PRIORITY_COLOR[selectedPin.priority] + "15" },
                ]}
              >
                <LumenIcon
                  name={selectedPin.category}
                  size="lg"
                  color={PRIORITY_COLOR[selectedPin.priority]}
                  strokeWidth={2}
                />
              </View>
              <View style={s.drawerTitleCol}>
                <Text
                  style={[TextStyles.bodyMedium, { color: colors.textPrimary, fontWeight: "700" }]}
                  numberOfLines={1}
                >
                  {selectedPin.title}
                </Text>
                <Text
                  style={[TextStyles.caption, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {selectedPin.address}
                </Text>
              </View>
              <Badge
                label={STATUS_LABELS[selectedPin.status]}
                variant={selectedPin.status === "in_progress" ? "info" : "warning"}
                size="sm"
              />
            </View>

            <View style={[s.divider, { backgroundColor: colors.borderDefault }]} />

            {/* Meta Row */}
            <View style={s.metaRow}>
              <View style={s.metaCol}>
                <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>Priority</Text>
                <Text
                  style={[
                    TextStyles.bodySmall,
                    { color: PRIORITY_COLOR[selectedPin.priority], fontWeight: "600" },
                  ]}
                >
                  {selectedPin.priority.toUpperCase()}
                </Text>
              </View>
              <View style={s.metaCol}>
                <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                  Assigned Team
                </Text>
                <Text
                  style={[TextStyles.bodySmall, { color: colors.textPrimary, fontWeight: "600" }]}
                >
                  {selectedPin.engineer ?? "Unassigned"}
                </Text>
              </View>
              <View style={s.metaCol}>
                <Text style={[TextStyles.caption, { color: colors.textTertiary }]}>
                  Resolution ETA
                </Text>
                <Text style={[TextStyles.bodySmall, { color: colors.brand, fontWeight: "600" }]}>
                  ~24 Hours
                </Text>
              </View>
            </View>

            {/* Action Bar */}
            <View style={s.drawerActions}>
              <Button
                label="Close Preview"
                variant="secondary"
                size="md"
                onPress={() => selectPin(null)}
                style={s.drawerBtn}
              />
              <Button
                label="Navigate Route"
                variant="primary"
                size="md"
                onPress={() => router.push("/(engineer)/Navigation" as any)}
                style={s.drawerBtn}
                iconRight="navigate"
              />
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapCanvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#1D2330",
    overflow: "hidden",
  },
  mapGrid: {
    ...StyleSheet.absoluteFill,
    borderWidth: 0.5,
  },
  mapGridLineVer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 0.5,
    borderStyle: "dashed",
    borderWidth: 0.5,
  },
  mapGridLineHor: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0.5,
    borderStyle: "dashed",
    borderWidth: 0.5,
  },
  routeLine: {
    position: "absolute",
    top: "35%",
    left: "26%",
    width: 120,
    height: 3,
    transform: [{ rotate: "35deg" }],
    opacity: 0.8,
  },
  marker: {
    position: "absolute",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -16,
    marginTop: -16,
  },
  markerSelected: {
    zIndex: 10,
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    opacity: 0.4,
  },
  floatingHUD: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[5],
    zIndex: 20,
  },
  searchRow: {
    flexDirection: "row",
    gap: Spacing[3],
    alignItems: "center",
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarContainer: {
    flex: 1,
  },
  filtersScroll: {
    marginTop: Spacing[3],
  },
  filtersRow: {
    gap: Spacing[2],
    paddingRight: 24,
  },
  sideTools: {
    position: "absolute",
    top: 220,
    right: Spacing[5],
    gap: Spacing[3],
    zIndex: 20,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  drawer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 36 : 16,
    left: Spacing[5],
    right: Spacing[5],
    borderRadius: Radius["3xl"],
    borderWidth: 1,
    padding: Spacing[5],
    zIndex: 30,
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing[4],
    opacity: 0.5,
  },
  drawerContent: {
    gap: Spacing[4],
  },
  drawerHeader: {
    flexDirection: "row",
    gap: Spacing[3],
    alignItems: "center",
  },
  drawerIconBg: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitleCol: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    opacity: 0.2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCol: {
    gap: 4,
  },
  drawerActions: {
    flexDirection: "row",
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
  drawerBtn: {
    flex: 1,
  },
});
