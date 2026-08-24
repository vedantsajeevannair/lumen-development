// ============================================================
// LUMEN — Premium QR/Bar-Code Scanner Screen
// Phase 5: Production Ready (Shared Tag Scanner)
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

const { width: W } = Dimensions.get("window");

export default function QrScannerScreen() {
  const { colors, shadows } = useTheme();
  const [torch, setTorch] = useState(false);

  // Neon scanning laser animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSimulateScan = () => {
    // Navigate back with scanned tag data after delay
    setTimeout(() => {
      router.back();
    }, 600);
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 216], // moves from top to bottom of scanner target frame
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera Viewfinder simulator */}
      <View style={s.viewfinder}>
        <Text style={[TextStyles.mono, { color: "rgba(255,255,255,0.4)" }]}>
          [ Scanner Active ]
        </Text>
        <Text style={[TextStyles.caption, { color: "rgba(255,255,255,0.3)", marginTop: 6 }]}>
          Align barcode or QR label on assets
        </Text>
      </View>

      {/* Scanner target layout mask */}
      <View style={s.maskOverlay} pointerEvents="box-none">
        <View style={s.targetBox}>
          {/* Neon Corner Brackets */}
          <View style={[s.corner, s.topLeft, { borderColor: colors.brand }]} />
          <View style={[s.corner, s.topRight, { borderColor: colors.brand }]} />
          <View style={[s.corner, s.bottomLeft, { borderColor: colors.brand }]} />
          <View style={[s.corner, s.bottomRight, { borderColor: colors.brand }]} />

          {/* Animated Neon Laser */}
          <Animated.View
            style={[
              s.laser,
              {
                backgroundColor: colors.brand,
                transform: [{ translateY: laserTranslateY }],
              },
            ]}
          />
        </View>
      </View>

      {/* Top Controls */}
      <View style={[s.hudTop, { paddingTop: Platform.OS === "ios" ? 56 : 24 }]}>
        <Pressable style={s.hudBtn} onPress={() => router.back()} hitSlop={12}>
          <LumenIcon name="back" size="md" color="#FFF" strokeWidth={2.5} />
        </Pressable>

        <Text style={[TextStyles.subtitle, { color: "#FFF", fontWeight: "700" }]}>Scan Tag</Text>

        <Pressable
          style={[s.hudBtn, torch && { backgroundColor: colors.brandSoft }]}
          onPress={() => setTorch((t) => !t)}
          hitSlop={12}
        >
          <LumenIcon name="sun" size="md" color={torch ? colors.brand : "#FFF"} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Bottom Panel */}
      <View style={s.bottomPanel}>
        <Text
          style={[TextStyles.bodyMedium, { color: "#FFF", textAlign: "center", fontWeight: "600" }]}
        >
          Scan Asset QR Tag
        </Text>
        <Text
          style={[
            TextStyles.caption,
            { color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 6 },
          ]}
        >
          Position the QR code inside the brackets to retrieve infrastructure data automatically.
        </Text>

        <Pressable
          onPress={handleSimulateScan}
          style={({ pressed }) => [
            s.simulateBtn,
            {
              backgroundColor: colors.brandSoft + "20",
              borderColor: colors.brandBorder,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <LumenIcon name="spark" size="sm" color={colors.brand} strokeWidth={2} />
          <Text style={[TextStyles.label, { color: colors.brand }]}>Simulate Successful Scan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewfinder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0C101A",
    alignItems: "center",
    justifyContent: "center",
  },
  maskOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  targetBox: {
    width: 220,
    height: 220,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: Radius.sm,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: Radius.sm,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: Radius.sm,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: Radius.sm,
  },
  laser: {
    height: 3,
    width: "100%",
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
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
  hudBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[8],
    paddingBottom: Platform.OS === "ios" ? 56 : 36,
    paddingTop: Spacing[6],
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderTopLeftRadius: Radius["3xl"],
    borderTopRightRadius: Radius["3xl"],
    zIndex: 10,
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    marginTop: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
