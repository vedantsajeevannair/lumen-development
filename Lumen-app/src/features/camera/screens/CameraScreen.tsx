// ============================================================
// LUMEN — Premium Camera Screen
// Phase 5: Production Ready (Shared Media Experience)
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
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";

const { width: W, height: H } = Dimensions.get("window");

export default function CameraScreen() {
  const { colors, shadows } = useTheme();
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [facing, setFacing] = useState<"back" | "front">("back");

  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const capturePhoto = () => {
    // Trigger shutter sound/animation
    Animated.sequence([
      Animated.timing(shutterScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(shutterScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => {
      // Navigate back with simulated image capture parameters
      router.back();
    });
  };

  const getFlashIcon = () => {
    if (flash === "on") return "sun"; // represent flash on
    if (flash === "auto") return "spark"; // represent flash auto
    return "moon"; // represent flash off
  };

  const toggleFlash = () => {
    setFlash((f) => (f === "off" ? "on" : f === "on" ? "auto" : "off"));
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera Viewfinder Container */}
      <View style={s.viewfinderContainer}>
        {/* Fake live rendering guide lines */}
        {grid && (
          <View style={s.gridContainer} pointerEvents="none">
            <View style={[s.gridLineVer, { left: "33%" }]} />
            <View style={[s.gridLineVer, { left: "66%" }]} />
            <View style={[s.gridLineHor, { top: "33%" }]} />
            <View style={[s.gridLineHor, { top: "66%" }]} />
          </View>
        )}

        {/* Focus indicator element */}
        <View style={s.focusSquare} />

        {/* Viewfinder background simulator */}
        <View style={s.viewfinderBackground}>
          <Text style={[TextStyles.mono, { color: "rgba(255,255,255,0.4)" }]}>
            [ Viewfinder Preview Mode ]
          </Text>
          <Text style={[TextStyles.caption, { color: "rgba(255,255,255,0.3)", marginTop: 6 }]}>
            Lens: {facing === "back" ? "12MP Wide (f/1.8)" : "8MP TrueDepth"}
          </Text>
        </View>

        {/* Flash flash effect overlay */}
        <Animated.View style={[s.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />
      </View>

      {/* Top HUD Controls */}
      <View style={[s.hudTop, { paddingTop: Platform.OS === "ios" ? 56 : 24 }]}>
        <Pressable style={s.hudBtn} onPress={() => router.back()} hitSlop={12}>
          <LumenIcon name="back" size="md" color="#FFF" strokeWidth={2.5} />
        </Pressable>

        <View style={s.hudRight}>
          <Pressable style={s.hudBtn} onPress={toggleFlash} hitSlop={12}>
            <LumenIcon name={getFlashIcon()} size="md" color="#FFF" strokeWidth={2} />
          </Pressable>
          <Pressable style={s.hudBtn} onPress={() => setGrid((g) => !g)} hitSlop={12}>
            <LumenIcon
              name="sliders"
              size="md"
              color={grid ? colors.brand : "#FFF"}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>

      {/* Zoom HUD slider */}
      <View style={s.zoomHUD}>
        {[1, 2, 5].map((z) => (
          <Pressable
            key={z}
            style={[s.zoomBtn, zoom === z && s.zoomBtnActive]}
            onPress={() => setZoom(z)}
          >
            <Text style={[s.zoomText, zoom === z && s.zoomTextActive]}>{z}x</Text>
          </Pressable>
        ))}
      </View>

      {/* Bottom Panel Controls */}
      <View style={s.bottomPanel}>
        <View style={s.controlsRow}>
          {/* Gallery preview stub */}
          <Pressable style={s.galleryBtn}>
            <View style={s.galleryInner}>
              <LumenIcon name="image" size="sm" color="#FFF" strokeWidth={2} />
            </View>
          </Pressable>

          {/* Capture Trigger */}
          <Pressable
            onPress={capturePhoto}
            accessibilityRole="button"
            accessibilityLabel="Shutter Button"
          >
            <Animated.View style={[s.shutterOuter, { transform: [{ scale: shutterScale }] }]}>
              <View style={s.shutterInner} />
            </Animated.View>
          </Pressable>

          {/* Camera flip */}
          <Pressable
            style={s.galleryBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          >
            <View style={s.flipBtnInner}>
              <LumenIcon name="refresh" size="md" color="#FFF" strokeWidth={2} />
            </View>
          </Pressable>
        </View>

        <Text
          style={[
            TextStyles.caption,
            { color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 20 },
          ]}
        >
          Auto Focus · HDR Active · Tap shutter to save proof
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  viewfinderContainer: {
    position: "absolute",
    top: 100,
    bottom: 200,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: "#111",
    borderRadius: Radius["3xl"],
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  gridLineVer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  gridLineHor: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  focusSquare: {
    position: "absolute",
    top: "45%",
    left: "45%",
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: Radius.xs,
    zIndex: 2,
    opacity: 0.6,
  },
  viewfinderBackground: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFF",
    zIndex: 3,
  },
  hudTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[6],
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  hudRight: {
    flexDirection: "row",
    gap: Spacing[4],
  },
  hudBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomHUD: {
    position: "absolute",
    bottom: 220,
    alignSelf: "center",
    flexDirection: "row",
    gap: Spacing[3],
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 6,
    borderRadius: Radius.full,
    zIndex: 10,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  zoomBtnActive: {
    backgroundColor: "#208AEF",
  },
  zoomText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  zoomTextActive: {
    color: "#FFF",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "#000",
    paddingHorizontal: Spacing[8],
    justifyContent: "center",
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFF",
  },
  galleryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtnInner: {
    alignItems: "center",
    justifyContent: "center",
  },
});
