import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Dimensions } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Avatar, Badge, ActionModal, Input, Button } from "@/design-system/components";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import type { LumenIconName } from "@/design-system";
import { useAuthStore } from "@/store/AuthStore";
import { AuthService } from "@/services/auth.service";
import { useQuery } from "@tanstack/react-query";
import { CitizenService } from "@/services/citizen.service";

const { width: W } = Dimensions.get("window");

interface MenuItem {
  icon: LumenIconName;
  label: string;
  value?: string;
  route?: string;
  danger?: boolean;
  onAction?: () => void;
}

export default function ProfileScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, userAvatars, setAvatarUri } = useAuthStore();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const userId = user?.id || "mock-user-id";
  const avatarUri = userAvatars[userId] || null;
  const userEmail = user?.email || "citizen@lumen.app";
  const userFullName = (user as any)?.fullName || "Samuel Krishnamurthy";

  const { data: profile } = useQuery({
    queryKey: ["citizen_profile"],
    queryFn: CitizenService.getProfile,
  });

  const civicScore = profile?.civicScore || 0;

  const handleThemeToggle = () => {
    if (mode === "system") setMode("light");
    else if (mode === "light") setMode("dark");
    else setMode("system");
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(userId, result.assets[0].uri);
    }
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Account",
      items: [
        {
          icon: "profile",
          label: "Personal Information",
          value: userFullName.split(" ")[0] || "Samuel K.",
          route: "/(citizen)/Settings",
        },
        {
          icon: "email",
          label: "Email Address",
          value: userEmail,
          onAction: () => setActiveModal("email"),
        },
        {
          icon: "phone",
          label: "Phone Number",
          value: "+91 98765 43210",
          onAction: () => setActiveModal("phone"),
        },
        {
          icon: "shield",
          label: "Verification",
          value: "Verified",
          onAction: () => setActiveModal("verification"),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "notifications",
          label: "Notification Settings",
          route: "/(citizen)/Notifications",
        },
        {
          icon: "globe",
          label: "Language",
          value: "English",
          onAction: () => setActiveModal("language"),
        },
        {
          icon: "sun",
          label: "Theme",
          value: mode.charAt(0).toUpperCase() + mode.slice(1),
          onAction: handleThemeToggle,
        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help", label: "Help & FAQ", route: "/(citizen)/Help" },
        { icon: "comment", label: "Send Feedback", onAction: () => setActiveModal("feedback") },
        { icon: "external", label: "Rate the App", onAction: () => setActiveModal("rate") },
      ],
    },
    {
      title: "",
      items: [
        { icon: "logout", label: "Sign Out", danger: true, onAction: () => AuthService.logout() },
      ],
    },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Background Ambient Glow */}
      <View style={s.bgGlowWrap}>
        <LinearGradient
          colors={[colors.brand + (isDark ? "30" : "20"), "transparent"]}
          style={s.glowOrb}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              s.iconBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <LumenIcon name="back" size="md" color={colors.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Profile</Text>
          <Pressable
            style={({ pressed }) => [
              s.iconBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <LumenIcon name="settings" size="md" color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* ── Hero Profile ── */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(20)} style={s.hero}>
          <View style={s.avatarContainer}>
            <Pressable
              onPress={pickAvatar}
              style={({ pressed }) => [
                s.avatarRing,
                { borderColor: colors.brand + "40", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Avatar name={userFullName} size="xl" role="citizen" uri={avatarUri} />
            </Pressable>
            <Pressable
              onPress={pickAvatar}
              style={({ pressed }) => [
                s.editAvatarBtn,
                { backgroundColor: colors.brand, transform: [{ scale: pressed ? 0.9 : 1 }] },
              ]}
            >
              <LumenIcon name="camera" size="xs" color="#FFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          <Text style={[TextStyles.heading2, { color: colors.textPrimary, marginTop: Spacing[4] }]}>
            {userFullName}
          </Text>
          <Text style={[TextStyles.bodyMedium, { color: colors.textSecondary }]}>{userEmail}</Text>

          <View style={s.heroTags}>
            <Badge label="Citizen" variant="brand" dot />
            <Badge label="Zone B" variant="neutral" />
            <Badge label="Verified" variant="success" icon="shield" />
          </View>
        </Animated.View>

        {/* ── Premium Squircle Stats ── */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(20)} style={s.statsRow}>
          <SquircleStat
            label="Reports"
            value="12"
            icon="report"
            color={colors.brand}
            isDark={isDark}
          />
          <SquircleStat label="Resolved" value="9" icon="success" color="#12B76A" isDark={isDark} />
          <SquircleStat
            label="Points"
            value={civicScore.toString()}
            icon="star"
            color="#F79009"
            isDark={isDark}
          />
        </Animated.View>

        {/* ── Menu Sections ── */}
        {menuSections.map((section, si) => (
          <Animated.View
            key={`sec-${si}`}
            entering={FadeInDown.delay(250 + si * 50)
              .springify()
              .damping(20)}
            style={s.section}
          >
            {section.title ? (
              <Text
                style={[
                  TextStyles.label,
                  {
                    color: colors.textTertiary,
                    marginBottom: Spacing[3],
                    paddingHorizontal: Spacing[5],
                  },
                ]}
              >
                {section.title}
              </Text>
            ) : null}

            <View
              style={[
                s.menuCard,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
                  borderColor: colors.borderDefault,
                },
              ]}
            >
              {section.items.map((item, ii) => (
                <MenuRow
                  key={`item-${ii}`}
                  item={item}
                  isLast={ii === section.items.length - 1}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* ── Modals ── */}
      <ActionModal
        visible={activeModal === "email"}
        onClose={() => setActiveModal(null)}
        title="Email Address"
        icon="email"
      >
        <Text style={[TextStyles.body, { color: colors.textSecondary, marginBottom: Spacing[4] }]}>
          Update your primary email address for notifications and account recovery.
        </Text>
        <Input
          label="New Email Address"
          placeholder={userEmail}
          style={{ marginBottom: Spacing[4] }}
        />
        <Button label="Save Changes" onPress={() => setActiveModal(null)} />
      </ActionModal>

      <ActionModal
        visible={activeModal === "phone"}
        onClose={() => setActiveModal(null)}
        title="Phone Number"
        icon="phone"
      >
        <Text style={[TextStyles.body, { color: colors.textSecondary, marginBottom: Spacing[4] }]}>
          Update your contact number. We will send a verification code to confirm.
        </Text>
        <Input
          label="Mobile Number"
          placeholder="+91 98765 43210"
          style={{ marginBottom: Spacing[4] }}
        />
        <Button label="Update Number" onPress={() => setActiveModal(null)} />
      </ActionModal>

      <ActionModal
        visible={activeModal === "verification"}
        onClose={() => setActiveModal(null)}
        title="Verification Status"
        icon="shield"
      >
        <View style={{ alignItems: "center", marginBottom: Spacing[6], marginTop: Spacing[2] }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#ECFDF3",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing[4],
            }}
          >
            <LumenIcon name="success" size="lg" color="#12B76A" />
          </View>
          <Text style={[TextStyles.heading2, { color: colors.textPrimary, marginBottom: 8 }]}>
            Fully Verified
          </Text>
          <Text style={[TextStyles.body, { color: colors.textSecondary, textAlign: "center" }]}>
            Your identity has been verified via the national citizen database. You have full access
            to all civic services.
          </Text>
        </View>
        <Button label="Done" variant="secondary" onPress={() => setActiveModal(null)} />
      </ActionModal>

      <ActionModal
        visible={activeModal === "language"}
        onClose={() => setActiveModal(null)}
        title="App Language"
        icon="globe"
      >
        <Text style={[TextStyles.body, { color: colors.textSecondary, marginBottom: Spacing[4] }]}>
          Select your preferred language for the application interface.
        </Text>
        {["English", "Hindi", "Marathi", "Gujarati"].map((lang, i) => (
          <Pressable
            key={lang}
            onPress={() => setActiveModal(null)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: Spacing[4],
              borderBottomWidth: i < 3 ? 1 : 0,
              borderBottomColor: colors.borderDefault,
            }}
          >
            <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary }]}>{lang}</Text>
            {lang === "English" && <LumenIcon name="success" size="sm" color={colors.brand} />}
          </Pressable>
        ))}
      </ActionModal>

      <ActionModal
        visible={activeModal === "feedback"}
        onClose={() => setActiveModal(null)}
        title="Send Feedback"
        icon="comment"
      >
        <Text style={[TextStyles.body, { color: colors.textSecondary, marginBottom: Spacing[4] }]}>
          We'd love to hear your thoughts or suggestions on how we can improve the Lumen app.
        </Text>
        <Input
          label="Your Feedback"
          placeholder="Type your message here..."
          style={{ marginBottom: Spacing[4] }}
        />
        <Button label="Submit Feedback" onPress={() => setActiveModal(null)} />
      </ActionModal>

      <ActionModal
        visible={activeModal === "rate"}
        onClose={() => setActiveModal(null)}
        title="Rate the App"
        icon="star"
      >
        <View style={{ alignItems: "center", marginBottom: Spacing[6], marginTop: Spacing[2] }}>
          <View style={{ flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[4] }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <LumenIcon key={star} name="star" size="xl" color="#F79009" />
            ))}
          </View>
          <Text style={[TextStyles.heading2, { color: colors.textPrimary, marginBottom: 8 }]}>
            Enjoying Lumen?
          </Text>
          <Text style={[TextStyles.body, { color: colors.textSecondary, textAlign: "center" }]}>
            Tap a star to rate it on the App Store.
          </Text>
        </View>
        <Button label="Submit Rating" onPress={() => setActiveModal(null)} />
      </ActionModal>
    </View>
  );
}

// ── Squircle Stat Card Component ─────────────────────────────────────
function SquircleStat({
  label,
  value,
  icon,
  color,
  isDark,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const STAT_SIZE = (W - Spacing[5] * 2 - Spacing[3] * 2) / 3;

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.95, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
    >
      <Animated.View style={[style, { width: STAT_SIZE }]}>
        <BlurView
          intensity={isDark ? 20 : 40}
          tint={isDark ? "dark" : "light"}
          style={[
            s.squircle,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.8)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <View style={[s.squircleIcon, { backgroundColor: color + "15" }]}>
            <LumenIcon name={icon} size="sm" color={color} />
          </View>
          <Text
            style={[TextStyles.heading2, { color: isDark ? "#FFF" : "#111", marginVertical: 4 }]}
          >
            {value}
          </Text>
          <Text
            style={[
              TextStyles.caption,
              { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontWeight: "600" },
            ]}
          >
            {label}
          </Text>
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}

// ── Menu Row Component ─────────────────────────────────────
function MenuRow({
  item,
  isLast,
  colors,
  isDark,
}: {
  item: MenuItem;
  isLast: boolean;
  colors: any;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (item.onAction) {
      item.onAction();
      return;
    }
    if (item.danger) {
      router.replace("/Login" as any);
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.98, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          s.menuRow,
          style,
          { borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.borderDefault },
        ]}
      >
        <View
          style={[
            s.menuIcon,
            {
              backgroundColor: item.danger
                ? "#FEE4E2"
                : isDark
                  ? "rgba(255,255,255,0.08)"
                  : colors.bgSubtle,
            },
          ]}
        >
          <LumenIcon
            name={item.icon}
            size="sm"
            color={item.danger ? "#D92D20" : colors.textSecondary}
            strokeWidth={2}
          />
        </View>
        <Text
          style={[
            TextStyles.bodyMedium,
            {
              color: item.danger ? "#D92D20" : colors.textPrimary,
              flex: 1,
              fontWeight: "500",
              marginRight: 8,
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.value && (
          <Text
            style={[
              TextStyles.bodySmall,
              { color: colors.textTertiary, marginRight: 8, flexShrink: 1, textAlign: "right" },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.value}
          </Text>
        )}
        {!item.danger && (
          <LumenIcon name="chevronRight" size="sm" color={colors.textTertiary} strokeWidth={2} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bgGlowWrap: { ...(StyleSheet.absoluteFill as any), overflow: "hidden", pointerEvents: "none" },
  glowOrb: { width: W, height: W, position: "absolute", top: -W / 3, opacity: 0.6 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingTop: 60,
    paddingBottom: Spacing[2],
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingBottom: 120 },
  hero: {
    alignItems: "center",
    paddingVertical: Spacing[6],
    zIndex: 10,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: 100,
    padding: 4,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  heroTags: { flexDirection: "row", gap: Spacing[2], marginTop: Spacing[4] },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[8],
    zIndex: 10,
  },
  squircle: {
    borderRadius: 24,
    padding: Spacing[4],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  squircleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  section: { marginBottom: Spacing[6], zIndex: 10 },
  menuCard: {
    marginHorizontal: Spacing[5],
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[4],
  },
});
